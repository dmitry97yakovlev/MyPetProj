import { z } from "zod";

// ---------- Epic Win ----------

export const EpicWinStatusValues = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export type EpicWinStatus = (typeof EpicWinStatusValues)[number];

export const CreateEpicWinInputSchema = z.object({
  title: z.string().min(1, "Укажи название").max(200),
  description: z.string().max(2000).optional(),
  deadline: z.string().datetime().optional(),
  /** Выше число — выше в списке на главном экране и больше вес его задач в дневной результативности. */
  priority: z.number().int().min(0).max(1000).optional(),
  /** Необязательный числовой показатель цели (напр. вес в кг) — если задан вместе с target, прогресс считается по нему. */
  metricUnit: z.string().min(1).max(20).optional(),
  metricStartValue: z.number().optional(),
  metricTargetValue: z.number().optional(),
});
export type CreateEpicWinInput = z.infer<typeof CreateEpicWinInputSchema>;

export const UpdateEpicWinInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(EpicWinStatusValues).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  metricUnit: z.string().min(1).max(20).nullable().optional(),
  metricStartValue: z.number().nullable().optional(),
  metricTargetValue: z.number().nullable().optional(),
});
export type UpdateEpicWinInput = z.infer<typeof UpdateEpicWinInputSchema>;

/** Совместные Эпики — до 5 участников включая владельца (см. epicWins.service.ts). */
export const MAX_EPIC_WIN_MEMBERS = 5;

export const InviteMemberInputSchema = z.object({
  email: z.string().email(),
});
export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;

export interface EpicWinMemberDto {
  userId: string;
  email: string;
  displayName: string | null;
  role: "OWNER" | "MEMBER";
}

/** Облегчённая версия квеста для витрины на главном экране — без ежедневных задач. */
export interface QuestSummaryDto {
  id: string;
  title: string;
  status: QuestStatus;
  /** "Вес" квеста в днях — определяет ширину его сегмента на таймлайн-полоске Эпика. */
  estimatedDays: number;
  assignedToUserId: string | null;
  assignedToName: string | null;
}

/** Один день на GitHub-style тепловой сетке прогресса Эпика. */
export interface EpicActivityDayDto {
  /** YYYY-MM-DD */
  date: string;
  /** Сколько отметок выполнения (по всем ежедневным задачам Эпика) в этот день. */
  count: number;
  /** 0..1 — доля от числа ежедневных задач Эпика, для интенсивности цвета ячейки. */
  ratio: number;
}

export interface EpicWinSummaryDto {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  createdAt: string;
  status: EpicWinStatus;
  /**
   * 0..100. Если задан числовой показатель цели (metricTargetValue) — прогресс
   * до него (см. metricCurrentValue); иначе — доля завершённых квестов.
   */
  progress: number;
  questCount: number;
  memberCount: number;
  isOwner: boolean;
  priority: number;
  quests: QuestSummaryDto[];
  /** Последние ~70 дней для тепловой сетки "был ли прогресс в этот день". */
  activity: EpicActivityDayDto[];

  metricUnit: string | null;
  metricStartValue: number | null;
  metricTargetValue: number | null;
  /** Последнее введённое значение показателя (напр. текущий вес), null — если ещё не отмечалось. */
  metricCurrentValue: number | null;
}

export interface EpicWinDetailDto extends EpicWinSummaryDto {
  members: EpicWinMemberDto[];
  quests: QuestDto[];
}

// ---------- Quest ----------

export const QuestStatusValues = ["ACTIVE", "COMPLETED", "FAILED"] as const;
export type QuestStatus = (typeof QuestStatusValues)[number];

export const CreateQuestInputSchema = z.object({
  title: z.string().min(1, "Укажи название").max(200),
  description: z.string().max(2000).optional(),
  deadline: z.string().datetime().optional(),
  /** Прикидка длительности в днях — вес сегмента на таймлайн-полоске Эпика. */
  estimatedDays: z.number().int().min(1).max(3650).optional(),
  /** Кому из участников совместного Эпика назначен этот квест. */
  assignedToUserId: z.string().uuid().optional(),
});
export type CreateQuestInput = z.infer<typeof CreateQuestInputSchema>;

