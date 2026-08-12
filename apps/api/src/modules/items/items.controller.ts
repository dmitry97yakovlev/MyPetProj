import type { CatalogItemDto } from "@mypetproj/shared";
import { Router } from "express";
import { prisma } from "../../db";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";

export const itemsRouter = Router();
itemsRouter.use(requireAuth);

/** Полный каталог экипировки с пометкой, чем из этого уже владеет пользователь (в т.ч. ещё не выпавшее — для витрины). */
itemsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const [items, owned] = await Promise.all([
      prisma.item.findMany({ orderBy: [{ slot: "asc" }, { rarity: "asc" }] }),
      prisma.inventoryItem.findMany({ where: { userId: req.userId! } }),
    ]);
    const ownedByItemId = new Map(owned.map((o) => [o.itemId, o]));

    const dto: CatalogItemDto[] = items.map((item) => {
      const entry = ownedByItemId.get(item.id);
      return {
        id: item.id,
        name: item.name,
        slot: item.slot,
        rarity: item.rarity,
        icon: item.icon,
        bonusHp: item.bonusHp,
        owned: Boolean(entry),
        equipped: entry?.equipped ?? false,
      };
    });

    res.json(dto);
  }),
);
