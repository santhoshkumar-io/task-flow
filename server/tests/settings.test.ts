import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/lib/cookie.js";
import { UserModel } from "../src/models/user.model.js";
import { WorkspaceModel } from "../src/models/workspace.model.js";

// The Settings screen's server side: changing your own password, ending every
// other session, and the workspace record.

const app = createApp();

const person = {
  name: "Rae Ortega",
  email: "rae@taskflow.test",
  password: "the-first-password",
};

const other = {
  name: "Sam Blake",
  email: "sam@taskflow.test",
  password: "sams-password",
};

let cookie = "";
let otherCookie = "";

function cookieFor(response: request.Response): string {
  const raw = response.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const found = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!found) throw new Error("no auth cookie on the response");
  return found;
}

/** Whether a response handed back a NEW, usable pass rather than clearing one. */
function issuedAFreshPass(response: request.Response): boolean {
  const raw = response.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const found = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

  // A clearing cookie has an empty value and an expiry in 1970.
  return Boolean(found) && !/taskflow_token=;/.test(found!);
}

beforeEach(async () => {
  await Promise.all([UserModel.deleteMany({}), WorkspaceModel.deleteMany({})]);

  const a = await request(app).post("/api/auth/register").send(person);
  const b = await request(app).post("/api/auth/register").send(other);

  cookie = cookieFor(a);
  otherCookie = cookieFor(b);

  await UserModel.updateOne({ email: person.email }, { $set: { role: "admin" } });

  // A pass records its issue time in whole seconds, so anything that bumps
  // passwordChangedAt in the same second is not "after" it. Waiting is what
  // makes these comparisons real rather than a coin flip.
  await new Promise((resolve) => setTimeout(resolve, 1100));
});

describe("PATCH /api/auth/password", () => {
  const NEW_PASSWORD = "the-second-password";

  it("changes the password when the current one is right", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", cookie)
      .send({ currentPassword: person.password, newPassword: NEW_PASSWORD });

    expect(response.status).toBe(200);

    const withNew = await request(app)
      .post("/api/auth/login")
      .send({ email: person.email, password: NEW_PASSWORD });
    expect(withNew.status).toBe(200);

    const withOld = await request(app)
      .post("/api/auth/login")
      .send({ email: person.email, password: person.password });
    expect(withOld.status).toBe(401);
  });

  it("KEEPS YOU SIGNED IN on the device you did it from", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", cookie)
      .send({ currentPassword: person.password, newPassword: NEW_PASSWORD });

    // The detail that is easy to miss. Changing the password moves
    // passwordChangedAt forward, and requireAuth refuses every pass issued
    // before it — including the one this request arrived with. Without a fresh
    // cookie, changing your password logs you out of the browser you are
    // sitting at, which reads as the app breaking.
    expect(issuedAFreshPass(response)).toBe(true);

    const stillIn = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookieFor(response));

    expect(stillIn.status).toBe(200);
  });

  it("signs out sessions opened before the change", async () => {
    // A second pass for the same person, issued earlier — a stolen laptop.
    const older = cookieFor(
      await request(app)
        .post("/api/auth/login")
        .send({ email: person.email, password: person.password }),
    );

    await new Promise((resolve) => setTimeout(resolve, 1100));

    await request(app)
      .patch("/api/auth/password")
      .set("Cookie", cookie)
      .send({ currentPassword: person.password, newPassword: NEW_PASSWORD });

    const after = await request(app).get("/api/auth/me").set("Cookie", older);
    expect(after.status).toBe(401);
  });

  it("refuses a wrong current password, and changes nothing", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", cookie)
      .send({ currentPassword: "not-my-password", newPassword: NEW_PASSWORD });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("WRONG_PASSWORD");

    // Knowing the old password is what proves it is really them — a session
    // left open on a shared machine must not be enough to take the account.
    const withOld = await request(app)
      .post("/api/auth/login")
      .send({ email: person.email, password: person.password });
    expect(withOld.status).toBe(200);
  });

  it("applies the same length rules as registering", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", cookie)
      .send({ currentPassword: person.password, newPassword: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("is 401 without a login", async () => {
    const response = await request(app)
      .patch("/api/auth/password")
      .send({ currentPassword: person.password, newPassword: NEW_PASSWORD });

    expect(response.status).toBe(401);
  });
});

describe("POST /api/auth/sign-out-others", () => {
  it("ends other sessions and keeps this one", async () => {
    const older = cookieFor(
      await request(app)
        .post("/api/auth/login")
        .send({ email: person.email, password: person.password }),
    );

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const response = await request(app)
      .post("/api/auth/sign-out-others")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);

    // The older pass is refused.
    expect(
      await request(app).get("/api/auth/me").set("Cookie", older).then((r) => r.status),
    ).toBe(401);

    // And the caller's own keeps working — the button says OTHER devices.
    expect(
      await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookieFor(response))
        .then((r) => r.status),
    ).toBe(200);
  });

  it("does not touch anybody else's sessions", async () => {
    await request(app).post("/api/auth/sign-out-others").set("Cookie", cookie);

    // passwordChangedAt is per person, so Sam is unaffected.
    const sam = await request(app).get("/api/auth/me").set("Cookie", otherCookie);
    expect(sam.status).toBe(200);
  });

  it("is 401 without a login", async () => {
    const response = await request(app).post("/api/auth/sign-out-others");
    expect(response.status).toBe(401);
  });
});

describe("the workspace", () => {
  it("reports a name, the member count and the seats left", async () => {
    const response = await request(app)
      .get("/api/users/workspace")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.workspace.name).toBe("TaskFlow");
    expect(response.body.workspace.members).toBe(2);

    // Both halves of "5 members · 2 seats remaining" are real numbers.
    const { members, seatLimit, seatsRemaining } = response.body.workspace;
    expect(seatsRemaining).toBe(seatLimit - members);
  });

  it("creates exactly one document however many times it is read", async () => {
    await Promise.all([
      request(app).get("/api/users/workspace").set("Cookie", cookie),
      request(app).get("/api/users/workspace").set("Cookie", cookie),
      request(app).get("/api/users/workspace").set("Cookie", cookie),
    ]);

    // An upsert rather than check-then-insert. Three simultaneous reads would
    // all find nothing and all insert, and there is no unique index to catch it
    // because there is no field to make unique.
    expect(await WorkspaceModel.countDocuments({})).toBe(1);
  });

  it("lets an admin rename it", async () => {
    const response = await request(app)
      .patch("/api/users/workspace")
      .set("Cookie", cookie)
      .send({ name: "Acme Engineering" });

    expect(response.status).toBe(200);
    expect(response.body.workspace.name).toBe("Acme Engineering");
  });

  it("is 403 for a member", async () => {
    const response = await request(app)
      .patch("/api/users/workspace")
      .set("Cookie", otherCookie)
      .send({ name: "Sam's Workspace" });

    expect(response.status).toBe(403);
  });

  it("refuses an empty name", async () => {
    const response = await request(app)
      .patch("/api/users/workspace")
      .set("Cookie", cookie)
      .send({ name: "   " });

    expect(response.status).toBe(400);
  });
});
