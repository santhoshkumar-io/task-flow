import type { Request } from "express";
import { AppError } from "./AppError.js";
import type { UserDocument } from "../models/user.model.js";

// req.user is typed optional because the type is global and most routes have
// no logged-in person. Inside a router behind requireAuth it is always set.
// This turns that into one checked read instead of a non-null assertion on
// every route — if the guard were ever removed by accident, the route answers
// 401 rather than crashing on undefined.
export function currentUser(req: Request): UserDocument {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  return req.user;
}
