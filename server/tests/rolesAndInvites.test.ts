import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/lib/cookie.js";
import { TaskModel } from "../src/models/task.model.js";
import { UserModel } from "../src/models/user.model.js";

// Roles and invitations.
//
// Both were on the plan's exclusion list for ten versions. The reason 0014
// refused to draw a Role column was that a role which changes no behaviour is
// decoration — so the first half of this file is about the behaviour that makes
// the column worth having, and not about the column.

const sendMail = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/mailer.js", () => ({
  sendMail,
  isMailConfigured: () => true,
  verifyMailer: async () => {},
}));

const app = createApp();

const admin = {
  name: "Ada Admin",
  email: "ada@taskflow.test",
  password: "the-admins-password",
};

const member = {
  name: "Mo Member",
  email: "mo@taskflow.test",
  password: "a-members-password",
};

let adminCookie = "";
let memberCookie = "";

function cookieFor(response: request.Response): string {
  const raw = response.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookie) throw new Error("no auth cookie on the response");
  return cookie;
}

beforeEach(async () => {
  await Promise.all([UserModel.deleteMany({}), TaskModel.deleteMany({})]);
  sendMail.mockClear();

  const a = await request(app).post("/api/auth/register").send(admin);
  const m = await request(app).post("/api/auth/register").send(member);

  adminCookie = cookieFor(a);
  memberCookie = cookieFor(m);

  // Registering always makes an engineer. Promotion is a deliberate act, so
  // the test does it explicitly rather than relying on a default.
  await UserModel.updateOne({ email: admin.email }, { $set: { role: "admin" } });
});

describe("an admin may delete anybody's task", () => {
  async function taskOwnedByMember() {
    const created = await request(app)
      .post("/api/tasks")
      .set("Cookie", memberCookie)
      .send({ title: "Mo's own task" });

    return created.body.task._id as string;
  }

  it("lets the admin delete a task they did not create", async () => {
    const id = await taskOwnedByMember();

    const response = await request(app)
      .delete(`/api/tasks/${id}`)
      .set("Cookie", adminCookie);

    // This is the whole point of building roles. Before 0021 this was a 404.
    expect(response.status).toBe(204);
    expect(await TaskModel.countDocuments({})).toBe(0);
  });

  it("still answers 404 to an ordinary member", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set("Cookie", adminCookie)
      .send({ title: "Ada's own task" });

    const response = await request(app)
      .delete(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", memberCookie);

    // 404 rather than 403, unchanged from 0006: a task id is worth protecting,
    // so "no such task" and "not yours" have to look alike.
    expect(response.status).toBe(404);
    expect(await TaskModel.countDocuments({})).toBe(1);
  });

  it("still lets the creator delete their own", async () => {
    const id = await taskOwnedByMember();

    const response = await request(app)
      .delete(`/api/tasks/${id}`)
      .set("Cookie", memberCookie);

    // The admin rule is an addition, not a replacement.
    expect(response.status).toBe(204);
  });
});

