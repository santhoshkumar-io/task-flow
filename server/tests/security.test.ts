import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { UserModel } from "../src/models/user.model.js";

// The guards, and the exact attack each one stops.
//
// These live in their own file rather than beside a module, because they are
// about the app as a whole — the body parser, the limiters, the error handler.
//
// FOUR MORE ALREADY EXIST and are deliberately not repeated here:
//   ?status[$ne]=done      -> 400   tests/tasks.test.ts
//   ?assigneeId[$ne]=null  -> 400   tests/tasks.test.ts
//   ?limit=500             -> 400   tests/tasks.test.ts
//   a tampered token       -> 401   tests/auth.test.ts
// and deleting somebody else's task answering 404 is covered in tasks.test.ts.

const app = createApp();

const person = {
  name: "Dana Fisk",
  email: "dana@taskflow.test",
  password: "a-perfectly-fine-password",
};

beforeEach(async () => {
  await UserModel.deleteMany({});
  await request(app).post("/api/auth/register").send(person);
});

describe("passing an object where a string was expected", () => {
  // The classic login bypass. Sent to a server that hands the body straight to
  // Mongo, { $ne: null } matches the FIRST USER IN THE COLLECTION and logs the
  // attacker in as them without a password.
  //
  // Zod closes it before the service is reached: z.string() refuses an object,
  // and the schema builds a new object containing only keys it was told about.
  // These tests exist so that nobody later "helpfully" loosens the schema.

  it("refuses an object as the email on login", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: { $ne: null }, password: "x" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    // The important half: no cookie came back. A 400 that still logged you in
    // would be a passing test and an open door.
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("refuses an object as the password on login", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: person.email, password: { $ne: null } });

    expect(response.status).toBe(400);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("refuses an object as the email on register", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "X", email: { $ne: null }, password: "another-password" });

    expect(response.status).toBe(400);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("still lets the real password through", async () => {
    // Otherwise every test above would pass on a server that refuses all logins.
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: person.email, password: person.password });

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toBeDefined();
  });
});

describe("refusing giant bodies", () => {
  // Express buffers the whole body in memory before parsing it, so without a
  // cap a few large requests can take the process's memory.

  it("refuses a 200kb body with 413", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: person.email, password: "x".repeat(200 * 1024) }));

    expect(response.status).toBe(413);
  });

  it("does not refuse a body just under the limit", async () => {
    // This is what makes the test above mean something. Without it, a server
    // that rejected EVERY body would pass — proving a limit, not a wall.
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: person.email, password: "x".repeat(90 * 1024) }));

    // 401, because a 90kb password is wrong rather than too big. The point is
    // only that it was parsed and reached the route.
    expect(response.status).not.toBe(413);
    expect(response.status).toBe(401);
  });
});

describe("rate limiting", () => {
  // Built with a limit of 2 rather than the real 5, so the test is three
  // requests instead of six. The limiter is off by default under NODE_ENV=test
  // — every supertest request comes from the same address, so a shared bucket
  // would fail the whole suite on its sixth login rather than testing anything.

  it("answers 429 once the login limit is passed", async () => {
    const limited = createApp({
      rateLimit: { disabled: false, authMax: 2, apiMax: 1000, windowMinutes: 15 },
    });

    const attempt = () =>
      request(limited)
        .post("/api/auth/login")
        .send({ email: person.email, password: "wrong-password" });

    const first = await attempt();
    const second = await attempt();
    const third = await attempt();

    // The first two are ordinary wrong passwords.
    expect(first.status).toBe(401);
    expect(second.status).toBe(401);

    // The third is refused before the password is even looked at.
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("TOO_MANY_REQUESTS");

    // Shaped like every other error in this API. A 429 with a different shape
    // is one the frontend's ErrorState cannot read the request id out of.
    expect(third.body.error.requestId).toBeTruthy();
  });

  it("counts a successful login too", async () => {
    // Rate limiting that only counted failures would let an attacker reset
    // their allowance with one correct login.
    const limited = createApp({
      rateLimit: { disabled: false, authMax: 2, apiMax: 1000, windowMinutes: 15 },
    });

    await request(limited).post("/api/auth/login").send({ email: person.email, password: person.password });
    await request(limited).post("/api/auth/login").send({ email: person.email, password: person.password });

    const third = await request(limited)
      .post("/api/auth/login")
      .send({ email: person.email, password: person.password });

    expect(third.status).toBe(429);
  });

  it("does not apply the strict limit to ordinary routes", async () => {
    // The strict limit is on login and register only. If it were on the whole
    // auth router, the app's own startup check against /me would throttle
    // itself after a few page loads.
    const limited = createApp({
      rateLimit: { disabled: false, authMax: 2, apiMax: 1000, windowMinutes: 15 },
    });

    const login = await request(limited)
      .post("/api/auth/login")
      .send({ email: person.email, password: person.password });

    const cookie = login.headers["set-cookie"];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(limited).get("/api/auth/me").set("Cookie", cookie);
      expect(response.status).toBe(200);
    }
  });

  it("sends the RateLimit headers so a client can see where it stands", async () => {
    const limited = createApp({
      rateLimit: { disabled: false, authMax: 2, apiMax: 1000, windowMinutes: 15 },
    });

    const response = await request(limited)
      .post("/api/auth/login")
      .send({ email: person.email, password: "wrong-password" });

    // Discovering a limit by hitting it is worse than being told about it.
    expect(response.headers["ratelimit"] ?? response.headers["ratelimit-limit"]).toBeDefined();
  });
});

