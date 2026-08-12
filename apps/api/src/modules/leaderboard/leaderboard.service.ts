import type { LeaderboardEntryDto, LeaderboardScope } from "@mypetproj/shared";
import { prisma } from "../../db";
import { addUtcDays, startOfUtcDay } from "../../lib/date";
import { listFriendUserIds } from "../friends/friends.service";

const GLOBAL_LIMIT = 50;
const WINDOW_DAYS = 30;

/** Рейтинг по активности — число отметок выполнения ежедневных задач за последние 30 дней, вместо уровня/XP. */
export async function getLeaderboard(userId: string, scope: LeaderboardScope): Promise<LeaderboardEntryDto[]> {
  const userIds = scope === "friends" ? [...(await listFriendUserIds(userId)), userId] : undefined;
  const rangeStart = addUtcDays(startOfUtcDay(new Date()), -(WINDOW_DAYS - 1));

  const grouped = await prisma.taskCompletion.groupBy({
    by: ["userId"],
    where: { completedOn: { gte: rangeStart }, ...(userIds ? { userId: { in: userIds } } : {}) },
    _count: { _all: true },
  });
  const completionsByUser = new Map(grouped.map((g) => [g.userId, g._count._all]));

  // В "друзьях" показываем всех, включая тех, у кого пока 0 отметок за период;
  // в "общем" рейтинге — только тех, у кого есть хоть какая-то активность.
  const rows =
    scope === "friends" && userIds
      ? userIds.map((id) => ({ userId: id, completions30d: completionsByUser.get(id) ?? 0 }))
      : [...completionsByUser.entries()].map(([id, count]) => ({ userId: id, completions30d: count }));

  rows.sort((a, b) => b.completions30d - a.completions30d);
  const limited = scope === "global" ? rows.slice(0, GLOBAL_LIMIT) : rows;

  const users = await prisma.user.findMany({ where: { id: { in: limited.map((r) => r.userId) } } });
  const userById = new Map(users.map((u) => [u.id, u]));

  return limited.flatMap((row, index) => {
    const user = userById.get(row.userId);
    if (!user) return [];
    const entry: LeaderboardEntryDto = {
      rank: index + 1,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      completions30d: row.completions30d,
      isMe: user.id === userId,
    };
    return [entry];
  });
}
