import type { TimelineEntryDto } from "@mypetproj/shared";
import { prisma } from "../../db";

/** Квесты с дедлайном из всех Epic Win, где я владелец или участник, по возрастанию даты. */
export async function listTimeline(userId: string): Promise<TimelineEntryDto[]> {
  const quests = await prisma.quest.findMany({
    where: {
      deadline: { not: null },
      epicWin: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    },
    include: { epicWin: true },
    orderBy: { deadline: "asc" },
  });

  return quests.map((q) => ({
    questId: q.id,
    questTitle: q.title,
    epicWinId: q.epicWinId,
    epicWinTitle: q.epicWin.title,
    deadline: q.deadline!.toISOString(),
    status: q.status,
  }));
}
