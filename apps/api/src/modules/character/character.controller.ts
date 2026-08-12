import { SetAvatarInputSchema } from "@mypetproj/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { equipItem, getCharacterDto, setAvatarIcon, unequipItem } from "./character.service";

export const characterRouter = Router();
characterRouter.use(requireAuth);

characterRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getCharacterDto(req.userId!));
  }),
);

characterRouter.post(
  "/avatar",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = SetAvatarInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.json(await setAvatarIcon(req.userId!, parsed.data.icon));
  }),
);

characterRouter.post(
  "/inventory/:id/equip",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await equipItem(req.userId!, req.params.id));
  }),
);

characterRouter.post(
  "/inventory/:id/unequip",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await unequipItem(req.userId!, req.params.id));
  }),
);
