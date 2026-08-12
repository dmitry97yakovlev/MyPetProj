import type { AttachmentDto, EntityType } from "@mypetproj/shared";
import type { Attachment, User } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { assertTargetAccess } from "../access";

type AttachmentWithUploader = Attachment & { uploader: User };

function toDto(attachment: AttachmentWithUploader, viewerId: string): AttachmentDto {
  return {
    id: attachment.id,
    targetType: attachment.targetType,
    targetId: attachment.targetId,
    uploaderId: attachment.uploaderId,
    uploaderName: attachment.uploader.displayName || attachment.uploader.email,
    fileName: attachment.fileName,
    url: attachment.url,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString(),
    canDelete: attachment.uploaderId === viewerId,
  };
}

export async function listAttachments(
  targetType: EntityType,
  targetId: string,
  userId: string,
): Promise<AttachmentDto[]> {
  await assertTargetAccess(targetType, targetId, userId);
  const attachments = await prisma.attachment.findMany({
    where: { targetType, targetId },
    include: { uploader: true },
    orderBy: { createdAt: "asc" },
  });
  return attachments.map((a) => toDto(a, userId));
}

export async function createAttachment(
  targetType: EntityType,
  targetId: string,
  userId: string,
  file: { originalname: string; filename: string; mimetype: string; size: number },
): Promise<AttachmentDto> {
  await assertTargetAccess(targetType, targetId, userId);
  const attachment = await prisma.attachment.create({
    data: {
      targetType,
      targetId,
      uploaderId: userId,
      fileName: file.originalname,
      url: `/uploads/attachments/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
    include: { uploader: true },
  });
  return toDto(attachment, userId);
}

export async function deleteAttachment(attachmentId: string, userId: string): Promise<void> {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw new AppError(404, "Вложение не найдено");
  if (attachment.uploaderId !== userId) throw new AppError(403, "Удалить вложение может только тот, кто его загрузил");
  await prisma.attachment.delete({ where: { id: attachmentId } });
  const absolutePath = path.join(process.cwd(), attachment.url);
  fs.unlink(absolutePath, () => {
    // Молча пропускаем — если файла уже нет на диске, запись в БД всё равно удалена.
  });
}

/** Удаляет все вложения сущности (запись в БД + файл на диске) — вызывается при удалении самой сущности. */
export async function deleteAttachmentsFor(targetType: EntityType, targetId: string): Promise<void> {
  const attachments = await prisma.attachment.findMany({ where: { targetType, targetId } });
  await prisma.attachment.deleteMany({ where: { targetType, targetId } });
  for (const attachment of attachments) {
    const absolutePath = path.join(process.cwd(), attachment.url);
    fs.unlink(absolutePath, () => {});
  }
}
