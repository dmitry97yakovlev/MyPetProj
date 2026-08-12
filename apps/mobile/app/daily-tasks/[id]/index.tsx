import type { DailyTaskDto } from "@mypetproj/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { CommentsAndAttachments } from "../../../src/components/CommentsAndAttachments";
import { ScreenTitle } from "../../../src/components/ScreenTitle";
import { TextField } from "../../../src/components/TextField";
import { WeeklyGrid } from "../../../src/components/WeeklyGrid";
import { useApi } from "../../../src/lib/useApi";
import { useAuthedFocusEffect } from "../../../src/lib/useAuthedFocusEffect";
import { useTheme } from "../../../src/theme/ThemeContext";
import { spacing, typography } from "../../../src/theme/tokens";

/** Экран отдельной ежедневной задачи — заголовок/описание (редактируемые, как в Jira), комментарии и вложения. */
export default function DailyTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const styles = useStyles();
  const [task, setTask] = useState<DailyTaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<DailyTaskDto>(`/daily-tasks/${id}`);
      setTask(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Не удалось загрузить задачу");
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useAuthedFocusEffect(load);

  function onStartEdit() {
    if (!task) return;
    setTitleDraft(task.title);
    setDescriptionDraft(task.description ?? "");
    setEditing(true);
  }

  async function onSaveEdit() {
    if (!titleDraft.trim()) return;
    setSavingEdit(true);
    try {
      await api.patch(`/daily-tasks/${id}`, { title: titleDraft.trim(), description: descriptionDraft.trim() || null });
      setEditing(false);
      await load();
    } catch {
      // Молча пропускаем — форма редактирования просто останется открытой.
    } finally {
      setSavingEdit(false);
    }
  }

  if (!task) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>{loading ? "Загрузка…" : loadError ? "Ошибка загрузки" : "Не найдено"}</Text>
        {loadError ? <Text style={styles.meta}>{loadError}</Text> : null}
        {loadError ? <Button label="Повторить" variant="secondary" onPress={load} /> : null}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} style={styles.backRow}>
        <Text style={styles.backText}>← Назад к квесту</Text>
      </Pressable>

      {editing ? (
        <View style={styles.editBox}>
          <TextField label="Название" value={titleDraft} onChangeText={setTitleDraft} />
          <TextField label="Описание" value={descriptionDraft} onChangeText={setDescriptionDraft} multiline />
          <View style={styles.editActionsRow}>
            <View style={styles.editActionButton}>
              <Button label={savingEdit ? "Сохраняем…" : "Сохранить"} onPress={onSaveEdit} disabled={savingEdit} />
            </View>
            <View style={styles.editActionButton}>
              <Button label="Отмена" variant="secondary" onPress={() => setEditing(false)} />
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={onStartEdit}>
          <ScreenTitle style={styles.title}>{task.title} ✎</ScreenTitle>
          {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
        </Pressable>
      )}

      <Text style={styles.meta}>
        {task.unit ? `Задача по количеству (${task.unit})` : "Обычная задача-чекбокс"}
        {task.streak > 0 ? ` · стрик ${task.streak} 🔥` : ""}
      </Text>

      <Text style={styles.sectionTitle}>Неделя выполнения</Text>
      <WeeklyGrid days={task.last7Days} />

      <View style={styles.footer}>
        <CommentsAndAttachments targetType="DAILY_TASK" targetId={id!} />
      </View>
    </ScrollView>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background, padding: spacing.lg, justifyContent: "center" },
    list: { flex: 1, backgroundColor: theme.colors.background },
    listContent: { padding: spacing.lg },
    backRow: { alignSelf: "flex-start", marginBottom: spacing.sm },
    backText: { fontSize: typography.sizeMd, fontWeight: "700", color: theme.colors.accent },
    title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: theme.colors.ink },
    description: { fontSize: typography.sizeMd, color: theme.colors.muted, marginTop: spacing.xs },
    meta: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.sm },
    sectionTitle: {
      fontSize: typography.sizeLg,
      fontWeight: typography.weightBold,
      fontFamily: theme.headingFontFamily,
      color: theme.colors.ink,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    editBox: { marginBottom: spacing.sm },
    editActionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    editActionButton: { flex: 1 },
    footer: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.muted },
  });
}
