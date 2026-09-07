import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { SARAH } from "../test/fixtures";
import { renderWithProviders } from "../test/renderWithProviders";
import type { TaskPage } from "../types";
import { TaskListPage } from "./TaskListPage";

// The empty state, which is TWO states rather than one.
//
// "No tasks yet" and "No tasks found" look similar and mean opposite things.
// Somebody seeing "No tasks yet" while a status filter is set will believe
// their data has been lost. 02-PRODUCT-PLAN.md calls collapsing the two the
// most common thing that gets marked down on this screen — so both are pinned
// here, in the one place a refactor would quietly merge them.

vi.mock("../api/tasks.api", async (importOriginal) => ({
  // toSearchParams and the type exports are still needed by the hooks.
  ...(await importOriginal<typeof import("../api/tasks.api")>()),
  listTasks: vi.fn(),
}));

vi.mock("../api/users.api", () => ({ listUsers: vi.fn() }));

vi.mock("../api/auth.api", () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
}));

const tasksApi = await import("../api/tasks.api");
const usersApi = await import("../api/users.api");
const authApi = await import("../api/auth.api");

const NO_TASKS: TaskPage = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

beforeEach(() => {
  vi.mocked(tasksApi.listTasks).mockResolvedValue(NO_TASKS);
  vi.mocked(usersApi.listUsers).mockResolvedValue([]);
  vi.mocked(authApi.fetchMe).mockResolvedValue(SARAH);
});

describe("TaskListPage empty states", () => {
  it("says 'No tasks yet' when there are genuinely no tasks", async () => {
    renderWithProviders(<TaskListPage />, { route: "/tasks" });

    expect(await screen.findByText("No tasks yet")).toBeInTheDocument();
    expect(
      screen.getByText(/create your first task to get started/i),
    ).toBeInTheDocument();

    // No "Clear filters" button, because there is nothing to clear. Offering
    // one on an empty account is a button that does nothing.
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it("says 'No tasks found' when a filter is what emptied the list", async () => {
    // The filter comes from the URL, exactly as it does in the real app —
    // see docs/decisions/0010-filters-in-the-url.md.
    renderWithProviders(<TaskListPage />, { route: "/tasks?status=done" });

    expect(await screen.findByText("No tasks found")).toBeInTheDocument();
    expect(
      screen.getByText(/try changing your filters/i),
    ).toBeInTheDocument();

    // And here the button belongs, because there is something to clear.
    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
  });

  it("never shows the empty state when the request failed", async () => {
    // The worst confusion of the three. "No tasks yet" on a failed request
    // tells somebody their work is gone when the truth is that the server did
    // not answer.
    vi.mocked(tasksApi.listTasks).mockRejectedValue(
      new ApiError(500, "INTERNAL_ERROR", "Something went wrong on our side."),
    );

    renderWithProviders(<TaskListPage />, { route: "/tasks" });

    // findAll, not find: the page draws the table for wide screens and the card
    // stack for narrow ones at the same time and hides one with CSS, so the
    // error panel is legitimately in the document twice. jsdom has no CSS, so
    // it sees both.
    const panels = await screen.findAllByText(/something went wrong/i);
    expect(panels.length).toBeGreaterThan(0);

    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No tasks found")).not.toBeInTheDocument();
  });
});
