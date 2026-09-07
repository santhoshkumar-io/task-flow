import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { SARAH } from "../test/fixtures";
import { renderWithProviders } from "../test/renderWithProviders";
import { LoginPage } from "./LoginPage";

// The path a real person hits with a wrong password.
//
// The API module is replaced rather than the network, so the test never
// depends on a server being up — and `fetchMe` has to be mocked too, because
// AuthProvider calls it on mount to decide whether anybody is signed in.

vi.mock("../api/auth.api", () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
}));

const authApi = await import("../api/auth.api");

beforeEach(() => {
  // "You are signed out", which is what puts the login form on screen.
  vi.mocked(authApi.fetchMe).mockRejectedValue(
    new ApiError(401, "UNAUTHORIZED", "You must be logged in"),
  );
});

// Anchored, because /password/i also matches the show-and-hide toggle inside
// PasswordInput, whose aria-label is "Show password".
const PASSWORD_FIELD = /^password$/i;

async function fillAndSubmit() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/email/i), "sarah@taskflow.dev");
  await user.type(screen.getByLabelText(PASSWORD_FIELD), "wrong-password");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  return user;
}

describe("LoginPage", () => {
  it("shows the server's message when the password is wrong", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password"),
    );

    renderWithProviders(<LoginPage />, { route: "/login" });
    await fillAndSubmit();

    // The server's own words, not a message this page made up. Someone typing
    // the wrong password has to be told that, and a generic "something went
    // wrong" would send them looking for a broken app instead of their
    // password.
    expect(
      await screen.findByText("Invalid email or password"),
    ).toBeInTheDocument();
  });

  it("puts a field error beside its own box", async () => {
    // When the server names fields, each message belongs next to the input it
    // is about — not in the banner at the top.
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(400, "VALIDATION_ERROR", "Enter a valid email address", [
        { field: "email", message: "Enter a valid email address" },
      ]),
    );

    renderWithProviders(<LoginPage />, { route: "/login" });
    await fillAndSubmit();

    const message = await screen.findByText("Enter a valid email address");
    expect(message).toBeInTheDocument();
  });

  it("lets you try again after a failure", async () => {
    // The button has to come back. A form that stays stuck on "Signing in…"
    // after a wrong password is one a person cannot recover from without a
    // page reload.
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password"),
    );

    renderWithProviders(<LoginPage />, { route: "/login" });
    await fillAndSubmit();

    await screen.findByText("Invalid email or password");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
    });
  });

  it("never sends a malformed email to the server", async () => {
    // The Zod resolver runs before any request. This is the half of validation
    // that saves a round trip, and it is easy to break by changing the schema.
    vi.mocked(authApi.login).mockResolvedValue(SARAH);

    renderWithProviders(<LoginPage />, { route: "/login" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(PASSWORD_FIELD), "some-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByText(/valid email/i);
    expect(authApi.login).not.toHaveBeenCalled();
  });
});
