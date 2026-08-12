import { z } from "zod";

// ---------- Equipment ----------

export const ItemSlotValues = ["WEAPON", "ARMOR", "RING", "NECKLACE", "TRINKET"] as const;
export type ItemSlot = (typeof ItemSlotValues)[number];

export const ItemRarityValues = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;
export type ItemRarity = (typeof ItemRarityValues)[number];

/** Запись каталога — предмет, который в принципе существует в игре. */
export interface ItemDto {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  icon: string;
  bonusHp: number;
}

/** Каталожный предмет + владеет ли им текущий пользователь (для экрана коллекции — видно и то, что ещё не выпало). */
export interface CatalogItemDto extends ItemDto {
  owned: boolean;
  equipped: boolean;
}

/** Предмет в инвентаре пользователя. */
export interface InventoryItemDto {
  inventoryItemId: string;
  item: ItemDto;
  equipped: boolean;
  acquiredAt: string;
}

export const SetAvatarInputSchema = z.object({
  icon: z.string().min(1).max(40),
});
export type SetAvatarInput = z.infer<typeof SetAvatarInputSchema>;

/** Персонаж на выбор — полноростовая иллюстрация вместо эмодзи-иконки. */
export interface AvatarCharacter {
  id: string;
  name: string;
  imageUrl: string;
  /** Франшиза — для группировки в UI выбора персонажа. */
  franchise: string;
}

/**
 * Фиксированный набор персонажей на выбор (внешние ссылки на иллюстрации,
 * не встраиваем файлы в репозиторий). `Character.avatarIcon` хранит id
 * одного из них — см. character.service.ts (backend) и getAvatarCharacter
 * (мобильный код) для резолва id → картинка с фолбэком на первого.
 */
export const AVATAR_CHARACTERS: AvatarCharacter[] = [
  {
    id: "jaina",
    name: "Джайна",
    franchise: "Warcraft III",
    imageUrl: "https://images6.alphacoders.com/984/thumb-1920-984499.png",
  },
  {
    id: "sylvanas",
    name: "Сильвана",
    franchise: "Warcraft III",
    imageUrl: "https://images8.alphacoders.com/610/thumb-1920-610742.jpg",
  },
  {
    id: "tyrande",
    name: "Тиранда",
    franchise: "Warcraft III",
    imageUrl: "https://images7.alphacoders.com/120/thumb-1920-1205637.jpg",
  },
  {
    id: "alleria",
    name: "Аллерия",
    franchise: "Warcraft III",
    imageUrl: "https://images6.alphacoders.com/138/thumb-1920-1383250.png",
  },
  {
    id: "illidan",
    name: "Иллидан",
    franchise: "Warcraft III",
    imageUrl: "https://images.alphacoders.com/839/thumb-1920-83953.jpg",
  },
  {
    id: "thrall",
    name: "Тралл",
    franchise: "Warcraft III",
    imageUrl: "https://images4.alphacoders.com/752/thumb-1920-752158.jpg",
  },
  {
    id: "arthas",
    name: "Артас",
    franchise: "Warcraft III",
    imageUrl: "https://images2.alphacoders.com/963/thumb-1920-963952.jpg",
  },
  {
    id: "uther",
    name: "Утер",
    franchise: "Warcraft III",
    imageUrl: "https://images5.alphacoders.com/555/thumb-1920-555051.jpg",
  },
  {
    id: "geralt",
    name: "Геральт",
    franchise: "The Witcher",
    imageUrl: "https://images5.alphacoders.com/643/thumb-1920-643094.jpg",
  },
  {
    id: "lara",
    name: "Лара Крофт",
    franchise: "Tomb Raider",
    imageUrl: "https://images6.alphacoders.com/423/thumb-1920-423181.jpg",
  },
  {
    id: "kratos",
    name: "Кратос",
    franchise: "God of War",
    imageUrl: "https://images5.alphacoders.com/410/thumb-1920-410051.jpg",
  },
  {
    id: "aloy",
    name: "Элой",
    franchise: "Horizon",
    imageUrl: "https://images3.alphacoders.com/985/thumb-1920-985629.jpg",
  },
];
export const AVATAR_CHARACTER_IDS = AVATAR_CHARACTERS.map((c) => c.id);

// ---------- Character ----------

export interface CharacterDto {
  level: number;
  /** Опыт, накопленный на текущем уровне. */
  xp: number;
  /** Сколько опыта нужно для перехода на следующий уровень. */
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  avatarIcon: string;
  inventory: InventoryItemDto[];
  /** Экипированные предметы по слотам (null — слот пуст). */
  equipped: Record<ItemSlot, ItemDto | null>;
}

// ---------- Epic Win ----------

export const EpicWinStatusValues = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export type EpicWinStatus = (typeof EpicWinStatusValues)[number];

