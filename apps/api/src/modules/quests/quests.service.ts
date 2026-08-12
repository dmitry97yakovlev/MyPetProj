import type { CreateQuestInput, QuestDto, UpdateQuestInput } from "@mypetproj/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { assertEpicWinAccess, assertQuestAccess } from "../access";
import { deleteAttachmentsFor } from "../attachments/attachments.service";
import { deleteCommentsFor } from "../comments/comments.service";
import { toDailyTaskDto } from "../dailyTasks/dailyTasks.service";

const questInclude = (userId: string) =>
  ({
    dailyTasks: {
      include: { completions: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    },
    assignedTo: true,
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
    estimatedDays: quest.estimatedDays,
    assignedToUserId: quest.assignedToUserId,
    assignedToName: quest.assignedTo ? quest.assignedTo.displayName || quest.assignedTo.email : null,
    dailyTasks: quest.dailyTasks.map(toDailyTaskDto),
  };
}

/** Назначить квест можно только тому, кто уже состоит в этом Эпике (владельцу или приглашённому участнику). */
async function assertAssigneeIsMember(epicWinId: string, assigneeId: string) {
  const isMember = await prisma.epicWinMember.findUnique({
    where: { epicWinId_userId: { epicWinId, userId: assigneeId } },
  });
  if (!isMember) throw new AppError(400, "Назначить квест можно только участнику этого Эпика");
}

export async function getQuest(questId: string, userId: string): Promise<QuestDto> {
  await assertQuestAccess(questId, userId);
  const quest = await prisma.quest.findUniqueOrThrow({ where: { id: questId }, include: questInclude(userId) });
  return toQuestDto(quest);
}

export async function createQuest(epicWinId: string, userId: string, input: CreateQuestInput): Promise<QuestDto> {
  await assertEpicWinAccess(epicWinId, userId);
  if (input.assignedToUserId) await assertAssigneeIsMember(epicWinId, input.assignedToUserId);
  const position = await prisma.quest.count({ where: { epicWinId } });

  const quest = await prisma.quest.create({
    data: {
      epicWinId,
      title: input.title,
      description: input.description ?? null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      estimatedDays: input.estimatedDays ?? 1,
      assignedToUserId: input.assignedToUserId ?? null,
      position,
    },
    include: questInclude(userId),
  });
  return toQuestDto(quest);
}

export async function updateQuest(questId: string, userId: string, input: UpdateQuestInput): Promise<QuestDto> {
  const existing = await assertQuestAccess(questId, userId);
  if (input.assignedToUserId) await assertAssigneeIsMember(existing.epicWinId, input.assignedToUserId);

  const quest = await prisma.quest.update({
    where: { id: questId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}),
      ...(input.estimatedDays !== undefined ? { estimatedDays: input.estimatedDays } : {}),
      ...(input.assignedToUserId !== undefined ? { assignedToUserId: input.assignedToUserId } : {}),
    },
    include: questInclude(userId),
  });
  return toQuestDto(quest);
}

export async function deleteQuest(questId: string, userId: string): Promise<void> {
  await assertQuestAccess(questId, userId);
  await prisma.quest.delete({ where: { id: questId } });
  await Promise.all([deleteCommentsFor("QUEST", questId), deleteAttachmentsFor("QUEST", questId)]);
}

export async function completeQuest(questId: string, userId: string): Promise<QuestDto> {
  const quest = await assertQuestAccess(questId, userId);
  if (quest.status !== "ACTIVE") throw new AppError(400, "Квест уже завершён или провален");

  const updated = await prisma.quest.update({
    where: { id: questId },
    data: { status: "COMPLETED" },
    include: questInclude(userId),
  });
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
  return toQuestDto(updated);
}
