import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as controller from "./task.controller.js";

export const taskRouter = Router();

// The guard goes on the whole router, so a route added here later cannot be
// left open by forgetting.
taskRouter.use(requireAuth);

taskRouter.post("/", controller.create);
taskRouter.get("/", controller.list);

// MUST stay above /:id. Express matches routes in the order they are
// registered, so the other way round it reads the word "stats" as an id and
// answers 400 instead of the numbers.
taskRouter.get("/stats", controller.stats);

taskRouter.get("/:id", controller.getById);

// PATCH, not PUT. PUT means replace the whole record, so a client that left a
// field out would wipe it. Every real edit touches one or two fields.
taskRouter.patch("/:id", controller.update);
taskRouter.delete("/:id", controller.remove);
