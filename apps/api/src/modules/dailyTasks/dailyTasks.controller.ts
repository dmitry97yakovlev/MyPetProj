import { CompleteDailyTaskInputSchema, UpdateDailyTaskInputSchema } from "@mypetproj/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { completeDailyTask, deleteDailyTask, uncompleteDailyTask, updateDailyTask } from "./dailyTasks.service";

export const dailyTasksRouter = Router();
dailyTasksRouter.use(requireAuth);

dailyTasksRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = UpdateDailyTaskInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.json(await updateDailyTask(req.params.id, req.userId!, parsed.data));
  }),
);

dailyTasksRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteDailyTask(req.params.id, req.userId!);
    res.status(204).send();
  }),
);

dailyTasksRouter.post(
  "/:id/complete",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = CompleteDailyTaskInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.json(await completeDailyTask(req.params.id, req.userId!, parsed.data.quantity));
  }),
);

dailyTasksRouter.delete(
  "/:id/complete",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await uncompleteDailyTask(req.params.id, req.userId!));
  }),
);
