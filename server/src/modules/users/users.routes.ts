import { Router } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as controller from "./users.controller.js";

export const usersRouter = Router();

// The guard goes on the whole router, so a route added here later cannot be
// forgotten and left open.
usersRouter.use(requireAuth);

usersRouter.get("/", controller.list);

// The Team screen's numbers per person. A separate route from "/" so the
// assignee dropdown, which shows no counts, does not pay for four aggregations
// on every screen that happens to open one.
usersRouter.get("/stats", controller.stats);

usersRouter.get("/workspace", controller.workspace);

// Renaming the workspace is an admin act — it changes what everybody sees.
usersRouter.patch("/workspace", requireAdmin, controller.renameWorkspace);

// Your own profile, and only ever your own. There is deliberately no route for
// editing somebody else: the only screen that edits a person edits the
// signed-in one, so a /:id route would exist purely to be misused.
usersRouter.patch("/me", controller.updateMe);

// Admin only, and a 403 rather than a 404 — see the note in requireAdmin.
usersRouter.post("/invite", requireAdmin, controller.invite);

// Changing a role is deliberately NOT part of PATCH /me. That route edits the
// signed-in person, and letting somebody set their own role means anybody can
// become an admin — and an admin may delete anybody's task.
// See docs/decisions/0021-roles-are-real.md.
usersRouter.patch("/:id/role", requireAdmin, controller.changeRole);

usersRouter.delete("/:id", requireAdmin, controller.removeMember);
