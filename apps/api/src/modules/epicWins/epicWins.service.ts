import type {
  CreateEpicWinInput,
  EpicActivityDayDto,
  EpicWinDetailDto,
  EpicWinSummaryDto,
  InviteMemberInput,
  UpdateEpicWinInput,
} from "@mypetproj/shared";
import { MAX_EPIC_WIN_MEMBERS } from "@mypetproj/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { addUtcDays, isoDate, startOfUtcDay } from "../../lib/date";
import { assertEpicWinAccess } from "../access";
import { deleteAttachmentsFor } from "../attachments/attachments.service";
import { deleteCommentsFor } from "../comments/comments.service";
import { toQuestDto } from "../quests/quests.service";

const epicWinInclude = (userId: string) =>
  ({
    quests: {
      include: {
        dailyTasks: {
          include: { completions: { where: { userId } } },
          orderBy: { createdAt: "asc" },
        },
        assignedTo: true,
      },
      orderBy: { position: "asc" },
    },
    members: { include: { user: true } },
  }) satisfies Prisma.EpicWinInclude;

type EpicWinWithRelations = Prisma.EpicWinGetPayload<{ include: ReturnType<typeof epicWinInclude> }>;

/** Прогресс по доле завершённых квестов — используется, когда у Эпика не задан числовой показатель цели. */
function computeQuestRatioProgress(quests: { status: string }[]): number {
  if (quests.length === 0) return 0;
  const completed = quests.filter((q) => q.status === "COMPLETED").length;
  return Math.round((completed / quests.length) * 100);
}

/** Последнее введённое количество по ежедневной задаче с tracksEpicMetric=true — "текущее значение" показателя цели. */
function computeMetricCurrentValue(epicWin: EpicWinWithRelations): number | null {
  const trackedTask = epicWin.quests.flatMap((q) => q.dailyTasks).find((t) => t.tracksEpicMetric);
  if (!trackedTask || trackedTask.completions.length === 0) return null;
  const latest = [...trackedTask.completions].sort((a, b) => b.completedOn.getTime() - a.completedOn.getTime())[0];
  return latest.quantity ?? null;
}

/** Прогресс от metricStartValue к metricTargetValue, судя по текущему значению — работает и для роста, и для убывания показателя. */
function computeMetricProgress(start: number, target: number, current: number | null): number {
  if (target === start) return current !== null ? 100 : 0;
  const value = current ?? start;
  const raw = ((value - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

const ACTIVITY_DAYS = 70;

/** GitHub-style тепловая сетка: сколько отметок выполнения по задачам Эпика было в каждый из последних ACTIVITY_DAYS дней. */
function computeActivity(epicWin: EpicWinWithRelations): EpicActivityDayDto[] {
  const dailyTasks = epicWin.quests.flatMap((q) => q.dailyTasks);
  const totalTasks = dailyTasks.length;
  const today = startOfUtcDay(new Date());

  const countByDay = new Map<string, number>();
  for (const task of dailyTasks) {
    for (const completion of task.completions) {
      const key = isoDate(completion.completedOn);
      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    }
  }

  const result: EpicActivityDayDto[] = [];
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i -= 1) {
    const date = isoDate(addUtcDays(today, -i));
    const count = countByDay.get(date) ?? 0;
    result.push({ date, count, ratio: totalTasks > 0 ? Math.min(1, count / totalTasks) : 0 });
  }
  return result;
}

function toSummaryDto(epicWin: EpicWinWithRelations, viewerId: string): EpicWinSummaryDto {
  const hasMetric = epicWin.metricStartValue !== null && epicWin.metricTargetValue !== null;
  const metricCurrentValue = hasMetric ? computeMetricCurrentValue(epicWin) : null;
  const progress = hasMetric
    ? computeMetricProgress(epicWin.metricStartValue!, epicWin.metricTargetValue!, metricCurrentValue)
    : computeQuestRatioProgress(epicWin.quests);

  return {
    id: epicWin.id,
    title: epicWin.title,
    description: epicWin.description,
    deadline: epicWin.deadline?.toISOString() ?? null,
    createdAt: epicWin.createdAt.toISOString(),
    status: epicWin.status,
    progress,
    questCount: epicWin.quests.length,
    memberCount: epicWin.members.length,
    isOwner: epicWin.ownerId === viewerId,
    priority: epicWin.priority,
    quests: epicWin.quests.map((q) => ({
      id: q.id,
      title: q.title,
      status: q.status,
      estimatedDays: q.estimatedDays,
      assignedToUserId: q.assignedToUserId,
      assignedToName: q.assignedTo ? q.assignedTo.displayName || q.assignedTo.email : null,
    })),
    activity: computeActivity(epicWin),
    metricUnit: epicWin.metricUnit,
    metricStartValue: epicWin.metricStartValue,
    metricTargetValue: epicWin.metricTargetValue,
    metricCurrentValue,
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
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
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
      priority: input.priority ?? 0,
      metricUnit: input.metricUnit ?? null,
      metricStartValue: input.metricStartValue ?? null,
      metricTargetValue: input.metricTargetValue ?? null,
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
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.metricUnit !== undefined ? { metricUnit: input.metricUnit } : {}),
      ...(input.metricStartValue !== undefined ? { metricStartValue: input.metricStartValue } : {}),
      ...(input.metricTargetValue !== undefined ? { metricTargetValue: input.metricTargetValue } : {}),
    },
    include: epicWinInclude(userId),
  });

  return toDetailDto(epicWin, userId);
}

export async function deleteEpicWin(epicWinId: string, userId: string): Promise<void> {
  const existing = await assertEpicWinAccess(epicWinId, userId);
  if (existing.ownerId !== userId) throw new AppError(403, "Удалить Epic Win может только владелец");
  await prisma.epicWin.delete({ where: { id: epicWinId } });
  await Promise.all([deleteCommentsFor("EPIC_WIN", epicWinId), deleteAttachmentsFor("EPIC_WIN", epicWinId)]);
}

export async function inviteMember(
  epicWinId: string,
  userId: string,
  input: InviteMemberInput,
): Promise<EpicWinDetailDto> {
  const existing = await assertEpicWinAccess(epicWinId, userId);
  if (existing.ownerId !== userId) throw new AppError(403, "Приглашать может только владелец");

  const memberCount = await prisma.epicWinMember.count({ where: { epicWinId } });
  if (memberCount >= MAX_EPIC_WIN_MEMBERS) {
    throw new AppError(400, `В совместном Эпике может быть не больше ${MAX_EPIC_WIN_MEMBERS} участников`);
  }

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
