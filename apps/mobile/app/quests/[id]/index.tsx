import type { DailyTaskDto, QuestDto } from "@mypetproj/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { ScreenTitle } from "../../../src/components/ScreenTitle";
import { useGamification } from "../../../src/features/gamification/GamificationContext";
import { useApi } from "../../../src/lib/useApi";
import { useAuthedFocusEffect } from "../../../src/lib/useAuthedFocusEffect";
import { useTheme } from "../../../src/theme/ThemeContext";
import { spacing, typography } from "../../../src/theme/tokens";

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { theme } = useTheme();
  const styles = useStyles();
  const { refreshCharacter } = useGamification();
  const [quest, setQuest] = useState<QuestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<QuestDto>(`/quests/${id}`);
      setQuest(data);
    } catch {
      // Молча пропускаем — RefreshControl просто перестанет крутиться.
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useAuthedFocusEffect(load);

  async function onToggle(task: DailyTaskDto) {
    if (task.completedToday) {
      await api.del(`/daily-tasks/${task.id}/complete`);
    } else {
      await api.post(`/daily-tasks/${task.id}/complete`, {});
    }
    await Promise.all([load(), refreshCharacter()]);
  }

  async function onSubmitQuantity(task: DailyTaskDto) {
    const raw = quantityDrafts[task.id] ?? "";
    const quantity = Number(raw.replace(",", "."));
    if (!raw.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setQuantityErrors((prev) => ({ ...prev, [task.id]: "Укажи число больше нуля" }));
      return;
    }
    setQuantityErrors((prev) => ({ ...prev, [task.id]: "" }));
    try {
      await api.post(`/daily-tasks/${task.id}/complete`, { quantity });
      setQuantityDrafts((prev) => ({ ...prev, [task.id]: "" }));
      await Promise.all([load(), refreshCharacter()]);
    } catch (err) {
      setQuantityErrors((prev) => ({
        ...prev,
        [task.id]: err instanceof Error ? err.message : "Не удалось сохранить",
      }));
    }
  }

  if (!quest) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>{loading ? "Загрузка…" : "Не найдено"}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={quest.dailyTasks}
      keyExtractor={(t) => t.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View>
          <ScreenTitle style={styles.title}>{quest.title}</ScreenTitle>
          {quest.description ? <Text style={styles.description}>{quest.description}</Text> : null}
          <Text style={styles.meta}>Награда за квест: {quest.xpReward} XP</Text>

          <Button label="+ Добавить ежедневную задачу" onPress={() => router.push(`/quests/${id}/tasks/new`)} />
          <Text style={styles.sectionTitle}>Ежедневные задачи</Text>
        </View>
      }
      ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Задач пока нет.</Text> : null}
      renderItem={({ item: task }) => {
        const isQuantified = Boolean(task.unit && task.xpPerUnit);

        return (
          <Card style={styles.taskCard}>
            <View style={styles.taskRow}>
              {isQuantified ? null : (
                <Pressable
                  onPress={() => onToggle(task)}
                  style={[styles.checkbox, task.completedToday && styles.checkboxChecked]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.completedToday }}
                >
                  {task.completedToday ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              )}
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.description ? <Text style={styles.taskDescription}>{task.description}</Text> : null}
                {isQuantified ? (
                  <Text style={styles.meta}>
                    {task.xpPerUnit} XP за {task.unit}
                    {task.streak > 0 ? ` · стрик ${task.streak} 🔥` : ""}
                  </Text>
                ) : (
                  <Text style={styles.meta}>
                    +{task.xpReward} XP{task.streak > 0 ? ` · стрик ${task.streak} 🔥` : ""}
                  </Text>
                )}

                {isQuantified ? (
                  <View style={styles.quantityRow}>
                    <TextInput
                      style={styles.quantityInput}
                      placeholder={task.unit ?? ""}
                      placeholderTextColor={theme.colors.muted}
                      keyboardType="numeric"
                      value={quantityDrafts[task.id] ?? ""}
                      onChangeText={(text) => setQuantityDrafts((prev) => ({ ...prev, [task.id]: text }))}
                    />
                    <Button label="Записать" onPress={() => onSubmitQuantity(task)} />
                  </View>
                ) : null}
                {isQuantified && task.todayQuantity ? (
                  <Text style={styles.doneToday}>
                    Сегодня: {task.todayQuantity} {task.unit}
                  </Text>
                ) : null}
                {quantityErrors[task.id] ? <Text style={styles.error}>{quantityErrors[task.id]}</Text> : null}
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: theme.colors.background, padding: spacing.lg, justifyContent: "center" },
        list: { flex: 1, backgroundColor: theme.colors.background },
        listContent: { padding: spacing.lg },
        title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: theme.colors.ink },
        description: { fontSize: typography.sizeMd, color: theme.colors.muted, marginTop: spacing.xs },
        meta: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs },
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          color: theme.colors.ink,
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
        },
        emptyText: { color: theme.colors.muted, marginTop: spacing.md },
        taskCard: { marginBottom: spacing.md },
        taskRow: { flexDirection: "row", alignItems: "flex-start" },
        checkbox: {
          width: 32,
          height: 32,
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
        },
        checkboxChecked: { backgroundColor: theme.colors.success },
        check: { fontWeight: typography.weightBold, color: theme.colors.ink, fontSize: typography.sizeMd },
        taskInfo: { flex: 1 },
        taskTitle: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink },
        taskDescription: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs },
        quantityRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.sm },
        quantityInput: {
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          color: theme.colors.ink,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          fontSize: typography.sizeMd,
          width: 90,
        },
        doneToday: { fontSize: typography.sizeSm, color: theme.colors.success, marginTop: spacing.xs, fontWeight: "600" },
        error: { color: theme.colors.danger, marginTop: spacing.xs, fontWeight: "600" },
      }),
    [theme],
  );
}
