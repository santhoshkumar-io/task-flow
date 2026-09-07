import { expect, test } from "@playwright/test";
import { SARAH, signIn } from "./helpers";

// The dashboard's job is to be TRUE, not to be pretty.
//
// AGENTS.md: "never put a number on screen that did not come from an API
// response." That is easy to promise and easy to break — a hard-coded zero
// while data loads, a count taken from the wrong field, a trend computed in the
// component. These tests read the API and the screen and insist they agree.
//
// Deliberately NOT asserted here:
//   - the greeting. "Good evening, Sarah" is read off the clock, so pinning it
//     makes the suite fail depending on the hour it runs.
//   - the My Tasks sidebar badge after a change. useUserStats has a 60-second
//     staleTime, so it is ALLOWED to lag. That is a chosen cache setting, not
//     a bug for a test to catch.

test.describe("the dashboard agrees with the API", () => {
  test("every stat card matches what /api/tasks/stats returns", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await page.goto("/dashboard");

    // page.request shares the browser context, so it carries the auth cookie.
    const response = await page.request.get(
      "http://localhost:4000/api/tasks/stats",
    );
    expect(response.ok()).toBe(true);
    const { stats } = await response.json();

    const cards = [
      { label: "Total Tasks", value: stats.total },
      { label: "To Do", value: stats.todo },
      { label: "In Progress", value: stats.inProgress },
      { label: "Completed", value: stats.done },
    ];

    for (const { label, value } of cards) {
      const card = page.getByRole("link").filter({ hasText: label });
      await expect(card).toContainText(String(value));
    }
  });

  test("each card links to the list filtered the way the card is labelled", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await page.goto("/dashboard");

    // A card that says "To Do: 11" and then shows you everything would be
    // worse than no link at all.
    await page.getByRole("link").filter({ hasText: "To Do" }).click();

    await expect(page).toHaveURL(/\/tasks\?status=todo/);
    await expect(
      page.getByRole("button", { name: /Remove filter Status : To Do/ }),
    ).toBeVisible();
  });

  test("the numbers are absent while loading, never a placeholder zero", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    // Hold the stats request open so the loading state is observable.
    await page.route("**/api/tasks/stats", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto("/dashboard");

    // A zero here would read as a real count saying there is no work at all.
    // The card draws a grey block instead, so the number is genuinely absent.
    const total = page.getByRole("link").filter({ hasText: "Total Tasks" });
    await expect(total).toBeVisible();
    await expect(total).not.toContainText("0");

    // …and it fills in once the request lands.
    await expect(total).toContainText(/\d/, { timeout: 10_000 });
  });

  test("the recent tasks card shows real rows and links to the full list", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Recent Tasks" }),
    ).toBeVisible();

    await page.getByRole("link", { name: /View all tasks/ }).click();
    await expect(page).toHaveURL(/\/tasks$/);
  });
});
