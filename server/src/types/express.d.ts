import type { UserDocument } from "../models/user.model.js";

// Lets requireAuth attach the logged-in person to the request and every later
// handler read req.user with real types instead of a cast.
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

export {};
