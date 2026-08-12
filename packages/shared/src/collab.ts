import { z } from "zod";

// ---------- Комментарии и вложения (Эпик/Квест/Задача) ----------

export const EntityTypeValues = ["EPIC_WIN", "QUEST", "DAILY_TASK"] as const;
export type EntityType = (typeof EntityTypeValues)[number];

export const CreateCommentInputSchema = z.object({
  targetType: z.enum(EntityTypeValues),
  targetId: z.string().uuid(),
  body: z.string().min(1, "Комментарий не может быть пустым").max(4000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

export interface CommentDto {
  id: string;
  targetType: EntityType;
  targetId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  /** Может ли текущий пользователь удалить — только автор. */
  canDelete: boolean;
}

export interface AttachmentDto {
  id: string;
  targetType: EntityType;
  targetId: string;
  uploaderId: string;
  uploaderName: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  /** Может ли текущий пользователь удалить — только тот, кто загрузил. */
  canDelete: boolean;
}
