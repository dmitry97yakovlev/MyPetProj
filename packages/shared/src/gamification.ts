import { z } from "zod";

// ---------- Equipment ----------

export const ItemSlotValues = ["WEAPON", "ARMOR", "TRINKET"] as const;
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
  icon: z.string().min(1).max(8),
});
export type SetAvatarInput = z.infer<typeof SetAvatarInputSchema>;

/** Небольшой фиксированный набор эмодзи-аватаров на выбор — см. AVATAR_ICONS в character.service.ts (backend) / AVATAR_ICONS в мобильном коде. */
export const AVATAR_ICONS = ["🧙", "🧝", "🧛", "🥷", "🦸", "🧟", "🐉", "🦾"] as const;

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
  /** Прогресс к следующему предмету экипировки. */
  itemProgress: number;
  itemProgressToNext: number;
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
});
export type CreateEpicWinInput = z.infer<typeof CreateEpicWinInputSchema>;

export const UpdateEpicWinInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(EpicWinStatusValues).optional(),
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

export interface EpicWinSummaryDto {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: EpicWinStatus;
  /** 0..100, доля завершённых квестов. */
  progress: number;
  questCount: number;
  memberCount: number;
  isOwner: boolean;
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
});
export type CreateQuestInput = z.infer<typeof CreateQuestInputSchema>;

export const UpdateQuestInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
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
  dailyTasks: DailyTaskDto[];
}

// ---------- Daily task ----------

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
  /** Задана вместе с xpPerUnit → задача "по количеству" (например, "км"). */
  unit: string | null;
  xpPerUnit: number | null;
  completedToday: boolean;
  /** Количество, введённое сегодня (только для задач "по количеству"). */
  todayQuantity: number | null;
  /** Число дней подряд с выполнением, считая сегодня (если выполнено сегодня). */
  streak: number;
}

// ---------- Timeline ----------

/** Квесты с дедлайном по всем моим Epic Win, отсортированные по дате. */
export interface TimelineEntryDto {
  questId: string;
  questTitle: string;
  epicWinId: string;
  epicWinTitle: string;
  deadline: string;
  status: QuestStatus;
}
