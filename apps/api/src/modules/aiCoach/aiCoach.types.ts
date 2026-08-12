export interface AICoachContext {
  activeQuestCount: number;
  longestActiveStreak: number;
  hasOverdueQuest: boolean;
}

/**
 * Точка расширения под будущего ИИ-провайдера (см. CLAUDE.md, раздел про AI-коуча).
 * Сегодня единственная реализация — RuleBasedAICoachService (без вызова внешнего API).
 * Чтобы подключить реальную LLM (DeepSeek/Gemini/Groq/Claude), реализуй этот интерфейс
 * и замени инстанс в aiCoach.service.ts — остальной код трогать не нужно.
 */
export interface AICoachService {
  getTip(context: AICoachContext): Promise<string>;
}
