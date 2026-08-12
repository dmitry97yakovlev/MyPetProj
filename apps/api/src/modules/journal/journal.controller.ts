import { CreateJournalEntryInputSchema, SetMoodInputSchema } from "@mypetproj/shared";
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { createTextEntry, createVoiceEntry, listJournal, setTodayMood } from "./journal.service";

// apps/api/uploads/voice — не коммитим (см. .gitignore), раздаём статикой через /uploads в index.ts.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "voice");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req: AuthedRequest, file, cb) => {
      const ext = path.extname(file.originalname) || ".m4a";
      cb(null, `${req.userId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 МБ хватает с запасом на пару минут голоса
});

export const journalRouter = Router();
journalRouter.use(requireAuth);

journalRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const days = Math.min(60, Math.max(1, Number(req.query.days) || 14));
    res.json(await listJournal(req.userId!, days));
  }),
);

journalRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = CreateJournalEntryInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await createTextEntry(req.userId!, parsed.data.content));
  }),
);

journalRouter.post(
  "/mood",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = SetMoodInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
      return;
    }
    await setTodayMood(req.userId!, parsed.data.score);
    res.status(204).send();
  }),
);

journalRouter.post(
  "/voice",
  upload.single("audio"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Нужен аудиофайл (поле audio)" });
      return;
    }
    const audioUrl = `/uploads/voice/${req.file.filename}`;
    const content = typeof req.body?.content === "string" ? req.body.content : undefined;
    res.status(201).json(await createVoiceEntry(req.userId!, audioUrl, content));
  }),
);
