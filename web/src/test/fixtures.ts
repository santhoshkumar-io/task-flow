import type { User } from "../types";

// Shapes that satisfy the real types rather than the minimum a test happens to
// read. A fixture missing half its fields compiles inside a mock and then hides
// the moment a component starts using one of them.

export const SARAH: User = {
  _id: "6a9c94967348f5c430f45757",
  name: "Sarah Chen",
  email: "sarah@taskflow.dev",
  role: "admin",
  status: "active",
  createdAt: "2026-08-09T09:00:00.000Z",
  updatedAt: "2026-08-09T09:00:00.000Z",
};
