import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as controller from "./users.controller.js";

export const usersRouter = Router();

// The guard goes on the whole router, so a route added here later cannot be
// forgotten and left open.
usersRouter.use(requireAuth);

usersRouter.get("/", controller.list);
