// Our own error type. A plain Error only carries a message; this also carries
// the HTTP status to answer with and a short machine-readable code, so the
// error handler never has to guess what a thrown value meant.

export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;

    // Keeps this constructor out of the stack trace, so the trace points at
    // the line that actually threw.
    Error.captureStackTrace?.(this, AppError);
  }

  static notFound(message = "Not found") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static badRequest(message = "Bad request") {
    return new AppError(400, "BAD_REQUEST", message);
  }

  static serviceUnavailable(message = "Service unavailable") {
    return new AppError(503, "SERVICE_UNAVAILABLE", message);
  }
}
