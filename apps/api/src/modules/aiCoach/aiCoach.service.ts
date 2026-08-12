import { prisma } from "../../db";
import { getOrCreateCharacter } from "../character/character.service";
import { computeStreak } from "../dailyTasks/dailyTasks.service";
import { RuleBasedAICoachService } from "./aiCoach.stub";
import type { AICoachService } from "./aiCoach.types";

// Единственное место, где нужно поменять реализацию на реальный LLM-провайдер.
const aiCoachService: AICoachService = new RuleBasedAICoachService();

export async function getDailyTip(userId: string): Promise<string> {
  const character = await getOrCreateCharacter(userId);
  const myEpicWinFilter = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };

  const [activeQuestCount, overdueQuestCount, tasks] = await Promise.all([
    prisma.quest.count({ where: { status: "ACTIVE", epicWin: myEpicWinFilter } }),
    prisma.quest.count({
      where: { status: "ACTIVE", deadline: { lt: new Date() }, epicWin: myEpicWinFilter },
    }),
    prisma.dailyTask.findMany({
      where: { isActive: true, quest: { epicWin: myEpicWinFilter } },
      include: { completions: { where: { userId } } },
    }),
  ]);

  const longestActiveStreak = tasks.reduce((max, task) => Math.max(max, computeStreak(task.completions).streak), 0);

  return aiCoachService.getTip({
    characterLevel: character.level,
    characterHp: character.hp,
    characterMaxHp: character.maxHp,
    activeQuestCount,
    longestActiveStreak,
    hasOverdueQuest: overdueQuestCount > 0,
  });
}
