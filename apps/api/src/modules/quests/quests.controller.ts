import { CreateDailyTaskInputSchema, UpdateQuestInputSchema } from "@mypetproj/shared";
import { Router } from "express";
import { createDailyTask } from "../dailyTasks/dailyTasks.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { completeQuest, deleteQuest, failQuest, getQuest, updateQuest } from "./quests.service";

export const questsRouter = Router();
questsRouter.use(requireAuth);

questsRouter.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getQuest(req.params.id, req.userId!));
  }),
);

questsRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = UpdateQuestInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.json(await updateQuest(req.params.id, req.userId!, parsed.data));
  }),
);

questsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteQuest(req.params.id, req.userId!);
    res.status(204).send();
  }),
);

questsRouter.post(
  "/:id/complete",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await completeQuest(req.params.id, req.userId!));
  }),
);

questsRouter.post(
  "/:id/fail",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await failQuest(req.params.id, req.userId!));
  }),
);

questsRouter.post(
  "/:questId/daily-tasks",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = CreateDailyTaskInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await createDailyTask(req.params.questId, req.userId!, parsed.data));
  }),
);
