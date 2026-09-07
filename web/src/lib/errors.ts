import { ApiError } from "../api/client";

// Turning a failure into the two lines the design's error state shows.
//
// In lib/ rather than beside ErrorState, because the toast needs the message
// too, and a file that exports both a component and a plain function cannot be
// hot-reloaded on its own — the same lint warning that moved initialsOf and
// useAuth out of their components in V6.

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong.";
}

/**
 * "Request ID: b1f2fc4 · 500 from /api/tasks".
 *
 * Every part comes from the error object; nothing is hardcoded. That is the
 * whole point of showing it, and AGENTS.md forbids putting a value on screen
 * that did not come from a real response.
 *
 * When the server is stopped there is genuinely no request id — nothing
 * answered, so nothing issued one — and the line says so. An invented id is
 * worse than none, because somebody will search the logs for it.
 */
export function traceLine(error: unknown): string {
  if (!(error instanceof ApiError)) return "";

  const id = error.requestId ?? "not issued — the server was never reached";
  const status = error.status === 0 ? "Network error" : error.status;

  return `Request ID: ${id} · ${status} from ${error.path}`;
}
