import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as usersController from "../users/users.controller.js";
import * as controller from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", controller.register);
authRouter.post("/login", controller.login);
authRouter.post("/logout", controller.logout);

// Both are public: somebody who cannot sign in is the only person who needs
// them. Both are rate limited as strictly as login in app.ts — asking for a
// reset is a way to send mail to an address, and trying tokens is guessing.
authRouter.post("/forgot-password", controller.forgotPassword);
authRouter.post("/reset-password", controller.resetPassword);

// Accepting an invitation is public for the same reason: somebody who has never
// signed in is the only person who ever calls it. It lives on the auth router
// rather than under /users because it is about becoming able to sign in at all.
authRouter.post("/accept-invite", usersController.acceptInvite);

// The only route here that needs a login, so the guard goes on this one route
// rather than the whole router.
authRouter.get("/me", requireAuth, controller.me);

// Settings → Security. Both need a login, and both hand back a fresh pass —
// each one invalidates every pass issued earlier, including the caller's own.
authRouter.patch("/password", requireAuth, controller.changePassword);
authRouter.post("/sign-out-others", requireAuth, controller.signOutOtherDevices);