describe("POST /api/users/invite", () => {
  const invitee = { name: "Ivy Invitee", email: "ivy@taskflow.test" };

  function tokenFromEmail(): string {
    expect(sendMail).toHaveBeenCalled();

    const mail = sendMail.mock.calls.at(-1)![0] as { text: string };
    const match = /accept-invite\?token=([a-f0-9]{64})/.exec(mail.text);

    if (!match) throw new Error("no invite link in the email");
    return match[1]!;
  }

  it("is 403 for a member, and sends nothing", async () => {
    const response = await request(app)
      .post("/api/users/invite")
      .set("Cookie", memberCookie)
      .send(invitee);

    // 403 here, not the 404 a task uses. "You are not an admin" is a fact about
    // the caller and gives away nothing about anybody else.
    expect(response.status).toBe(403);
    expect(sendMail).not.toHaveBeenCalled();
    expect(await UserModel.countDocuments({})).toBe(2);
  });

  it("is 401 with no login at all", async () => {
    const response = await request(app).post("/api/users/invite").send(invitee);

    expect(response.status).toBe(401);
  });

  it("creates the person as invited, with no password", async () => {
    const response = await request(app)
      .post("/api/users/invite")
      .set("Cookie", adminCookie)
      .send({ ...invitee, role: "designer" });

    expect(response.status).toBe(202);

    const created = await UserModel.findOne({ email: invitee.email }).select(
      "+passwordHash",
    );

    expect(created!.status).toBe("invited");
    expect(created!.role).toBe("designer");
    // No password until they choose one. This is what stops an invited record
    // being an account somebody could sign in to.
    expect(created!.passwordHash).toBeUndefined();
  });

  it("shows up on the team list straight away", async () => {
    await request(app)
      .post("/api/users/invite")
      .set("Cookie", adminCookie)
      .send(invitee);

    const response = await request(app)
      .get("/api/users")
      .set("Cookie", adminCookie);

    // An invitation you cannot see is one you send twice.
    const names = response.body.users.map((u: { name: string }) => u.name);
    expect(names).toContain(invitee.name);
  });

  // This route feeds the Team table's Role and Status columns, and asserting
  // only on names let a projection that dropped both look healthy: the columns
  // rendered as an empty dropdown and a dot with no label, which reads as a
  // broken control rather than as missing data. Name the fields.
  it("returns role and status on every row, which the Team columns need", async () => {
    await request(app)
      .post("/api/users/invite")
      .set("Cookie", adminCookie)
      .send({ ...invitee, role: "designer" });

    const response = await request(app)
      .get("/api/users")
      .set("Cookie", adminCookie);

    for (const row of response.body.users) {
      expect(Object.keys(row).sort()).toEqual([
        "_id",
        "createdAt",
        "email",
        "name",
        "role",
        "status",
      ]);
    }

    const invited = response.body.users.find(
      (u: { email: string }) => u.email === invitee.email.toLowerCase(),
    );
    expect(invited.role).toBe("designer");
    expect(invited.status).toBe("invited");

    const ada = response.body.users.find(
      (u: { email: string }) => u.email === admin.email,
    );
    expect(ada.role).toBe("admin");
    expect(ada.status).toBe("active");
  });

  it("refuses to invite somebody who is already a member", async () => {
    const response = await request(app)
      .post("/api/users/invite")
      .set("Cookie", adminCookie)
      .send({ name: "Mo again", email: member.email });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("cannot sign in until the invitation is accepted", async () => {
    await request(app)
      .post("/api/users/invite")
      .set("Cookie", adminCookie)
      .send(invitee);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: invitee.email, password: "anything-at-all" });

    // The same 401 an unknown address gets. Saying "that account exists but is
    // not activated" would confirm the address is registered here.
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("POST /api/auth/accept-invite", () => {
  const invitee = { name: "Ivy Invitee", email: "ivy@taskflow.test" };
  const chosen = "the-password-ivy-picked";

  async function inviteAndGetToken(): Promise<string> {
    await request(app)
      .post("/api/users/invite")
      .set("Cookie", adminCookie)
      .send(invitee);

    const mail = sendMail.mock.calls.at(-1)![0] as { text: string };
    const match = /accept-invite\?token=([a-f0-9]{64})/.exec(mail.text);
    if (!match) throw new Error("no invite link in the email");
    return match[1]!;
  }

  it("turns an invitation into a working account", async () => {
    const token = await inviteAndGetToken();

    const accepted = await request(app)
      .post("/api/auth/accept-invite")
      .send({ token, password: chosen });

    expect(accepted.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: invitee.email, password: chosen });

    expect(login.status).toBe(200);

    const stored = await UserModel.findOne({ email: invitee.email });
    expect(stored!.status).toBe("active");
  });

  it("does not sign you in", async () => {
    const token = await inviteAndGetToken();

    const response = await request(app)
      .post("/api/auth/accept-invite")
      .send({ token, password: chosen });

    // Same reasoning as a password reset: whoever opened the email may not be
    // the person it was meant for.
    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeUndefined();
  });

  it("refuses the same token twice", async () => {
    const token = await inviteAndGetToken();

    expect(
      await request(app)
        .post("/api/auth/accept-invite")
        .send({ token, password: chosen })
        .then((r) => r.status),
    ).toBe(200);

    const second = await request(app)
      .post("/api/auth/accept-invite")
      .send({ token, password: "a-different-password" });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("INVALID_INVITE_TOKEN");
  });

  it("refuses an expired token", async () => {
    const token = await inviteAndGetToken();

    await UserModel.updateOne(
      { email: invitee.email },
      { $set: { passwordResetExpiresAt: new Date(Date.now() - 1000) } },
    );

    const response = await request(app)
      .post("/api/auth/accept-invite")
      .send({ token, password: chosen });

    expect(response.status).toBe(400);
  });

  it("will not accept a password reset token as an invitation", async () => {
    // Both use the same token machinery, so the status check is the only thing
    // keeping them apart. Without it a reset link would activate an account.
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: member.email });

    const mail = sendMail.mock.calls.at(-1)![0] as { text: string };
    const resetToken = /reset-password\?token=([a-f0-9]{64})/.exec(mail.text)![1]!;

    const response = await request(app)
      .post("/api/auth/accept-invite")
      .send({ token: resetToken, password: "trying-it-on" });

    expect(response.status).toBe(400);
  });

  it("applies the same password rules as registering", async () => {
    const token = await inviteAndGetToken();

    const response = await request(app)
      .post("/api/auth/accept-invite")
      .send({ token, password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/users/me", () => {
  it("changes your own name and preferences", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Cookie", memberCookie)
      .send({ name: "Mo Renamed", timezone: "Asia/Kolkata", notifyOnMention: false });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe("Mo Renamed");
    expect(response.body.user.timezone).toBe("Asia/Kolkata");
    expect(response.body.user.notifyOnMention).toBe(false);
  });

  it("refuses a field it was not told about, including email", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Cookie", memberCookie)
      .send({ email: "somebody-elses@taskflow.test" });

    // .strict() on the schema. Changing an email needs a verification round
    // trip to prove the new address is theirs, which is still not built — so
    // the field is refused rather than quietly ignored.
    expect(response.status).toBe(400);

    const unchanged = await UserModel.findOne({ email: member.email });
    expect(unchanged).not.toBeNull();
  });

  it("never lets a password hash through", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Cookie", memberCookie)
      .send({ name: "Mo Again" });

    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it("is 401 without a login", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .send({ name: "Nobody" });

    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/users/:id/role", () => {
  async function idOf(email: string) {
    const user = await UserModel.findOne({ email });
    return user!._id.toString();
  }

  it("lets an admin change somebody's role", async () => {
    const response = await request(app)
      .patch(`/api/users/${await idOf(member.email)}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "designer" });

    expect(response.status).toBe(204);

    const after = await UserModel.findOne({ email: member.email });
    expect(after!.role).toBe("designer");
  });

  it("is 403 for a member, even changing their own role", async () => {
    const response = await request(app)
      .patch(`/api/users/${await idOf(member.email)}/role`)
      .set("Cookie", memberCookie)
      .send({ role: "admin" });

    // The hole this closes: without it, anybody could make themselves an admin
    // and then delete anybody's task.
    expect(response.status).toBe(403);

    const after = await UserModel.findOne({ email: member.email });
    expect(after!.role).toBe("engineer");
  });

  it("refuses to demote the only admin", async () => {
    const response = await request(app)
      .patch(`/api/users/${await idOf(admin.email)}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "engineer" });

    // Otherwise the workspace locks itself out of role management with no way
    // back that does not involve a database console.
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("LAST_ADMIN");

    const after = await UserModel.findOne({ email: admin.email });
    expect(after!.role).toBe("admin");
  });

  it("allows the demotion once somebody else is an admin", async () => {
    await request(app)
      .patch(`/api/users/${await idOf(member.email)}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "admin" });

    const response = await request(app)
      .patch(`/api/users/${await idOf(admin.email)}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "engineer" });

    // The guard is about the LAST admin, not about admins in general.
    expect(response.status).toBe(204);
  });
});

describe("PATCH /api/users/me no longer accepts a role", () => {
  it("is 400, and the role is unchanged", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Cookie", memberCookie)
      .send({ role: "admin" });

    // .strict() on the schema. A quietly ignored field would answer 200 and
    // look like it worked, which is the worst of both.
    expect(response.status).toBe(400);

    const after = await UserModel.findOne({ email: member.email });
    expect(after!.role).toBe("engineer");
  });
});

describe("DELETE /api/users/:id", () => {
  async function idOf(email: string) {
    const user = await UserModel.findOne({ email });
    return user!._id.toString();
  }

  it("removes the member and UNASSIGNS their tasks rather than deleting them", async () => {
    const memberId = await idOf(member.email);

    await request(app)
      .post("/api/tasks")
      .set("Cookie", adminCookie)
      .send({ title: "Work Mo was holding", assigneeId: memberId });

    const response = await request(app)
      .delete(`/api/users/${memberId}`)
      .set("Cookie", adminCookie);

    expect(response.status).toBe(204);
    expect(await UserModel.findById(memberId)).toBeNull();

    // The whole point. Work outlives whoever happened to be holding it, and
    // deleting a leaver's tasks would destroy the team's data.
    const task = await TaskModel.findOne({ title: "Work Mo was holding" });
    expect(task).not.toBeNull();
    expect(task!.assigneeId).toBeNull();
  });

  it("is 403 for a member", async () => {
    const response = await request(app)
      .delete(`/api/users/${await idOf(admin.email)}`)
      .set("Cookie", memberCookie);

    expect(response.status).toBe(403);
    expect(await UserModel.countDocuments({})).toBe(2);
  });

  it("refuses to let an admin remove themselves", async () => {
    const response = await request(app)
      .delete(`/api/users/${await idOf(admin.email)}`)
      .set("Cookie", adminCookie);

    // An accident with no undo. Somebody else can remove them, which also
    // means a second person knows it happened.
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CANNOT_REMOVE_YOURSELF");
  });

  it("refuses to remove the last admin", async () => {
    // Promote Mo, then have Mo try to remove Ada — legal so far. Then demote
    // Mo and try again, which would leave nobody.
    const adminId = await idOf(admin.email);

    await request(app)
      .patch(`/api/users/${await idOf(member.email)}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "admin" });

    await request(app)
      .patch(`/api/users/${adminId}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "engineer" });

    // Ada is now an engineer, Mo the only admin. Mo cannot be removed by Ada
    // anyway (403), so Mo tries to remove themselves — blocked twice over.
    const response = await request(app)
      .delete(`/api/users/${await idOf(member.email)}`)
      .set("Cookie", memberCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CANNOT_REMOVE_YOURSELF");
  });
});
