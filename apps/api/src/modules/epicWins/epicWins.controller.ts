import {
  CreateEpicWinInputSchema,
  CreateQuestInputSchema,
  InviteMemberInputSchema,
  UpdateEpicWinInputSchema,
} from "@mypetproj/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { createQuest } from "../quests/quests.service";
import {
  createEpicWin,
  deleteEpicWin,
  getEpicWin,
  inviteMember,
  listMyEpicWins,
  updateEpicWin,
} from "./epicWins.service";

export const epicWinsRouter = Router();
epicWinsRouter.use(requireAuth);

epicWinsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await listMyEpicWins(req.userId!));
  }),
);

epicWinsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = CreateEpicWinInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await createEpicWin(req.userId!, parsed.data));
  }),
);

epicWinsRouter.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getEpicWin(req.params.id, req.userId!));
  }),
);

epicWinsRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = UpdateEpicWinInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.json(await updateEpicWin(req.params.id, req.userId!, parsed.data));
  }),
);

epicWinsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteEpicWin(req.params.id, req.userId!);
    res.status(204).send();
  }),
);

epicWinsRouter.post(
  "/:id/members",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = InviteMemberInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await inviteMember(req.params.id, req.userId!, parsed.data));
  }),
);

epicWinsRouter.post(
  "/:id/quests",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = CreateQuestInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await createQuest(req.params.id, req.userId!, parsed.data));
  }),
);
