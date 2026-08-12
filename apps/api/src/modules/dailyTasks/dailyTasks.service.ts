import type { CreateDailyTaskInput, DailyTaskDto, TodayTaskDto, UpdateDailyTaskInput } from "@mypetproj/shared";
import type { DailyTask, TaskCompletion } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { addUtcDays, isoDate, startOfUtcDay } from "../../lib/date";
import { assertDailyTaskAccess, assertQuestAccess } from "../access";
import { deleteAttachmentsFor } from "../attachments/attachments.service";
import { deleteCommentsFor } from "../comments/comments.service";

export type DailyTaskWithCompletions = DailyTask & { completions: TaskCompletion[] };

/**
 * Стрик = число дней подряд с выполнением, считая от сегодня (если сегодня уже
 * отмечено) либо от вчера (если сегодня ещё не отмечено, но вчера — да, чтобы
 * стрик не "сгорал" визуально до конца дня). Если и вчера пропущен — 0.
 */
export function computeStreak(completions: { completedOn: Date }[]): {
  completedToday: boolean;
  streak: number;
} {
  const days = new Set(completions.map((c) => isoDate(c.completedOn)));
  const today = startOfUtcDay(new Date());
  const completedToday = days.has(isoDate(today));

  let cursor = completedToday ? today : addUtcDays(today, -1);
  if (!days.has(isoDate(cursor))) return { completedToday, streak: 0 };

  let streak = 0;
  while (days.has(isoDate(cursor))) {
    streak += 1;
    cursor = addUtcDays(cursor, -1);
  }
  return { completedToday, streak };
}

export function isQuantifiedTask(task: Pick<DailyTask, "unit">): boolean {
  return Boolean(task.unit);
}

/** Отметки за последние 7 календарных дней (UTC), от самого старого к сегодняшнему — для недельной сетки в UI. */
function computeLast7Days(completions: { completedOn: Date }[]): boolean[] {
  const days = new Set(completions.map((c) => isoDate(c.completedOn)));
  const today = startOfUtcDay(new Date());
  const result: boolean[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    result.push(days.has(isoDate(addUtcDays(today, -i))));
  }
  return result;
}

export function toDailyTaskDto(task: DailyTaskWithCompletions): DailyTaskDto {
  const { completedToday, streak } = computeStreak(task.completions);
  const todayIso = isoDate(startOfUtcDay(new Date()));
  const todayCompletion = task.completions.find((c) => isoDate(c.completedOn) === todayIso);

  return {
    id: task.id,
    questId: task.questId,
    title: task.title,
    description: task.description,
    isActive: task.isActive,
    category: task.category,
    unit: task.unit,
    tracksEpicMetric: task.tracksEpicMetric,
    completedToday,
    todayQuantity: todayCompletion?.quantity ?? null,
    streak,
    last7Days: computeLast7Days(task.completions),
    createdAt: task.createdAt.toISOString(),
  };
}

async function loadWithCompletions(dailyTaskId: string, userId: string): Promise<DailyTaskWithCompletions> {
  return prisma.dailyTask.findUniqueOrThrow({
    where: { id: dailyTaskId },
    include: { completions: { where: { userId } } },
  });
}

export async function getDailyTask(dailyTaskId: string, userId: string): Promise<DailyTaskDto> {
  await assertDailyTaskAccess(dailyTaskId, userId);
  return toDailyTaskDto(await loadWithCompletions(dailyTaskId, userId));
}

export async function createDailyTask(
  questId: string,
  userId: string,
  input: CreateDailyTaskInput,
): Promise<DailyTaskDto> {
  await assertQuestAccess(questId, userId);
  const task = await prisma.dailyTask.create({
    data: {
      questId,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? "MANDATORY",
      unit: input.unit ?? null,
      tracksEpicMetric: input.tracksEpicMetric ?? false,
    },
    include: { completions: { where: { userId } } },
  });
  return toDailyTaskDto(task);
}

export async function updateDailyTask(
  dailyTaskId: string,
  userId: string,
  input: UpdateDailyTaskInput,
): Promise<DailyTaskDto> {
  await assertDailyTaskAccess(dailyTaskId, userId);
  const task = await prisma.dailyTask.update({
    where: { id: dailyTaskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.tracksEpicMetric !== undefined ? { tracksEpicMetric: input.tracksEpicMetric } : {}),
    },
    include: { completions: { where: { userId } } },
  });
  return toDailyTaskDto(task);
}

