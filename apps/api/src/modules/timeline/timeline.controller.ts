import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { listTimeline } from "./timeline.service";

export const timelineRouter = Router();
timelineRouter.use(requireAuth);

timelineRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await listTimeline(req.userId!));
  }),
);
