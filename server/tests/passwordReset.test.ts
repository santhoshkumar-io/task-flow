import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/lib/cookie.js";
import { hashResetToken } from "../src/lib/resetToken.js";
import { UserModel } from "../src/models/user.model.js";

// Forgetting a password, end to end.
//
// The mailer is replaced so nothing is really sent, and so the RAW token can be
// read out of the message — which is the only place it ever exists. That is the
// design being tested as much as a convenience: if this test could read the
// token out of the database, so could anybody holding a copy of the database.

const sendMail = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/mailer.js", () => ({
  sendMail,
  isMailConfigured: () => true,
  verifyMailer: async () => {},
}));

const app = createApp();

const person = {
  name: "Ada Iyer",
  email: "ada@taskflow.test",
  password: "the-original-password",
};

beforeEach(async () => {
  await UserModel.deleteMany({});
  await request(app).post("/api/auth/register").send(person);
  sendMail.mockClear();
});

/** Pulls the raw token out of the email that was "sent". */
function tokenFromEmail(): string {
  expect(sendMail).toHaveBeenCalledTimes(1);

  const mail = sendMail.mock.calls[0]![0] as { text: string };
  const match = /reset-password\?token=([a-f0-9]{64})/.exec(mail.text);

  if (!match) throw new Error("no reset link in the email");
  return match[1]!;
}

async function requestReset(email = person.email) {
  return request(app).post("/api/auth/forgot-password").send({ email });
}

async function login(password: string) {
  return request(app)
    .post("/api/auth/login")
    .send({ email: person.email, password });
}

describe("POST /api/auth/forgot-password", () => {
  it("emails a link to somebody who exists", async () => {
    const response = await requestReset();

    expect(response.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const mail = sendMail.mock.calls[0]![0] as { to: string; text: string };
    expect(mail.to).toBe(person.email);
    expect(mail.text).toContain("/reset-password?token=");
  });

  it("answers exactly the same for an address that does not exist", async () => {
    const real = await requestReset();
    const fake = await requestReset("nobody@taskflow.test");

    // Identical status AND identical body. A different message — even a
    // politer one — turns this route into a way to discover who has an account.
    expect(fake.status).toBe(real.status);
    expect(fake.body).toEqual(real.body);

    // And nothing was sent, so no mail reaches a stranger either.
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("never puts the raw token in the response", async () => {
    const response = await requestReset();
    const token = tokenFromEmail();

    // The whole scheme rests on the raw token existing only in the email.
    expect(JSON.stringify(response.body)).not.toContain(token);
  });

  it("stores only the hash of the token, never the token", async () => {
    await requestReset();
    const token = tokenFromEmail();

    const stored = await UserModel.findOne({ email: person.email }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt",
    );

    // Same reasoning as passwordHash: a stolen copy of this collection must
    // contain no usable reset links.
    expect(stored!.passwordResetTokenHash).not.toBe(token);
    expect(stored!.passwordResetTokenHash).toBe(hashResetToken(token));
    expect(stored!.passwordResetExpiresAt!.getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it("refuses an object where the email should be, without sending anything", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: { $ne: null } });

    expect(response.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/reset-password", () => {
  const NEW_PASSWORD = "a-brand-new-password";

  async function resetWith(token: string, password = NEW_PASSWORD) {
    return request(app)
      .post("/api/auth/reset-password")
      .send({ token, password });
  }

  it("changes the password so the new one works and the old one does not", async () => {
    await requestReset();
    const response = await resetWith(tokenFromEmail());

    expect(response.status).toBe(200);
    expect(await login(NEW_PASSWORD).then((r) => r.status)).toBe(200);
    expect(await login(person.password).then((r) => r.status)).toBe(401);
  });

  it("does not sign you in", async () => {
    await requestReset();
    const response = await resetWith(tokenFromEmail());

    // Whoever holds the link may not be the account's owner — that is the
    // situation a reset exists for. Typing the new password once proves it.
    const cookies = response.headers["set-cookie"];
    const list = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    const auth = list.find((c) => c.startsWith(AUTH_COOKIE_NAME + "="));

    // Either no cookie at all, or one that clears rather than grants.
    expect(auth === undefined || /=;/.test(auth)).toBe(true);
  });

  it("refuses the same token a second time", async () => {
    await requestReset();
    const token = tokenFromEmail();

    expect(await resetWith(token).then((r) => r.status)).toBe(200);

    // Single use. A link sitting in an inbox must not stay a spare key.
    const second = await resetWith(token, "yet-another-password");
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("refuses an expired token", async () => {
    await requestReset();
    const token = tokenFromEmail();

    // Moved into the past rather than waiting an hour.
    await UserModel.updateOne(
      { email: person.email },
      { $set: { passwordResetExpiresAt: new Date(Date.now() - 1000) } },
    );

    const response = await resetWith(token);
    expect(response.status).toBe(400);

    // And the old password still works, so nothing was half-changed.
    expect(await login(person.password).then((r) => r.status)).toBe(200);
  });

  it("refuses a token that was never issued", async () => {
    const response = await resetWith("f".repeat(64));
    expect(response.status).toBe(400);
  });

  it("refuses a token of the wrong shape before touching the database", async () => {
    const response = await resetWith("not-a-token");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("applies the same password rules as registering", async () => {
    await requestReset();
    const response = await resetWith(tokenFromEmail(), "short");

    // A reset must not be a way around the length rule.
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("one person's token cannot reset another person's password", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Bo Tran",
      email: "bo@taskflow.test",
      password: "bos-own-password",
    });

    await requestReset("bo@taskflow.test");
    const bosToken = tokenFromEmail();

    await resetWith(bosToken);

    // Ada is untouched. The token is looked up by its own hash, so it can only
    // ever find the account it was made for.
    expect(await login(person.password).then((r) => r.status)).toBe(200);
  });
});

describe("resetting a password signs out sessions handed out earlier", () => {
  it("stops honouring a pass issued before the reset", async () => {
    // Somebody is signed in — on a stolen laptop, say. This is the session the
    // reset is supposed to be getting rid of.
    const signedIn = await login(person.password);
    const oldCookie = signedIn.headers["set-cookie"];

    const before = await request(app)
      .get("/api/auth/me")
      .set("Cookie", oldCookie);
    expect(before.status).toBe(200);

    await requestReset();

    // A pass records its issue time in whole seconds, so a reset in the same
    // second is not "after" it. Waiting makes the comparison real rather than
    // a coin flip.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: tokenFromEmail(), password: "password-after-the-theft" });

    // A signed pass cannot be recalled, so the only defence is to stop
    // honouring it. Without passwordChangedAt this is still 200, and the reset
    // achieved nothing for the person it was meant to protect.
    const after = await request(app)
      .get("/api/auth/me")
      .set("Cookie", oldCookie);

    expect(after.status).toBe(401);
  });

  it("lets the new password sign in and stay signed in", async () => {
    // The other half: the check has to reject OLD passes, not every pass.
    await requestReset();
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: tokenFromEmail(), password: "the-newest-password" });

    const fresh = await login("the-newest-password");
    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", fresh.headers["set-cookie"]);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(person.email);
  });
});
