import type { JournalDayDto, JournalEntryDto } from "@mypetproj/shared";
import type { JournalEntry } from "@prisma/client";
import { prisma } from "../../db";
import { addUtcDays, isoDate, startOfUtcDay } from "../../lib/date";

function toEntryDto(entry: JournalEntry): JournalEntryDto {
  return {
    id: entry.id,
    kind: entry.kind,
    content: entry.content,
    audioUrl: entry.audioUrl,
    entryDate: isoDate(entry.entryDate),
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function createTextEntry(userId: string, content: string): Promise<JournalEntryDto> {
  const entry = await prisma.journalEntry.create({
    data: { userId, kind: "TEXT", content, entryDate: startOfUtcDay(new Date()) },
  });
  return toEntryDto(entry);
}

export async function createVoiceEntry(userId: string, audioUrl: string, content?: string): Promise<JournalEntryDto> {
  const entry = await prisma.journalEntry.create({
    data: { userId, kind: "VOICE", audioUrl, content: content ?? null, entryDate: startOfUtcDay(new Date()) },
  });
  return toEntryDto(entry);
}

/** Отмечает (или перезаписывает) сегодняшнюю самооценку эмоциональной стабильности, 1..10. */
export async function setTodayMood(userId: string, score: number): Promise<void> {
  const date = startOfUtcDay(new Date());
  await prisma.moodEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, score },
    update: { score },
  });
}

/**
 * Лента дневника за последние `days` дней: собственные записи пользователя +
 * автособытия (выполненные за день задачи/квесты/эпики), вычисленные на лету
 * из уже существующих данных — отдельно нигде не хранятся.
 */
export async function listJournal(userId: string, days: number): Promise<JournalDayDto[]> {
  const today = startOfUtcDay(new Date());
  const rangeStart = addUtcDays(today, -(days - 1));
  const epicWinFilter = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };

  const [entries, taskCompletions, quests, epicWins, moods] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId, entryDate: { gte: rangeStart } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.taskCompletion.findMany({
      where: { userId, completedOn: { gte: rangeStart } },
      include: { dailyTask: { include: { quest: true } } },
    }),
    prisma.quest.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: rangeStart }, epicWin: epicWinFilter },
    }),
    prisma.epicWin.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: rangeStart }, ...epicWinFilter },
    }),
    prisma.moodEntry.findMany({ where: { userId, date: { gte: rangeStart } } }),
  ]);

  const byDate = new Map<string, JournalDayDto>();
  for (let i = 0; i < days; i += 1) {
    const date = isoDate(addUtcDays(today, -i));
    byDate.set(date, { date, entries: [], autoEvents: [], moodScore: null });
  }

  for (const mood of moods) {
    const day = byDate.get(isoDate(mood.date));
    if (day) day.moodScore = mood.score;
  }

  for (const entry of entries) {
    byDate.get(isoDate(entry.entryDate))?.entries.push(toEntryDto(entry));
  }
  for (const completion of taskCompletions) {
    byDate.get(isoDate(completion.completedOn))?.autoEvents.push({
      kind: "DAILY_TASK",
      title: completion.dailyTask.title,
      questId: completion.dailyTask.questId,
      epicWinId: completion.dailyTask.quest.epicWinId,
      at: completion.createdAt.toISOString(),
    });
  }
  for (const quest of quests) {
    byDate.get(isoDate(quest.updatedAt))?.autoEvents.push({
      kind: "QUEST",
      title: quest.title,
      questId: quest.id,
      epicWinId: quest.epicWinId,
      at: quest.updatedAt.toISOString(),
    });
  }
  for (const epicWin of epicWins) {
    byDate.get(isoDate(epicWin.updatedAt))?.autoEvents.push({
      kind: "EPIC_WIN",
      title: epicWin.title,
      epicWinId: epicWin.id,
      at: epicWin.updatedAt.toISOString(),
    });
  }

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}
