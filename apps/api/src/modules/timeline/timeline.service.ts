import type { TimelineEntryDto } from "@mypetproj/shared";
import { prisma } from "../../db";

/**
 * Единый таймлайн: квесты И сами Epic Win с дедлайном, из всех Epic Win, где
 * я владелец или участник, отсортированные по дате по возрастанию. `kind`
 * различает тип записи на клиенте (иконка/ссылка).
 */
export async function listTimeline(userId: string): Promise<TimelineEntryDto[]> {
  const epicWinFilter = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };

  const [quests, epicWins] = await Promise.all([
    prisma.quest.findMany({
      where: { deadline: { not: null }, epicWin: epicWinFilter },
      include: { epicWin: true },
    }),
    prisma.epicWin.findMany({
      where: { deadline: { not: null }, ...epicWinFilter },
    }),
  ]);

  const entries: TimelineEntryDto[] = [
    ...quests.map(
      (q): TimelineEntryDto => ({
        kind: "QUEST",
        id: q.id,
        title: q.title,
        epicWinId: q.epicWinId,
        epicWinTitle: q.epicWin.title,
        deadline: q.deadline!.toISOString(),
        status: q.status,
      }),
    ),
    ...epicWins.map(
      (e): TimelineEntryDto => ({
        kind: "EPIC_WIN",
        id: e.id,
        title: e.title,
        epicWinId: e.id,
        epicWinTitle: e.title,
        deadline: e.deadline!.toISOString(),
        status: e.status,
      }),
    ),
  ];

  entries.sort((a, b) => a.deadline.localeCompare(b.deadline));
  return entries;
}
