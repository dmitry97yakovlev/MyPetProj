import type { AICoachContext, AICoachService } from "./aiCoach.types";

/**
 * Заглушка без реального ИИ — набор правил по состоянию персонажа и квестов.
 * Ничего не стоит и не требует внешнего API-ключа. Не настоящий AI-совет,
 * а рабочий каркас с тем же интерфейсом, что будет у реальной LLM-реализации.
 */
export class RuleBasedAICoachService implements AICoachService {
  async getTip(context: AICoachContext): Promise<string> {
    const candidates = this.pickCandidates(context);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private pickCandidates(context: AICoachContext): string[] {
    const tips: string[] = [];

    if (context.hasOverdueQuest) {
      tips.push(
        "Есть просроченные квесты. Можно сдвинуть дедлайн или разбить квест на более мелкие шаги — так проще вернуться в колею.",
      );
    }
    if (context.longestActiveStreak >= 7) {
      tips.push(
        `Стрик ${context.longestActiveStreak} дней подряд — серьёзный результат. Не переусердствуй, отдых тоже часть системы.`,
      );
    }
    if (context.activeQuestCount === 0) {
      tips.push("Активных квестов нет. Разбей свою Epic Win на один конкретный квест на ближайшую неделю.");
    }
    if (context.activeQuestCount > 5) {
      tips.push("Много активных квестов одновременно — легко распылиться. Выбери 1–2 приоритетных на эту неделю.");
    }

    if (tips.length === 0) {
      tips.push(
        "Всё сбалансировано. Хороший момент, чтобы заглянуть в таймлайн и убедиться, что дедлайны реалистичны.",
        "Маленький ежедневный шаг лучше редкого большого рывка — так и задуман прогресс здесь.",
      );
    }

    return tips;
  }
}
