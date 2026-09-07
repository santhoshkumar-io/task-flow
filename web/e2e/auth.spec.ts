import { expect, test } from "@playwright/test";
import { PASSWORD, SARAH, signIn, signOut } from "./helpers";

// The guard, end to end.
//
// server/tests/auth.test.ts already proves the API refuses a bad password and
// that requireAuth rejects a missing token. What it cannot prove is that the
// BROWSER ends up in the right place: that the cookie is actually set on the
// response, that CORS lets the page read it back, and that ProtectedRoute sends
// a signed-out visitor to /login instead of rendering an empty task list.
//
// Those are three different pieces of machinery and none of them are exercised
// by an in-process supertest call.

test.describe("signing in and out", () => {
  test("sends a signed-out visitor from /tasks to the login screen", async ({
    page,
  }) => {
    await page.goto("/tasks");

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome back" }),
    ).toBeVisible();
  });

  test("shows the server's message when the password is wrong, and stays put", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(SARAH);
    await page.getByLabel(/^password$/i).fill("not-the-right-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Invalid email or password",
    );
    // The important half: a failed sign-in must not navigate anywhere.
    await expect(page).toHaveURL(/\/login/);
  });

  test("signs in and lands on the task list with the seeded data", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    // 30 seeded tasks, ten to a page — proof the cookie survived the redirect
    // and the list request was authorised.
    //
    // .first() because the pager writes the count twice — once for the
    // desktop pager and once for the phone's Load more stack — and on page
    // one both say exactly this. Only one of the two is ever visible; they
    // diverge after Load more, when the phone reads 1–20 and the desktop
    // page two reads 11–20.
    await expect(
      page.getByText(/Showing 1–10 of 30 tasks/).first(),
    ).toBeVisible();
  });

  test("signs out from the avatar menu, and the guard closes behind you", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await signOut(page, "Sarah Chen");

    // Not just "we are on /login" — the protected route must refuse a second
    // time, which is what proves the cookie was really cleared rather than the
    // client simply forgetting it.
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
  });

  test("keeps you signed in across a reload", async ({ page }) => {
    await signIn(page, SARAH);

    await page.reload();

    // The cookie is httpOnly, so this only passes if the browser sent it back
    // and GET /api/auth/me accepted it.
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test("refuses an email the client can see is malformed, without a request", async ({
    page,
  }) => {
    await page.goto("/login");

    let requested = false;
    page.on("request", (r) => {
      if (r.url().includes("/api/auth/login")) requested = true;
    });

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel(/^password$/i).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    expect(requested).toBe(false);
  });
});
