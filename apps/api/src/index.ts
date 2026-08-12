import cors from "cors";
import express from "express";
import path from "node:path";
import { env } from "./env";
import { coachRouter } from "./modules/aiCoach/aiCoach.controller";
import { authRouter } from "./modules/auth/auth.controller";
import { characterRouter } from "./modules/character/character.controller";
import { dailyTasksRouter } from "./modules/dailyTasks/dailyTasks.controller";
import { epicWinsRouter } from "./modules/epicWins/epicWins.controller";
import { friendsRouter } from "./modules/friends/friends.controller";
import { itemsRouter } from "./modules/items/items.controller";
import { journalRouter } from "./modules/journal/journal.controller";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.controller";
import { questsRouter } from "./modules/quests/quests.controller";
import { timelineRouter } from "./modules/timeline/timeline.controller";
import { meRouter } from "./routes/me";

const app = express();

app.use(cors());
app.use(express.json());
// Голосовые заметки дневника (см. journal.controller.ts) — раздаются статикой отсюда.
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/character", characterRouter);
app.use("/items", itemsRouter);
app.use("/epic-wins", epicWinsRouter);
app.use("/quests", questsRouter);
app.use("/daily-tasks", dailyTasksRouter);
app.use("/friends", friendsRouter);
app.use("/leaderboard", leaderboardRouter);
app.use("/timeline", timelineRouter);
app.use("/coach", coachRouter);
app.use("/journal", journalRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(env.PORT, () => {
  console.log(`API запущен: http://localhost:${env.PORT}`);
});
