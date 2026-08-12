import type {
  CreateEpicWinInput,
  EpicWinDetailDto,
  EpicWinSummaryDto,
  InviteMemberInput,
  UpdateEpicWinInput,
} from "@mypetproj/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { assertEpicWinAccess } from "../access";
import { grantLevelBonus } from "../character/character.service";
import { toQuestDto } from "../quests/quests.service";

const epicWinInclude = (userId: string) =>
  ({
    quests: {
      include: {
        dailyTasks: {
          include: { completions: { where: { userId } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { position: "asc" },
    },
    members: { include: { user: true } },
  }) satisfies Prisma.EpicWinInclude;

type EpicWinWithRelations = Prisma.EpicWinGetPayload<{ include: ReturnType<typeof epicWinInclude> }>;

function computeProgress(quests: { status: string }[]): number {
  if (quests.length === 0) return 0;
  const completed = quests.filter((q) => q.status === "COMPLETED").length;
  return Math.round((completed / quests.length) * 100);
}

function toSummaryDto(epicWin: EpicWinWithRelations, viewerId: string): EpicWinSummaryDto {
  return {
    id: epicWin.id,
    title: epicWin.title,
    description: epicWin.description,
    deadline: epicWin.deadline?.toISOString() ?? null,
    status: epicWin.status,
    progress: computeProgress(epicWin.quests),
    questCount: epicWin.quests.length,
    memberCount: epicWin.members.length,
    isOwner: epicWin.ownerId === viewerId,
    quests: epicWin.quests.map((q) => ({
      id: q.id,
      title: q.title,
      status: q.status,
      estimatedDays: q.estimatedDays,
    })),
  };
}

function toDetailDto(epicWin: EpicWinWithRelations, viewerId: string): EpicWinDetailDto {
  return {
    ...toSummaryDto(epicWin, viewerId),
    members: epicWin.members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      displayName: m.user.displayName,
      role: m.role,
    })),
    quests: epicWin.quests.map(toQuestDto),
  };
}

export async function listMyEpicWins(userId: string): Promise<EpicWinSummaryDto[]> {
  const epicWins = await prisma.epicWin.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    include: epicWinInclude(userId),
    orderBy: { createdAt: "desc" },
  });
  return epicWins.map((e) => toSummaryDto(e, userId));
}

export async function createEpicWin(userId: string, input: CreateEpicWinInput): Promise<EpicWinDetailDto> {
  const epicWin = await prisma.epicWin.create({
    data: {
      ownerId: userId,
      title: input.title,
      description: input.description ?? null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      members: { create: { userId, role: "OWNER" } },
    },
    include: epicWinInclude(userId),
  });
  return toDetailDto(epicWin, userId);
}

export async function getEpicWin(epicWinId: string, userId: string): Promise<EpicWinDetailDto> {
  await assertEpicWinAccess(epicWinId, userId);
  const epicWin = await prisma.epicWin.findUniqueOrThrow({
    where: { id: epicWinId },
    include: epicWinInclude(userId),
  });
  return toDetailDto(epicWin, userId);
}

export async function updateEpicWin(
  epicWinId: string,
  userId: string,
  input: UpdateEpicWinInput,
): Promise<EpicWinDetailDto> {
  const existing = await assertEpicWinAccess(epicWinId, userId);
  if (existing.ownerId !== userId) throw new AppError(403, "Изменять Epic Win может только владелец");

  const epicWin = await prisma.epicWin.update({
    where: { id: epicWinId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: epicWinInclude(userId),
  });

  // Epic Win — большая цель: её завершение сразу поднимает уровень персонажа
  // (а не просто добавляет XP), причём всем участникам совместной цели.
  if (input.status === "COMPLETED" && existing.status !== "COMPLETED") {
    await Promise.all(epicWin.members.map((m) => grantLevelBonus(m.userId, 1)));
  }

  return toDetailDto(epicWin, userId);
}

export async function deleteEpicWin(epicWinId: string, userId: string): Promise<void> {
  const existing = await assertEpicWinAccess(epicWinId, userId);
  if (existing.ownerId !== userId) throw new AppError(403, "Удалить Epic Win может только владелец");
  await prisma.epicWin.delete({ where: { id: epicWinId } });
}

export async function inviteMember(
  epicWinId: string,
  userId: string,
  input: InviteMemberInput,
): Promise<EpicWinDetailDto> {
  const existing = await assertEpicWinAccess(epicWinId, userId);
  if (existing.ownerId !== userId) throw new AppError(403, "Приглашать может только владелец");

  const invitee = await prisma.user.findUnique({ where: { email: input.email } });
  if (!invitee) {
    throw new AppError(404, "Пользователь с таким email не зарегистрирован в приложении");
  }

  await prisma.epicWinMember.upsert({
    where: { epicWinId_userId: { epicWinId, userId: invitee.id } },
    create: { epicWinId, userId: invitee.id, role: "MEMBER" },
    update: {},
  });

  return getEpicWin(epicWinId, userId);
}
