import { expect, test } from "@playwright/test";
import { SARAH, signIn, uniqueTitle } from "./helpers";

// One task, from creation to deletion, through the screens a person actually
// uses.
//
// This app has NO success messages — there is exactly one toast in the whole
// codebase and it is the task-list error. So every step here is asserted by its
// consequence instead: the drawer closed, the row appeared, the count moved,
// the URL changed. Every assertion is web-first so it retries while the refetch
// lands, because a mutation only invalidates the cache and the new data arrives
// a moment later.
//
// The task is created by the test rather than borrowed from the seeded 30, so a
// failed run leaves something identifiable behind instead of a hole in the
// fixtures the next spec depends on.

test.describe("a task from start to finish", () => {
  test("create it, comment on it, edit the comment, then delete both", async ({
    page,
  }) => {
    const title = uniqueTitle("E2E journey");
    await signIn(page, SARAH);

    // --- create ------------------------------------------------------------
    await page.getByRole("button", { name: "Create Task" }).click();

    const drawer = page.getByRole("dialog", { name: "Create Task" });
    await expect(drawer).toBeVisible();

    await drawer.getByLabel("Task Title").fill(title);
    await drawer
      .getByLabel("Description")
      .fill("Written by the end-to-end suite.");

    // Scoped to the drawer on purpose: "Create Task" is also the page header
    // button behind it, and Playwright's strict mode fails on two matches.
    await drawer.getByRole("button", { name: "Create Task" }).click();

    await expect(drawer).toBeHidden();

    // Default sort is last-updated first, so a task made a second ago is at the
    // top of page one. No searching needed.
    const table = page.locator("table");
    const row = table.getByRole("link", { name: new RegExp(title) });
    await expect(row).toBeVisible();

    // --- open it -----------------------------------------------------------
    await row.click();
    await expect(page).toHaveURL(/\/tasks\/[0-9a-f]{24}/);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

    const comments = page.getByRole("heading", { name: /^Comments/ });
    await expect(comments).toContainText("0");

    // --- comment -----------------------------------------------------------
    await page.getByLabel("Write a comment").fill("First pass looks right.");
    // exact: true — "Comment" is a substring of "Comment actions", the ⋯ on
    // your own comments. See the note in rules.spec.ts.
    await page.getByRole("button", { name: "Comment", exact: true }).click();

    // The box clears only after the server accepts, so an empty box IS the
    // acknowledgement.
    await expect(page.getByLabel("Write a comment")).toHaveValue("");
    await expect(comments).toContainText("1");
    await expect(page.getByText("First pass looks right.")).toBeVisible();

    // --- edit the comment --------------------------------------------------
    await page.getByRole("button", { name: "Comment actions" }).click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();

    await page.getByLabel("Edit comment").fill("Second pass — needs a retest.");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText("Second pass — needs a retest.")).toBeVisible();
    // The honest marker: the words changed, so the comment says so.
    await expect(page.getByText("(edited)")).toBeVisible();

    // --- delete the comment ------------------------------------------------
    await page.getByRole("button", { name: "Comment actions" }).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();

    const confirmComment = page.getByRole("dialog", { name: "Delete comment?" });
    // The dialog names what it is about to destroy rather than shrugging.
    await expect(confirmComment).toContainText("Second pass");
    await confirmComment.getByRole("button", { name: "Delete comment" }).click();

    await expect(comments).toContainText("0");
    await expect(page.getByText("Second pass — needs a retest.")).toBeHidden();

    // --- delete the task ---------------------------------------------------
    // Offered only because Sarah created it a moment ago. See
    // docs/decisions/0006 — anyone edits, only the creator deletes.
    await page.getByRole("button", { name: "Task actions" }).click();
    await page.getByRole("menuitem", { name: "Delete task" }).click();

    const confirmTask = page.getByRole("dialog", { name: "Delete this task?" });
    await expect(confirmTask).toContainText(title);
    await confirmTask.getByRole("button", { name: "Delete task" }).click();

    await expect(page).toHaveURL(/\/tasks$/);
    await expect(table.getByRole("link", { name: new RegExp(title) })).toBeHidden();
  });

  test("a task somebody else created offers no delete", async ({ page }) => {
    await signIn(page, SARAH);

    // TF-2 is seeded as Marcus's. Sarah may edit it — anyone can — but the
    // delete is the creator's alone, and the menu simply does not offer it.
    await page.goto("/tasks?q=Fix payment webhook issue");
    await page.locator("table").getByRole("link", { name: /Fix payment webhook/ }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Fix payment webhook issue",
    );

    await page.getByRole("button", { name: "Task actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Edit task" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Delete task" }),
    ).toHaveCount(0);
  });
});
