import { Router } from "express";
import { prisma } from "../db";
import { type AuthedRequest, requireAuth } from "../middleware/requireAuth";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({ id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin });
  } catch (err) {
    next(err);
  }
});