export async function deleteDailyTask(dailyTaskId: string, userId: string): Promise<void> {
  await assertDailyTaskAccess(dailyTaskId, userId);
  await prisma.dailyTask.delete({ where: { id: dailyTaskId } });
  await Promise.all([deleteCommentsFor("DAILY_TASK", dailyTaskId), deleteAttachmentsFor("DAILY_TASK", dailyTaskId)]);
}

/**
 * Разбирает необязательную дату (YYYY-MM-DD) из недельной сетки last7Days в
 * конкретный UTC-день; по умолчанию — сегодня. Ограничено тем же окном, что
 * и сама сетка (последние 7 дней, не в будущем) — так что задним числом
 * старше недели или наперёд отметить нельзя.
 */
function resolveTargetDay(dateInput: string | undefined): Date {
  const today = startOfUtcDay(new Date());
  if (!dateInput) return today;

  const parsed = startOfUtcDay(new Date(`${dateInput}T00:00:00.000Z`));
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, "Некорректная дата");
  }
  if (parsed.getTime() > today.getTime()) {
    throw new AppError(400, "Нельзя отмечать выполнение будущим днём");
  }
  if (parsed.getTime() < addUtcDays(today, -6).getTime()) {
    throw new AppError(400, "Можно отмечать только последние 7 дней");
  }
  return parsed;
}

/**
 * Отмечает задачу выполненной за конкретный день (по умолчанию — сегодня;
 * см. resolveTargetDay). Так можно кликнуть по ячейке недельной сетки
 * (last7Days) за любой из последних 7 дней, а не только за сегодня.
 *
 * Обычная задача: идемпотентная отметка-чекбокс. Задача "по количеству"
 * (unit задан): quantity обязателен и просто перезаписывает отметку за этот
 * день (например, отметка текущего веса) — если новое значение меньше
 * прежнего, оно всё равно заменяет старое (в отличие от прежней XP-логики
 * здесь не нужно защищаться от "уменьшения счётчика").
 */
export async function completeDailyTask(
  dailyTaskId: string,
  userId: string,
  quantity?: number,
  date?: string,
): Promise<DailyTaskDto> {
  const { dailyTask } = await assertDailyTaskAccess(dailyTaskId, userId);
  const quantified = isQuantifiedTask(dailyTask);

  if (quantified && !(quantity && quantity > 0)) {
    throw new AppError(400, `Укажи количество (${dailyTask.unit}) для этой задачи`);
  }

  const targetDay = resolveTargetDay(date);
  const existing = await prisma.taskCompletion.findUnique({
    where: { dailyTaskId_userId_completedOn: { dailyTaskId, userId, completedOn: targetDay } },
  });

  if (!existing) {
    await prisma.taskCompletion.create({
      data: { dailyTaskId, userId, completedOn: targetDay, quantity: quantified ? quantity : null },
    });
  } else if (quantified) {
    await prisma.taskCompletion.update({ where: { id: existing.id }, data: { quantity } });
  }
  // Простая задача, уже отмеченная за этот день — идемпотентно, без изменений.

  return toDailyTaskDto(await loadWithCompletions(dailyTaskId, userId));
}

/**
 * Все активные ежедневные задачи по всем активным квестам пользователя —
 * для экрана "Сегодня" (группировка по category делается на клиенте, вес в
 * дневной результативности — по epicPriority).
 */
export async function listTodayTasks(userId: string): Promise<TodayTaskDto[]> {
  const tasks = await prisma.dailyTask.findMany({
    where: {
      isActive: true,
      quest: {
        status: "ACTIVE",
        epicWin: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      },
    },
    include: {
      completions: { where: { userId } },
      quest: { include: { epicWin: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return tasks.map((task) => ({
    ...toDailyTaskDto(task),
    questTitle: task.quest.title,
    epicWinId: task.quest.epicWinId,
    epicWinTitle: task.quest.epicWin.title,
    epicPriority: task.quest.epicWin.priority,
  }));
}

/** Снимает отметку за конкретный день (по умолчанию — сегодня) — на случай, если отметили по ошибке. */
export async function uncompleteDailyTask(dailyTaskId: string, userId: string, date?: string): Promise<DailyTaskDto> {
  await assertDailyTaskAccess(dailyTaskId, userId);
  const targetDay = resolveTargetDay(date);

  await prisma.taskCompletion.deleteMany({ where: { dailyTaskId, userId, completedOn: targetDay } });

  return toDailyTaskDto(await loadWithCompletions(dailyTaskId, userId));
}
