import type { LeaderboardEntryDto, LeaderboardScope } from "@mypetproj/shared";
import { prisma } from "../../db";
import { listFriendUserIds } from "../friends/friends.service";

const GLOBAL_LIMIT = 50;

export async function getLeaderboard(userId: string, scope: LeaderboardScope): Promise<LeaderboardEntryDto[]> {
  const userIds =
    scope === "friends" ? [...(await listFriendUserIds(userId)), userId] : undefined;

  const characters = await prisma.character.findMany({
    where: userIds ? { userId: { in: userIds } } : undefined,
    include: { user: true },
    orderBy: [{ level: "desc" }, { xp: "desc" }],
    take: scope === "global" ? GLOBAL_LIMIT : undefined,
  });

  return characters.map((c, index) => ({
    rank: index + 1,
    userId: c.userId,
    email: c.user.email,
    displayName: c.user.displayName,
    level: c.level,
    xp: c.xp,
    isMe: c.userId === userId,
  }));
}