export const CreateEpicWinInputSchema = z.object({
  title: z.string().min(1, "Укажи название").max(200),
  description: z.string().max(2000).optional(),
  deadline: z.string().datetime().optional(),
  /** Выше число — выше в списке на главном экране; у первых трёх — медали. */
  priority: z.number().int().min(0).max(1000).optional(),
});
export type CreateEpicWinInput = z.infer<typeof CreateEpicWinInputSchema>;

export const UpdateEpicWinInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(EpicWinStatusValues).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
});
export type UpdateEpicWinInput = z.infer<typeof UpdateEpicWinInputSchema>;

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
}

export interface EpicWinSummaryDto {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: EpicWinStatus;
  /** 0..100, доля завершённых квестов (по количеству, не по весу — для обратной совместимости). */
  progress: number;
  questCount: number;
  memberCount: number;
  isOwner: boolean;
  priority: number;
  /** 1..3 — место по приоритету среди активных Эпиков этого пользователя (для медалей 🥇🥈🥉), иначе null. */
  rank: number | null;
  /** Квесты для сегментированной таймлайн-полоски и вложенного списка на главном экране. */
  quests: QuestSummaryDto[];
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
  xpReward: z.number().int().min(0).max(10000).optional(),
  /** Прикидка длительности в днях — вес сегмента на таймлайн-полоске Эпика. */
  estimatedDays: z.number().int().min(1).max(3650).optional(),
});
export type CreateQuestInput = z.infer<typeof CreateQuestInputSchema>;

export const UpdateQuestInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
  estimatedDays: z.number().int().min(1).max(3650).optional(),
});
export type UpdateQuestInput = z.infer<typeof UpdateQuestInputSchema>;

export interface QuestDto {
  id: string;
  epicWinId: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: QuestStatus;
  xpReward: number;
  estimatedDays: number;
  dailyTasks: DailyTaskDto[];
}

// ---------- Daily task ----------

export const DailyTaskCategoryValues = ["MANDATORY", "OPTIONAL", "SMALL", "SUDDEN"] as const;
export type DailyTaskCategory = (typeof DailyTaskCategoryValues)[number];

// Единица измерения и награда за единицу — вместе задают "задачу по количеству"
// (например, "км" + 10 XP/км: пробежал 5 км → +50 XP). Оба поля вместе или
// ни одного — частично заданная пара не имеет смысла.
const quantifiedFields = {
  unit: z.string().min(1).max(20).optional(),
  xpPerUnit: z.number().int().min(1).max(1000).optional(),
};

function refineQuantifiedPair<T extends { unit?: string; xpPerUnit?: number }>(data: T, ctx: z.RefinementCtx) {
  if (Boolean(data.unit) !== Boolean(data.xpPerUnit)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "unit и xpPerUnit нужно задавать вместе",
      path: ["unit"],
    });
  }
}

export const CreateDailyTaskInputSchema = z
  .object({
    title: z.string().min(1, "Укажи название").max(200),
    description: z.string().max(2000).optional(),
    xpReward: z.number().int().min(0).max(1000).optional(),
    category: z.enum(DailyTaskCategoryValues).optional(),
    ...quantifiedFields,
  })
  .superRefine(refineQuantifiedPair);
export type CreateDailyTaskInput = z.infer<typeof CreateDailyTaskInputSchema>;

export const UpdateDailyTaskInputSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    xpReward: z.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
    category: z.enum(DailyTaskCategoryValues).optional(),
    unit: z.string().min(1).max(20).nullable().optional(),
    xpPerUnit: z.number().int().min(1).max(1000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Обновление меняет только переданные поля, так что здесь проверяем пару
    // лишь когда оба явно переданы и хотя бы одно из них "выключает" другое.
    if (data.unit !== undefined && data.xpPerUnit !== undefined && Boolean(data.unit) !== Boolean(data.xpPerUnit)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "unit и xpPerUnit нужно задавать вместе", path: ["unit"] });
    }
  });
export type UpdateDailyTaskInput = z.infer<typeof UpdateDailyTaskInputSchema>;

export const CompleteDailyTaskInputSchema = z.object({
  /** Обязательно для задач "по количеству" (когда у задачи задан unit). */
  quantity: z.number().positive().max(1_000_000).optional(),
});
export type CompleteDailyTaskInput = z.infer<typeof CompleteDailyTaskInputSchema>;

export interface DailyTaskDto {
  id: string;
  questId: string;
  title: string;
  description: string | null;
  xpReward: number;
  isActive: boolean;
  category: DailyTaskCategory;
  /** Задана вместе с xpPerUnit → задача "по количеству" (например, "км"). */
  unit: string | null;
  xpPerUnit: number | null;
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

/** Задача в контексте экрана "Сегодня" — тот же DailyTaskDto + откуда она (для навигации и группировки). */
export interface TodayTaskDto extends DailyTaskDto {
  questTitle: string;
  epicWinId: string;
  epicWinTitle: string;
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
