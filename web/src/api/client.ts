// The one place that talks to the backend.
//
// Everything that has to be true of EVERY request lives here rather than being
// repeated on every screen: sending the cookie, turning the server's error
// shape into a real Error, and noticing a 401.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

/** One field the server rejected, so a form can show it beside the right box. */
export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: FieldError[];
  /** From the server's x-request-id header, so an error state can show it. */
  readonly requestId: string | null;
  /** Which call failed, for the design's "500 from /api/tasks" line. */
  readonly path: string;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: FieldError[] = [],
    requestId: string | null = null,
    path = "",
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = requestId;
    this.path = path;
  }

  /** True when the server does not know who we are. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

// Anything that wants to know about a 401 registers here. AuthProvider does, so
// a session that expires mid-use drops the user back to login instead of
// leaving a screen full of failing requests.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Set for the "am I logged in?" call, which EXPECTS a 401 and handles it. */
  skipUnauthorizedHandler?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, skipUnauthorizedHandler, signal } = options;

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      // Required. The login pass is in an httpOnly cookie, and fetch does not
      // send cookies to another origin unless told to. Without this line every
      // request looks logged out.
      // See docs/decisions/0001-token-storage.md.
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // fetch only rejects when the request never reached the server at all.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the server. Check that it is running.",
      [],
      // Deliberately null. Nothing answered, so no server ever issued an id,
      // and inventing one would make a debugging aid that points nowhere.
      null,
      path,
    );
  }

  const requestId = response.headers.get("x-request-id");

  // 204 No Content — logout and delete answer with an empty body.
  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const serverError = (payload as { error?: Record<string, unknown> } | null)
      ?.error;

    const apiError = new ApiError(
      response.status,
      (serverError?.code as string) ?? "UNKNOWN",
      (serverError?.message as string) ?? "Something went wrong.",
      (serverError?.fields as FieldError[]) ?? [],
      // The header first, then the copy in the body. Belt and braces: a
      // browser can be stopped from reading a custom header by CORS, and the
      // body copy survives being pasted into a bug report.
      requestId ?? ((serverError?.requestId as string) || null),
      path,
    );

    if (apiError.isUnauthorized && !skipUnauthorizedHandler) {
      onUnauthorized?.();
    }

    throw apiError;
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
