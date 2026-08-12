import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { getDailyTip } from "./aiCoach.service";

export const coachRouter = Router();
coachRouter.use(requireAuth);

coachRouter.get(
  "/tip",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ tip: await getDailyTip(req.userId!) });
  }),
);
