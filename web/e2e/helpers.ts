import { expect, type Page } from "@playwright/test";

// The four seeded accounts, from server/src/seed.ts. They share one password
// because the seed hashes it once — bcrypt at cost 12 takes about half a second
// and there is no reason to pay that four times.
export const PASSWORD = "TaskFlow123!";

export const SARAH = "sarah@taskflow.dev"; // admin
export const MARCUS = "marcus@taskflow.dev"; // engineer

/**
 * Sign in and wait until the app has actually navigated.
 *
 * Waiting on the URL rather than on the button matters: the form posts, the
 * cookie comes back, and only then does the router move. Asserting too early
 * catches the page mid-flight.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  // /password/i would also match the "Show password" toggle — the same anchor
  // the existing unit test in src/pages/LoginPage.test.tsx uses.
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/tasks/);
}

/**
 * Sign out through the avatar menu in the top bar.
 *
 * There is no /logout URL — the only way out is the menu, which is exactly what
 * an end-to-end test should be exercising.
 */
export async function signOut(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: `Account menu for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login/);
}

/**
 * A title nothing else will collide with.
 *
 * Tests create their own tasks rather than touching the seeded 30, so a failed
 * run leaves something identifiable behind instead of a hole in the fixtures.
 */
export function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
