import type { CreateDailyTaskInput, DailyTaskDto, TodayTaskDto, UpdateDailyTaskInput } from "@mypetproj/shared";
import type { DailyTask, TaskCompletion } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { addUtcDays, isoDate, startOfUtcDay } from "../../lib/date";
import { assertDailyTaskAccess, assertQuestAccess } from "../access";
import { grantXp } from "../character/character.service";

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

export function isQuantifiedTask(task: Pick<DailyTask, "unit" | "xpPerUnit">): boolean {
  return Boolean(task.unit && task.xpPerUnit);
}

/** XP за конкретное количество (задачи "по количеству") либо плоская награда задачи. */
function computeTaskXp(task: DailyTask, quantity: number | null | undefined): number {
  if (isQuantifiedTask(task)) {
    return Math.round((quantity ?? 0) * task.xpPerUnit!);
  }
  return task.xpReward;
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
    xpReward: task.xpReward,
    unit: task.unit,
    xpPerUnit: task.xpPerUnit,
    isActive: task.isActive,
    category: task.category,
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
      xpReward: input.xpReward ?? 10,
      category: input.category ?? "MANDATORY",
      unit: input.unit ?? null,
      xpPerUnit: input.xpPerUnit ?? null,
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
      ...(input.xpReward !== undefined ? { xpReward: input.xpReward } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.xpPerUnit !== undefined ? { xpPerUnit: input.xpPerUnit } : {}),
    },
    include: { completions: { where: { userId } } },
  });
  return toDailyTaskDto(task);
}

export async function deleteDailyTask(dailyTaskId: string, userId: string): Promise<void> {
  await assertDailyTaskAccess(dailyTaskId, userId);
  await prisma.dailyTask.delete({ where: { id: dailyTaskId } });
}

/**
 * Отмечает задачу выполненной сегодня.
 *
 * Обычная задача: идемпотентно, плоская награда xpReward один раз в день.
 * Задача "по количеству" (unit + xpPerUnit заданы): quantity обязателен;
 * если за сегодня уже что-то записано и новое количество БОЛЬШЕ — засчитываем
 * только разницу в XP (не весь объём заново). Уменьшить сегодняшнее количество
 * так нельзя — как и с обычными задачами, XP назад не отбираем.
 */
export async function completeDailyTask(
  dailyTaskId: string,
  userId: string,
  quantity?: number,
): Promise<DailyTaskDto> {
  const { dailyTask } = await assertDailyTaskAccess(dailyTaskId, userId);
  const quantified = isQuantifiedTask(dailyTask);

  if (quantified && !(quantity && quantity > 0)) {
    throw new AppError(400, `Укажи количество (${dailyTask.unit}) для этой задачи`);
  }

  const today = startOfUtcDay(new Date());
  const existing = await prisma.taskCompletion.findUnique({
    where: { dailyTaskId_userId_completedOn: { dailyTaskId, userId, completedOn: today } },
  });

  if (!existing) {
    await prisma.taskCompletion.create({
      data: { dailyTaskId, userId, completedOn: today, quantity: quantified ? quantity : null },
    });
    await grantXp(userId, computeTaskXp(dailyTask, quantity));
  } else if (quantified && quantity! > (existing.quantity ?? 0)) {
    const previousXp = computeTaskXp(dailyTask, existing.quantity);
    const newXp = computeTaskXp(dailyTask, quantity);
    await prisma.taskCompletion.update({ where: { id: existing.id }, data: { quantity } });
    await grantXp(userId, newXp - previousXp);
  }
  // Простая задача, уже отмеченная сегодня, или меньшее количество — идемпотентно, без изменений.

  return toDailyTaskDto(await loadWithCompletions(dailyTaskId, userId));
}

/**
 * Все активные ежедневные задачи по всем активным квестам пользователя —
 * для экрана "Сегодня" (группировка по category делается на клиенте).
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
  }));
}

/** Снимает отметку "выполнено сегодня" — на случай, если отметили по ошибке. XP назад не отбираем. */
export async function uncompleteDailyTask(dailyTaskId: string, userId: string): Promise<DailyTaskDto> {
  await assertDailyTaskAccess(dailyTaskId, userId);
  const today = startOfUtcDay(new Date());

  await prisma.taskCompletion.deleteMany({ where: { dailyTaskId, userId, completedOn: today } });

  return toDailyTaskDto(await loadWithCompletions(dailyTaskId, userId));
}
