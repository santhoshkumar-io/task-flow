import { expect, test } from "@playwright/test";
import { MARCUS, SARAH, signIn } from "./helpers";

// The rules that give this app its shape, checked through the screen rather
// than through the API.
//
// The server already enforces all of this and there are tests proving it —
// 403 for a member changing a role, 404 for editing somebody else's comment.
// What those tests cannot show is whether the UI OFFERS a control that would
// then fail. AGENTS.md calls a visible control that silently does nothing the
// worst of the three options, so "the button is not there" is a product
// requirement, not a detail.

test.describe("what an admin can do that a member cannot", () => {
  test("an engineer gets no invite button, no role menu, and no row menu", async ({
    page,
  }) => {
    await signIn(page, MARCUS);
    await page.goto("/team");

    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    // The list itself is readable by everybody — this is about the controls.
    await expect(page.getByRole("link", { name: "Sarah Chen" })).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Invite Member" }),
    ).toHaveCount(0);
    // Role reads as plain text for a member: no chevron, nothing to open.
    await expect(page.locator('[aria-label^="Role:"]')).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Member actions" }),
    ).toHaveCount(0);
  });

  test("an admin gets the invite button and can open somebody's role menu", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await page.goto("/team");

    await expect(
      page.getByRole("button", { name: "Invite Member" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Role: Engineer. Change role" })
      .click();
    await expect(
      page.getByRole("menuitemradio", { name: "Designer" }),
    ).toBeVisible();
  });

  test("an admin gets no role menu on their OWN row", async ({ page }) => {
    await signIn(page, SARAH);
    await page.goto("/team");

    // Sarah is the only admin. The server refuses to demote the last one, and
    // the commonest way to hit that refusal is by accident on your own row —
    // so the control is not offered. docs/decisions/0021.
    await expect(
      page.getByRole("button", { name: "Role: Admin. Change role" }),
    ).toHaveCount(0);
    // Scoped to the table: the mobile card stack is mounted at the same time
    // and hidden with CSS, so an unscoped "Admin" matches twice.
    await expect(
      page.locator("table").getByText("Admin", { exact: true }),
    ).toBeVisible();
  });

  test("the seat count and member count are real numbers from the API", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await page.goto("/team");

    // page.request, not the standalone `request` fixture: this one shares the
    // browser context, so it carries the httpOnly auth cookie. The bare fixture
    // has its own empty jar and gets a 401.
    const response = await page.request.get(
      "http://localhost:4000/api/users/workspace",
    );
    expect(response.ok()).toBe(true);
    const workspace = await response.json();

    // AGENTS.md: never put a number on screen that did not come from an API
    // response. This is that rule as a test rather than a promise.
    await expect(
      page.getByText(
        `${workspace.workspace.members} members · ${workspace.workspace.seatsRemaining} seats remaining`,
      ),
    ).toBeVisible();
  });
});

test.describe("what only the author can do", () => {
  test("somebody else's comment carries no menu, and yours does", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    // TF-1 is seeded with comments from more than one person.
    await page.goto("/tasks?q=Fix login bug on Safari");
    await page
      .locator("table")
      .getByRole("link", { name: /Fix login bug on Safari/ })
      .click();

    const items = page.locator("ul.divide-y > li");
    await expect(items.first()).toBeVisible();

    // Every comment that is Sarah's has a menu; every comment that is not has
    // none. Counting both sides is what makes this a real assertion rather
    // than "some menu exists somewhere".
    const mine = items.filter({ hasText: "Sarah Chen" });
    const theirs = items.filter({ hasText: "Marcus Reid" });

    await expect(
      mine.getByRole("button", { name: "Comment actions" }).first(),
    ).toBeVisible();
    await expect(
      theirs.getByRole("button", { name: "Comment actions" }),
    ).toHaveCount(0);
  });
});

test.describe("what the forms refuse", () => {
  test("a task with no title is not sent to the server", async ({ page }) => {
    await signIn(page, SARAH);

    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/api/tasks")) posted = true;
    });

    await page.getByRole("button", { name: "Create Task" }).click();
    const drawer = page.getByRole("dialog", { name: "Create Task" });

    await drawer.getByLabel("Description").fill("A body with no title.");
    await drawer.getByRole("button", { name: "Create Task" }).click();

    await expect(drawer.getByText("Task title is required")).toBeVisible();
    // Still open, and nothing left the browser.
    await expect(drawer).toBeVisible();
    expect(posted).toBe(false);
  });

  test("an empty comment is not sent either", async ({ page }) => {
    await signIn(page, SARAH);

    await page.goto("/tasks?q=Fix login bug on Safari");
    await page
      .locator("table")
      .getByRole("link", { name: /Fix login bug on Safari/ })
      .click();

    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/comments")) posted = true;
    });

    // exact: true matters here. Playwright's name matching is substring by
    // default, so "Comment" also matches the "Comment actions" ⋯ button on any
    // comment Sarah wrote — but only once the comment list has rendered. That
    // made this test pass or fail depending on which request landed first.
    await page.getByRole("button", { name: "Comment", exact: true }).click();

    await expect(page.getByText("Comment can't be empty")).toBeVisible();
    expect(posted).toBe(false);
  });
});