describe("helmet", () => {
  it("sets the headers worth naming", async () => {
    const response = await request(app).get("/api/health");

    // Stops the browser guessing a response's type and running it as script.
    expect(response.headers["x-content-type-options"]).toBe("nosniff");

    // Stops this app being loaded invisibly inside somebody else's page.
    expect(response.headers["x-frame-options"]).toBeDefined();

    // Says which Express version is running, which is free information for an
    // attacker. Helmet removes it.
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("errors that say too little", () => {
  // The rule: in production the body carries a code and a safe message, and
  // nothing else. The real detail goes to the server log.
  //
  // Checked on the RESPONSE BODY, not the log — the plan is explicit about
  // that, and the body is the only half an attacker can see.
  //
  // `isProduction` is worked out ONCE, when config/env.js is first imported, so
  // setting process.env.NODE_ENV here would change nothing — the const is
  // already baked. The module is replaced and errorHandler re-imported instead.
  //
  // That does mean this test proves the BRANCH rather than the wiring from
  // NODE_ENV to isProduction. The wiring is proved for real in docs/notes/v10.md
  // by running the actual server with NODE_ENV=production and pasting the reply.

  // Shaped like a real database failure, because that is the leak that matters:
  // a Mongo error carries collection and index names.
  const DB_ERROR =
    "E11000 duplicate key error collection: taskflow.users index: email_1";

  function appThatThrows(handler: typeof errorHandler) {
    const thrower = express();

    thrower.get("/boom", () => {
      throw new Error(DB_ERROR);
    });

    thrower.use(handler);
    return thrower;
  }

  it("hides the stack and the database text in production", async () => {
    vi.resetModules();
    vi.doMock("../src/config/env.js", () => ({
      isProduction: true,
      env: { NODE_ENV: "production" },
    }));

    try {
      const { errorHandler: productionHandler } = await import(
        "../src/middleware/errorHandler.js"
      );

      const response = await request(appThatThrows(productionHandler)).get("/boom");
      const raw = JSON.stringify(response.body);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe("INTERNAL_ERROR");
      expect(response.body.error.message).toBe("Something went wrong on our side.");

      // No stack.
      expect(response.body.error.stack).toBeUndefined();

      // And no database text, collection name or file path anywhere in the
      // whole body — not only in the fields this test thought to name.
      expect(raw).not.toContain("E11000");
      expect(raw).not.toContain("taskflow.users");
      expect(raw).not.toContain("email_1");
      expect(raw).not.toContain(".ts");
      expect(raw).not.toContain("node_modules");
    } finally {
      vi.doUnmock("../src/config/env.js");
      vi.resetModules();
    }
  });

  it("still gives a developer the stack outside production", async () => {
    // The other half of the branch. A test that only checked production would
    // pass on a handler that sends a stack to nobody, which would make every
    // local bug harder to find.
    const response = await request(appThatThrows(errorHandler)).get("/boom");

    expect(response.status).toBe(500);
    expect(Array.isArray(response.body.error.stack)).toBe(true);

    // And the developer's copy really does carry the detail, so the test above
    // is proving removal rather than describing something never present.
    expect(JSON.stringify(response.body)).toContain("E11000");
  });
});
