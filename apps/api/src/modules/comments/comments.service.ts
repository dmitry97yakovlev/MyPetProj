import type { CommentDto, EntityType } from "@mypetproj/shared";
import type { Comment, User } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { assertTargetAccess } from "../access";

type CommentWithAuthor = Comment & { author: User };

function toDto(comment: CommentWithAuthor, viewerId: string): CommentDto {
  return {
    id: comment.id,
    targetType: comment.targetType,
    targetId: comment.targetId,
    authorId: comment.authorId,
    authorName: comment.author.displayName || comment.author.email,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    canDelete: comment.authorId === viewerId,
  };
}

export async function listComments(targetType: EntityType, targetId: string, userId: string): Promise<CommentDto[]> {
  await assertTargetAccess(targetType, targetId, userId);
  const comments = await prisma.comment.findMany({
    where: { targetType, targetId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  return comments.map((c) => toDto(c, userId));
}

export async function createComment(
  targetType: EntityType,
  targetId: string,
  userId: string,
  body: string,
): Promise<CommentDto> {
  await assertTargetAccess(targetType, targetId, userId);
  const comment = await prisma.comment.create({
    data: { targetType, targetId, authorId: userId, body },
    include: { author: true },
  });
  return toDto(comment, userId);
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError(404, "Комментарий не найден");
  if (comment.authorId !== userId) throw new AppError(403, "Удалить комментарий может только автор");
  await prisma.comment.delete({ where: { id: commentId } });
}

/** Удаляет все комментарии сущности — вызывается при удалении самой сущности (см. deleteEpicWin/deleteQuest/deleteDailyTask). */
export async function deleteCommentsFor(targetType: EntityType, targetId: string): Promise<void> {
  await prisma.comment.deleteMany({ where: { targetType, targetId } });
}
