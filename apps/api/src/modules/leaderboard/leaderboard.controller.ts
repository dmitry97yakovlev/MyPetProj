import { LeaderboardScopeValues } from "@mypetproj/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { type AuthedRequest, requireAuth } from "../../middleware/requireAuth";
import { getLeaderboard } from "./leaderboard.service";

export const leaderboardRouter = Router();
leaderboardRouter.use(requireAuth);

leaderboardRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const scopeParam = typeof req.query.scope === "string" ? req.query.scope : "global";
    const scope = (LeaderboardScopeValues as readonly string[]).includes(scopeParam) ? scopeParam : "global";
    res.json(await getLeaderboard(req.userId!, scope as (typeof LeaderboardScopeValues)[number]));
  }),
);