export const UpdateQuestInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  estimatedDays: z.number().int().min(1).max(3650).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
});
export type UpdateQuestInput = z.infer<typeof UpdateQuestInputSchema>;

export interface QuestDto {
  id: string;
  epicWinId: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: QuestStatus;
  estimatedDays: number;
  assignedToUserId: string | null;
  assignedToName: string | null;
  dailyTasks: DailyTaskDto[];
}

// ---------- Daily task ----------

export const DailyTaskCategoryValues = ["MANDATORY", "OPTIONAL", "SMALL", "SUDDEN"] as const;
export type DailyTaskCategory = (typeof DailyTaskCategoryValues)[number];

export const CreateDailyTaskInputSchema = z.object({
  title: z.string().min(1, "Укажи название").max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(DailyTaskCategoryValues).optional(),
  /** Задача "по количеству" (напр. км, минуты, кг) — просто подпись единицы для UI, без начисления очков. */
  unit: z.string().min(1).max(20).optional(),
  /** Последнее введённое количество считается текущим значением показателя цели родительского Эпика (см. EpicWin.metric*). */
  tracksEpicMetric: z.boolean().optional(),
});
export type CreateDailyTaskInput = z.infer<typeof CreateDailyTaskInputSchema>;

export const UpdateDailyTaskInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  category: z.enum(DailyTaskCategoryValues).optional(),
  unit: z.string().min(1).max(20).nullable().optional(),
  tracksEpicMetric: z.boolean().optional(),
});
export type UpdateDailyTaskInput = z.infer<typeof UpdateDailyTaskInputSchema>;

export const CompleteDailyTaskInputSchema = z.object({
  /** Обязательно для задач "по количеству" (когда у задачи задан unit). */
  quantity: z.number().positive().max(1_000_000).optional(),
  /** YYYY-MM-DD — отметить конкретный день (например, прошлый четверг из недельной сетки), а не сегодня. Не раньше 6 дней назад и не позже сегодня. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате YYYY-MM-DD")
    .optional(),
});
export type CompleteDailyTaskInput = z.infer<typeof CompleteDailyTaskInputSchema>;

export interface DailyTaskDto {
  id: string;
  questId: string;
  title: string;
  description: string | null;
  isActive: boolean;
  category: DailyTaskCategory;
  /** Задача "по количеству" — подпись единицы (например, "км"), без начисления очков. */
  unit: string | null;
  tracksEpicMetric: boolean;
  completedToday: boolean;
  /** Количество, введённое сегодня (только для задач "по количеству"). */
  todayQuantity: number | null;
  /** Число дней подряд с выполнением, считая сегодня (если выполнено сегодня). */
  streak: number;
  /** Отметки за последние 7 календарных дней, от самого старого к сегодняшнему — для недельной сетки в UI. */
  last7Days: boolean[];
  /** Когда задача создана — используется для группировки по неделям, если задач в квесте много. */
  createdAt: string;
}

/** Задача в контексте экрана "Сегодня" — тот же DailyTaskDto + откуда она (для навигации, группировки и веса в результативности). */
export interface TodayTaskDto extends DailyTaskDto {
  questTitle: string;
  epicWinId: string;
  epicWinTitle: string;
  /** Приоритет родительского Эпика — вес этой задачи в подсчёте дневной результативности. */
  epicPriority: number;
}

// ---------- Timeline ----------

export const TimelineEntryKindValues = ["QUEST", "EPIC_WIN"] as const;
export type TimelineEntryKind = (typeof TimelineEntryKindValues)[number];

/** Единая запись таймлайна — либо квест, либо сама Epic Win с дедлайном, отсортированные по дате. */
export interface TimelineEntryDto {
  kind: TimelineEntryKind;
  /** questId либо epicWinId, в зависимости от kind. */
  id: string;
  title: string;
  epicWinId: string;
  epicWinTitle: string;
  deadline: string;
  status: QuestStatus | EpicWinStatus;
}
