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
