import type { CreateQuestInput, QuestDto, UpdateQuestInput } from "@mypetproj/shared";
import type { Prisma, Quest } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { assertEpicWinAccess, assertQuestAccess } from "../access";
import { applyDamage, awardQuestItem, grantXp } from "../character/character.service";
import { computeStreak, toDailyTaskDto } from "../dailyTasks/dailyTasks.service";

const questInclude = (userId: string) =>
  ({
    dailyTasks: {
      include: { completions: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    },
  }) satisfies Prisma.QuestInclude;

export type QuestWithTasks = Prisma.QuestGetPayload<{ include: ReturnType<typeof questInclude> }>;

export function toQuestDto(quest: QuestWithTasks): QuestDto {
  return {
    id: quest.id,
    epicWinId: quest.epicWinId,
    title: quest.title,
    description: quest.description,
    deadline: quest.deadline?.toISOString() ?? null,
    status: quest.status,
    xpReward: quest.xpReward,
    estimatedDays: quest.estimatedDays,
    dailyTasks: quest.dailyTasks.map(toDailyTaskDto),
  };
}

export async function getQuest(questId: string, userId: string): Promise<QuestDto> {
  await assertQuestAccess(questId, userId);
  const quest = await prisma.quest.findUniqueOrThrow({ where: { id: questId }, include: questInclude(userId) });
  return toQuestDto(quest);
}

export async function createQuest(epicWinId: string, userId: string, input: CreateQuestInput): Promise<QuestDto> {
  await assertEpicWinAccess(epicWinId, userId);
  const position = await prisma.quest.count({ where: { epicWinId } });

  const quest = await prisma.quest.create({
    data: {
      epicWinId,
      title: input.title,
      description: input.description ?? null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      xpReward: input.xpReward ?? 50,
      estimatedDays: input.estimatedDays ?? 1,
      position,
    },
    include: questInclude(userId),
  });
  return toQuestDto(quest);
}

export async function updateQuest(questId: string, userId: string, input: UpdateQuestInput): Promise<QuestDto> {
  await assertQuestAccess(questId, userId);
  const quest = await prisma.quest.update({
    where: { id: questId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}),
      ...(input.xpReward !== undefined ? { xpReward: input.xpReward } : {}),
      ...(input.estimatedDays !== undefined ? { estimatedDays: input.estimatedDays } : {}),
    },
    include: questInclude(userId),
  });
  return toQuestDto(quest);
}

export async function deleteQuest(questId: string, userId: string): Promise<void> {
  await assertQuestAccess(questId, userId);
  await prisma.quest.delete({ where: { id: questId } });
}

const QUEST_FAIL_DAMAGE = 20;

/**
 * "Качество" выполнения квеста (0..1) — определяет редкость предмета,
 * который выпадет за его завершение (см. rarityWeights в character.service.ts):
 * укладка в дедлайн даёт основной вклад, стабильность выполнения ежедневных
 * задач внутри квеста (средний стрик, до 7 дней) — второй. Без дедлайна и
 * без ежедневных задач — нейтральные 0.5.
 */
async function computeQuestPerformanceScore(quest: Pick<Quest, "id" | "deadline">, userId: string): Promise<number> {
  let score = 0.5;
  if (quest.deadline) {
    score = quest.deadline.getTime() >= Date.now() ? 0.85 : 0.15;
  }

  const dailyTasks = await prisma.dailyTask.findMany({
    where: { questId: quest.id },
    include: { completions: { where: { userId } } },
  });
  if (dailyTasks.length > 0) {
    const streakScores = dailyTasks.map((t) => Math.min(computeStreak(t.completions).streak, 7) / 7);
    const avgStreak = streakScores.reduce((a, b) => a + b, 0) / streakScores.length;
    score = (score + avgStreak) / 2;
  }

  return score;
}

export async function completeQuest(questId: string, userId: string): Promise<QuestDto> {
  const quest = await assertQuestAccess(questId, userId);
  if (quest.status !== "ACTIVE") throw new AppError(400, "Квест уже завершён или провален");

  const performanceScore = await computeQuestPerformanceScore(quest, userId);

  const updated = await prisma.quest.update({
    where: { id: questId },
    data: { status: "COMPLETED" },
    include: questInclude(userId),
  });
  await grantXp(userId, quest.xpReward);
  // Каждый завершённый квест сразу выдаёт предмет экипировки — редкость зависит от качества выполнения.
  await awardQuestItem(userId, performanceScore);
  return toQuestDto(updated);
}

export async function failQuest(questId: string, userId: string): Promise<QuestDto> {
  const quest = await assertQuestAccess(questId, userId);
  if (quest.status !== "ACTIVE") throw new AppError(400, "Квест уже завершён или провален");

  const updated = await prisma.quest.update({
    where: { id: questId },
    data: { status: "FAILED" },
    include: questInclude(userId),
  });
  await applyDamage(userId, QUEST_FAIL_DAMAGE);
  return toQuestDto(updated);
}
