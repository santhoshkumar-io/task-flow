import { Router } from "express";
import * as controller from "./comment.controller.js";

// mergeParams lets this router see :taskId from the path it is mounted under.
// Without it, req.params.taskId would be undefined here.
export const commentRouter = Router({ mergeParams: true });

// No requireAuth here: this router is mounted inside the task router, which
// already guards everything below it.

commentRouter.get("/comments", controller.list);
commentRouter.post("/comments", controller.create);
commentRouter.get("/activity", controller.listActivity);
