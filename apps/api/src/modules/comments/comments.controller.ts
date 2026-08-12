import { CreateCommentInputSchema, EntityTypeValues } from "@mypetproj/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { createComment, deleteComment, listComments } from "./comments.service";

const ListQuerySchema = z.object({
  targetType: z.enum(EntityTypeValues),
  targetId: z.string().uuid(),
});

export const commentsRouter = Router();
commentsRouter.use(requireAuth);

commentsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные параметры", details: parsed.error.flatten() });
      return;
    }
    res.json(await listComments(parsed.data.targetType, parsed.data.targetId, req.userId!));
  }),
);

commentsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = CreateCommentInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    const { targetType, targetId, body } = parsed.data;
    res.status(201).json(await createComment(targetType, targetId, req.userId!, body));
  }),
);

commentsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteComment(req.params.id, req.userId!);
    res.status(204).send();
  }),
);
