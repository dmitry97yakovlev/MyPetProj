import { z } from "zod";

// ---------- Journal ----------

export const JournalEntryKindValues = ["TEXT", "VOICE"] as const;
export type JournalEntryKind = (typeof JournalEntryKindValues)[number];

export const CreateJournalEntryInputSchema = z.object({
  content: z.string().min(1, "Запись не может быть пустой").max(5000),
});
export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntryInputSchema>;

/**
 * Дневная самооценка эмоциональной стабильности, 1..10 — не клинический
 * диагноз, просто личный трекер по собственному ощущению пользователя.
 */
export const SetMoodInputSchema = z.object({
  score: z.number().int().min(1).max(10),
});
export type SetMoodInput = z.infer<typeof SetMoodInputSchema>;

/** Запись дневника — своя мысль (текст) или голосовая заметка. */
export interface JournalEntryDto {
  id: string;
  kind: JournalEntryKind;
  /** Текст мысли (TEXT) или необязательная подпись к голосовой записи (VOICE). */
  content: string | null;
  /** Относительный URL аудиофайла — только для kind=VOICE. */
  audioUrl: string | null;
  /** Календарный день записи, YYYY-MM-DD. */
  entryDate: string;
  createdAt: string;
}

export const JournalAutoEventKindValues = ["DAILY_TASK", "QUEST", "EPIC_WIN"] as const;
export type JournalAutoEventKind = (typeof JournalAutoEventKindValues)[number];

/**
 * Автособытие за день — что было выполнено (задача/квест/эпик), вычисляется
 * на лету из уже существующих данных (не хранится отдельно) и подмешивается
 * в ленту дневника наравне с собственными записями пользователя.
 */
export interface JournalAutoEventDto {
  kind: JournalAutoEventKind;
  title: string;
  epicWinId?: string;
  questId?: string;
  at: string;
}

/** Один день ленты дневника: и свои записи, и автособытия за этот день. */
export interface JournalDayDto {
  date: string;
  entries: JournalEntryDto[];
  autoEvents: JournalAutoEventDto[];
  /** Самооценка эмоциональной стабильности за день (1..10), если отмечена; иначе null. */
  moodScore: number | null;
}
