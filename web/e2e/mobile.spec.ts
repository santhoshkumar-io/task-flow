import { expect, test } from "@playwright/test";
import { SARAH, signIn } from "./helpers";

// The phone frames, at 390×844.
//
// Everything else in this folder runs at a pinned 1440×900, because the app
// mounts the desktop table AND the mobile card stack together and hides one
// with CSS. That makes the desktop suite blind to exactly the things this pass
// changed: the tab bar, the navigation sheet, the filter sheet, the docked
// comment box. This project is the other width.
//
// It runs against the same throwaway in-memory database — see
// server/src/e2e-server.ts — so the auth rate limiter is off and these can
// sign in as often as they like.

test.describe("the phone frame", () => {
  test("nothing scrolls sideways on any of the five screens", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    const noOverflow = async (where: string) => {
      const width = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      // A page one pixel wider than the screen is the classic phone bug: it
      // rocks sideways under the thumb and nothing looks broken in a
      // screenshot.
      expect(width.scroll, `${where} scrolls sideways`).toBeLessThanOrEqual(
        width.client + 1,
      );
    };

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Recent Tasks" })).toBeVisible();
    await noOverflow("dashboard");

    await page.goto("/tasks");
    await expect(page.getByRole("button", { name: /Filters/ })).toBeVisible();
    await noOverflow("task list");

    await page.goto("/team");
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await noOverflow("team");
  });

  test("the tab bar has three reachable tabs and the pill covers none of them", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    // The frame draws the Create Task pill sitting ON the third tab. It is
    // floated clear of the bar instead, and this is the check that says so:
    // every tab must be clickable at the point Playwright would click it.
    for (const [name, url] of [
      ["Dashboard", /\/dashboard/],
      ["My Tasks", /\/tasks\?assigneeId=/],
      ["Tasks", /\/tasks$/],
    ] as const) {
      await page.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(url);
    }

    await expect(
      page.getByRole("button", { name: "Create Task" }),
    ).toBeVisible();
  });

  test("the navigation sheet opens, names you, and signs you out", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    await page.getByRole("button", { name: "Open menu" }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet).toBeVisible();

    // The email and the sign-out button are the two things the phone sheet
    // adds. On a phone the top-bar avatar menu is BEHIND the sheet, so without
    // these there is no way out from here.
    await expect(sheet.getByText("sarah@taskflow.dev")).toBeVisible();

    // Settings is on the plan's exclusion list and stays visibly inert rather
    // than silently doing nothing.
    await expect(sheet.getByRole("button", { name: "Settings" })).toBeDisabled();

    // While it is open the page behind it cannot scroll.
    const locked = await page.evaluate(
      () => getComputedStyle(document.body).overflow,
    );
    expect(locked).toBe("hidden");

    // Escape closes it, and focus goes back to the button that opened it.
    //
    // Opened from the KEYBOARD on purpose. A touch tap does not focus a
    // button, so after a tap there is no previous focus to return to and this
    // would be testing the tap rather than the sheet. Focus return exists for
    // the people who never tap.
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    const hamburger = page.getByRole("button", { name: "Open menu" });
    await hamburger.focus();
    await page.keyboard.press("Enter");
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(hamburger).toBeFocused();

    // The panel this replaced was hand-rolled: no focus trap, no scroll lock,
    // no Escape and no focus return. Drawer is Radix, which brings all four.
    await hamburger.click();
    await expect(sheet).toBeVisible();

    await sheet.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    // And the guard closes behind you.
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the filter sheet holds the controls, and the badge counts them", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await page.goto("/tasks?status=in_progress&priority=urgent");

    // Two filters set, so the button carries a 2 — and two chips are drawn.
    const filters = page.getByRole("button", { name: /Filters/ });
    await expect(filters).toContainText("2");
    await expect(
      page.getByRole("button", { name: /^Remove filter/ }),
    ).toHaveCount(2);

    // The chips drop the "Status : " prefix on a phone, as the frame draws
    // them, but the accessible name keeps it.
    await expect(
      page.getByRole("button", { name: "Remove filter Status : In Progress" }),
    ).toBeVisible();

    await filters.click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("combobox")).toHaveCount(4);

    await sheet.getByRole("button", { name: "Clear all" }).click();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole("button", { name: /^Remove filter/ })).toHaveCount(
      0,
    );
  });

  test("a task can be created with a due date, and a past one is refused", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    await page.getByRole("button", { name: "Create Task" }).click();
    const sheet = page.getByRole("dialog", { name: "Create Task" });

    await sheet.getByLabel("Task Title").fill("Due date from a phone");
    await sheet.getByLabel("Due Date").fill("2020-01-01");
    // The header Create, not the footer one — the frame draws both and both
    // submit the same form.
    await sheet.getByRole("button", { name: "Create", exact: true }).click();

    await expect(sheet.getByText("Due date can't be in the past.")).toBeVisible();
    await expect(sheet).toBeVisible();

    // A real date goes through, and the card shows it.
    await sheet.getByLabel("Due Date").fill("2027-03-04");
    await sheet.getByRole("button", { name: "Create Task" }).click();
    await expect(sheet).toBeHidden();

    const card = page.getByRole("link", { name: /Due date from a phone/ });
    await expect(card).toBeVisible();
    // The card formats the date with the browser's own locale, so the
    // order of the month and the day is not something this test gets to
    // decide. Both orders are the same fact.
    await expect(card).toContainText(/due (4 Mar|Mar 4)/);
  });

  test("the comment thread folds, and the compose box stays on screen", async ({
    page,
  }) => {
    await signIn(page, SARAH);

    // TF-1 is seeded with more than one comment.
    await page.goto("/tasks?q=Fix login bug on Safari");
    await page.locator("a[href^='/tasks/']:visible").first().click();
    await expect(page).toHaveURL(/\/tasks\/[0-9a-f]{24}/);

    const fold = page.getByRole("button", { name: /View all \d+ comments/ });
    await expect(fold).toBeVisible();

    // The number in the link is the number that appears when you press it.
    const label = (await fold.textContent()) ?? "";
    const promised = Number(/\d+/.exec(label)?.[0]);
    expect(promised).toBeGreaterThan(1);

    // .first(): the Activity card further down the page is also a
    // ul.divide-y, and it has rows of its own. The comment thread is the
    // first one in the document at either width.
    const thread = page.locator("ul.divide-y").first();
    await expect(thread.locator("> li:visible")).toHaveCount(1);
    await fold.click();
    await expect(thread.locator("> li:visible")).toHaveCount(promised);

    // Docked to the screen, not to the card: still there after scrolling to
    // the very bottom, which is where it used to disappear.
    const box = page.getByLabel("Write a comment");
    await expect(box).toBeInViewport();
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTop = main.scrollHeight;
    });
    await expect(box).toBeInViewport();

    // The tab bar is not underneath it — the frame draws one bar, not two.
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  });

  test("the task detail bar offers the menu, and the facts are still all there", async ({
    page,
  }) => {
    await signIn(page, SARAH);
    await page.goto("/tasks");
    await page.locator("a[href^='/tasks/']:visible").first().click();
    await expect(page).toHaveURL(/\/tasks\/[0-9a-f]{24}/);
    // The router pushes the URL before React paints the new screen, so for
    // a moment the address says detail while the DOM is still the list —
    // where there are ten ⋯ buttons instead of one. Waiting for something
    // only the detail screen has closes that window.
    await expect(page.getByRole("heading", { name: "Description" })).toBeVisible();

    // Edit is not drawn on a phone; it is the first item in the menu instead,
    // so nothing is unreachable.
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await page.getByRole("button", { name: "Task actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Edit task" })).toBeVisible();
    await page.keyboard.press("Escape");

    // Status and Priority leave the grid because they are already the badges
    // under the title. Everything else stays — nothing is lost on a phone.
    for (const label of ["Assignee", "Due date", "Created by", "Updated", "Created"]) {
      await expect(
        page.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) }),
      ).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  });
});
