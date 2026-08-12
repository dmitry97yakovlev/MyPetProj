/**
 * Единая точка проверки доступа к иерархии Epic Win → Quest → DailyTask.
 * Модули epicWins/quests/dailyTasks зависят от этого файла, но не друг от друга
 * "вверх" по иерархии — так же нет циклических импортов.
 */
import { prisma } from "../db";
import { AppError } from "../errors";

export async function assertEpicWinAccess(epicWinId: string, userId: string) {
  const epicWin = await prisma.epicWin.findUnique({
    where: { id: epicWinId },
    include: { members: true },
  });
  if (!epicWin) throw new AppError(404, "Epic Win не найдена");

  const isMember = epicWin.ownerId === userId || epicWin.members.some((m) => m.userId === userId);
  if (!isMember) throw new AppError(403, "Нет доступа к этой Epic Win");

  return epicWin;
}

export async function assertQuestAccess(questId: string, userId: string) {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) throw new AppError(404, "Квест не найден");
  await assertEpicWinAccess(quest.epicWinId, userId);
  return quest;
}

export async function assertDailyTaskAccess(dailyTaskId: string, userId: string) {
  const dailyTask = await prisma.dailyTask.findUnique({ where: { id: dailyTaskId } });
  if (!dailyTask) throw new AppError(404, "Задача не найдена");
  const quest = await assertQuestAccess(dailyTask.questId, userId);
  return { dailyTask, quest };
}

/**
 * Единая проверка доступа для комментариев/вложений — они полиморфны по
 * (targetType, targetId), см. схему Comment/Attachment, поэтому им нужен один
 * диспетчер вместо трёх отдельных проверок в каждом контроллере.
 */
export async function assertTargetAccess(
  targetType: "EPIC_WIN" | "QUEST" | "DAILY_TASK",
  targetId: string,
  userId: string,
): Promise<void> {
  if (targetType === "EPIC_WIN") {
    await assertEpicWinAccess(targetId, userId);
  } else if (targetType === "QUEST") {
    await assertQuestAccess(targetId, userId);
  } else {
    await assertDailyTaskAccess(targetId, userId);
  }
}
