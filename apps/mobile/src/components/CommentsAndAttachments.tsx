import type { AttachmentDto, CommentDto, EntityType } from "@mypetproj/shared";
import * as DocumentPicker from "expo-document-picker";
import { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuthedFocusEffect } from "../lib/useAuthedFocusEffect";
import { useApi } from "../lib/useApi";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";
import { Card } from "./Card";
import { TextField } from "./TextField";
import { Button } from "./Button";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface CommentsAndAttachmentsProps {
  targetType: EntityType;
  targetId: string;
}

/**
 * Комментарии + вложения — в духе Jira-тикета, общий компонент для Эпика,
 * Квеста и ежедневной Задачи (см. EntityType). Backend полиморфен по
 * (targetType, targetId), см. comments.service.ts/attachments.service.ts.
 */
export function CommentsAndAttachments({ targetType, targetId }: CommentsAndAttachmentsProps) {
  const api = useApi();
  const styles = useStyles();
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [commentsData, attachmentsData] = await Promise.all([
        api.get<CommentDto[]>(`/comments?targetType=${targetType}&targetId=${targetId}`),
        api.get<AttachmentDto[]>(`/attachments?targetType=${targetType}&targetId=${targetId}`),
      ]);
      setComments(commentsData);
      setAttachments(attachmentsData);
    } catch {
      // Молча пропускаем — секция просто останется пустой до следующего обновления.
    }
  }, [api, targetType, targetId]);

  useAuthedFocusEffect(load);

  async function onAddComment() {
    if (!draft.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await api.post("/comments", { targetType, targetId, body: draft.trim() });
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить комментарий");
    } finally {
      setPosting(false);
    }
  }

  async function onDeleteComment(id: string) {
    await api.del(`/comments/${id}`);
    await load();
  }

  async function onDeleteAttachment(id: string) {
    await api.del(`/attachments/${id}`);
    await load();
  }

  async function onPickFile() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("targetType", targetType);
      formData.append("targetId", targetId);
      if (asset.file) {
        // Web: DocumentPicker отдаёт настоящий File — используем как есть.
        formData.append("file", asset.file, asset.name);
      } else {
        // Нативно: {uri,name,type} — react-native FormData понимает такой объект для файлов.
        formData.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/octet-stream" } as unknown as Blob);
      }
      await api.postForm("/attachments", formData);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Вложения ({attachments.length})</Text>
      {attachments.map((a) => (
        <Card key={a.id} style={styles.attachmentRow}>
          <Pressable onPress={() => Linking.openURL(`${API_URL}${a.url}`)} style={styles.attachmentLinkWrapper}>
            <Text style={styles.attachmentName} numberOfLines={1}>
              📎 {a.fileName}
            </Text>
          </Pressable>
          <Text style={styles.attachmentMeta}>
            {formatSize(a.sizeBytes)} · {a.uploaderName}
          </Text>
          {a.canDelete ? (
            <Pressable onPress={() => onDeleteAttachment(a.id)}>
              <Text style={styles.deleteLink}>Удалить</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
      <Button label={uploading ? "Загружаем…" : "+ Прикрепить файл"} variant="secondary" onPress={onPickFile} disabled={uploading} />

      <Text style={[styles.sectionTitle, styles.commentsTitle]}>Комментарии ({comments.length})</Text>
      {comments.map((c) => (
        <Card key={c.id} style={styles.commentRow}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{c.authorName}</Text>
            <Text style={styles.commentTime}>{formatTime(c.createdAt)}</Text>
          </View>
          <Text style={styles.commentBody}>{c.body}</Text>
          {c.canDelete ? (
            <Pressable onPress={() => onDeleteComment(c.id)}>
              <Text style={styles.deleteLink}>Удалить</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
      {comments.length === 0 ? <Text style={styles.emptyText}>Пока пусто.</Text> : null}

      <TextField label="Новый комментарий" value={draft} onChangeText={setDraft} placeholder="Написать комментарий…" multiline />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={posting ? "Отправляем…" : "Отправить"} onPress={onAddComment} disabled={posting} />
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
          marginBottom: spacing.sm,
        },
        commentsTitle: { marginTop: spacing.lg },
        emptyText: { color: theme.colors.muted, marginBottom: spacing.sm },
        attachmentRow: { marginBottom: spacing.sm },
        attachmentLinkWrapper: { alignSelf: "flex-start" },
        attachmentName: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.accent },
        attachmentMeta: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
        commentRow: { marginBottom: spacing.sm },
        commentHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
        commentAuthor: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink },
        commentTime: { fontSize: 11, color: theme.colors.muted },
        commentBody: { fontSize: typography.sizeSm, color: theme.colors.ink },
        deleteLink: { fontSize: 11, color: theme.colors.danger, fontWeight: "700", marginTop: spacing.xs },
        error: { color: theme.colors.danger, marginBottom: spacing.sm, fontWeight: "600" },
      }),
    [theme],
  );
}
