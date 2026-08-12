import { EntityTypeValues } from "@mypetproj/shared";
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { createAttachment, deleteAttachment, listAttachments } from "./attachments.service";

// apps/api/uploads/attachments — не коммитим (см. .gitignore), раздаём статикой через /uploads в index.ts.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "attachments");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req: AuthedRequest, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${req.userId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 МБ
});

const ListQuerySchema = z.object({
  targetType: z.enum(EntityTypeValues),
  targetId: z.string().uuid(),
});

const UploadBodySchema = z.object({
  targetType: z.enum(EntityTypeValues),
  targetId: z.string().uuid(),
});

export const attachmentsRouter = Router();
attachmentsRouter.use(requireAuth);

attachmentsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные параметры", details: parsed.error.flatten() });
      return;
    }
    res.json(await listAttachments(parsed.data.targetType, parsed.data.targetId, req.userId!));
  }),
);

attachmentsRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = UploadBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Нужен файл (поле file)" });
      return;
    }
    const { targetType, targetId } = parsed.data;
    res.status(201).json(await createAttachment(targetType, targetId, req.userId!, req.file));
  }),
);

attachmentsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteAttachment(req.params.id, req.userId!);
    res.status(204).send();
  }),
);
