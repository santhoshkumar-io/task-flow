import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as controller from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", controller.register);
authRouter.post("/login", controller.login);
authRouter.post("/logout", controller.logout);

// The only route here that needs a login, so the guard goes on this one route
// rather than the whole router.
authRouter.get("/me", requireAuth, controller.me);
