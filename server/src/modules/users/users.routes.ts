import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as controller from "./users.controller.js";

export const usersRouter = Router();

// The guard goes on the whole router, so a route added here later cannot be
// forgotten and left open.
usersRouter.use(requireAuth);

usersRouter.get("/", controller.list);

// The Team screen's three numbers per person. A separate route from "/" so the
// assignee dropdown, which shows no counts, does not pay for three
// aggregations on every screen that opens one.
usersRouter.get("/stats", controller.stats);
