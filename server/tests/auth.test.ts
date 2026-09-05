import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/lib/cookie.js";
import { UserModel } from "../src/models/user.model.js";

const app = createApp();

const alice = {
  name: "Alice Chen",
  email: "alice@taskflow.test",
  password: "correct-horse-battery",
};

// Each test starts from an empty users collection, so one test cannot make
// another pass or fail by leaving a user behind.
beforeEach(async () => {
  await UserModel.deleteMany({});
});

function cookieFor(response: request.Response): string {
  const raw = response.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookie) throw new Error("no auth cookie on the response");
  return cookie;
}

describe("POST /api/auth/register", () => {
  it("creates the account and returns the user without the password", async () => {
    const response = await request(app).post("/api/auth/register").send(alice);

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(alice.email);
    expect(response.body.user.name).toBe(alice.name);

    // The whole reply, not just the fields we thought to check.
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain(alice.password);
  });

  it("stores a scrambled password, never the password itself", async () => {
    await request(app).post("/api/auth/register").send(alice);

    const stored = await UserModel.findOne({ email: alice.email }).select(
      "+passwordHash",
    );

    expect(stored).not.toBeNull();
    expect(stored!.passwordHash).not.toBe(alice.password);
    expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored!.passwordHash).toHaveLength(60);
  });

  it("sends the pass in a cookie the page cannot read", async () => {
    const response = await request(app).post("/api/auth/register").send(alice);
    const cookie = cookieFor(response);

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    // The pass must not also be in the body, or the cookie was pointless.
    expect(response.body.token).toBeUndefined();
  });

  it("refuses a second account on the same email, and creates only one", async () => {
    await request(app).post("/api/auth/register").send(alice);
    const second = await request(app).post("/api/auth/register").send(alice);

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("EMAIL_TAKEN");
    expect(await UserModel.countDocuments({ email: alice.email })).toBe(1);
  });

  it("treats a differently capitalised email as the same account", async () => {
    await request(app).post("/api/auth/register").send(alice);
    const second = await request(app)
      .post("/api/auth/register")
      .send({ ...alice, email: "ALICE@TaskFlow.test" });

    expect(second.status).toBe(409);
    expect(await UserModel.countDocuments({})).toBe(1);
  });

  it("rejects a short password with 400, not 500", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...alice, password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await UserModel.countDocuments({})).toBe(0);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(alice);
  });

  it("accepts the right password and sets the cookie", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: alice.email, password: alice.password });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(alice.email);
    expect(cookieFor(response)).toContain("HttpOnly");
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: alice.email, password: "not-the-password" });

    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@taskflow.test", password: alice.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);

    // Identical code and wording, so the reply cannot be used to find out
    // which email addresses are registered.
    expect(wrongPassword.body.error.code).toBe(unknownEmail.body.error.code);
    expect(wrongPassword.body.error.message).toBe(
      unknownEmail.body.error.message,
    );
    expect(wrongPassword.body.error.message).toBe("Invalid email or password");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the logged-in person", async () => {
    const registered = await request(app)
      .post("/api/auth/register")
      .send(alice);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookieFor(registered));

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(alice.email);
  });

  it("is 401 with no cookie", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the cookie so the browser stops sending it", async () => {
    const registered = await request(app)
      .post("/api/auth/register")
      .send(alice);

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieFor(registered));

    expect(response.status).toBe(204);

    // An empty value with an expiry in the past is how a cookie is removed.
    const cleared = cookieFor(response);
    expect(cleared).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=;`));
  });
});

describe("GET /api/users", () => {
  it("is 401 with no cookie, in the standard error shape", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(401);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns id, name and email only when logged in", async () => {
    const registered = await request(app)
      .post("/api/auth/register")
      .send(alice);

    const response = await request(app)
      .get("/api/users")
      .set("Cookie", cookieFor(registered));

    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(1);
    expect(Object.keys(response.body.users[0]).sort()).toEqual([
      "_id",
      "email",
      "name",
    ]);
  });

  it("is 401 when one character of a real pass is changed, not 500", async () => {
    const registered = await request(app)
      .post("/api/auth/register")
      .send(alice);

    const real = cookieFor(registered);
    const value = real.split(";")[0]!.split("=")[1]!;

    // Change the last character of the signature to something else.
    const last = value.at(-1);
    const tampered = value.slice(0, -1) + (last === "A" ? "B" : "A");

    const response = await request(app)
      .get("/api/users")
      .set("Cookie", `${AUTH_COOKIE_NAME}=${tampered}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("is 401 for a pass signed with a different secret", async () => {
    // A pass that is perfectly well formed, just not signed by us.
    const forged =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
      ".eyJzdWIiOiI2NWQwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJpYXQiOjE3MDAwMDAwMDB9" +
      ".this-signature-was-not-made-with-our-secret";

    const response = await request(app)
      .get("/api/users")
      .set("Cookie", `${AUTH_COOKIE_NAME}=${forged}`);

    expect(response.status).toBe(401);
  });
});
