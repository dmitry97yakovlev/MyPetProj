import { RespondFriendRequestInputSchema, SendFriendRequestInputSchema } from "@mypetproj/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { listFriendRequests, listFriends, respondToFriendRequest, sendFriendRequest } from "./friends.service";

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

friendsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await listFriends(req.userId!));
  }),
);

friendsRouter.get(
  "/requests",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await listFriendRequests(req.userId!));
  }),
);

friendsRouter.post(
  "/requests",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = SendFriendRequestInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await sendFriendRequest(req.userId!, parsed.data));
  }),
);

friendsRouter.post(
  "/requests/:id/respond",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = RespondFriendRequestInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    await respondToFriendRequest(req.params.id, req.userId!, parsed.data.accept);
    res.status(204).send();
  }),
);
