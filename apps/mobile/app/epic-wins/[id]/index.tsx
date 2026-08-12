import type { EpicWinDetailDto, QuestDto } from "@mypetproj/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { ProgressBar } from "../../../src/components/ProgressBar";
import { ScreenTitle } from "../../../src/components/ScreenTitle";
import { WeeklyGrid } from "../../../src/components/WeeklyGrid";
import { useGamification } from "../../../src/features/gamification/GamificationContext";
import { formatDeadline, isOverdue, last7DayDates } from "../../../src/lib/date";
import { useApi } from "../../../src/lib/useApi";
import { useAuthedFocusEffect } from "../../../src/lib/useAuthedFocusEffect";
import { useTheme } from "../../../src/theme/ThemeContext";
import { spacing, typography } from "../../../src/theme/tokens";

const QUEST_STATUS_LABEL: Record<QuestDto["status"], string> = {
  ACTIVE: "В процессе",
  COMPLETED: "Завершён",
  FAILED: "Провален",
};

export default function EpicWinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { theme } = useTheme();
  const styles = useStyles();
  const { refreshCharacter, refreshEpicWins } = useGamification();
  const [epicWin, setEpicWin] = useState<EpicWinDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<{ taskId: string; dayIndex: number } | null>(null);
  const weekDates = useMemo(last7DayDates, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<EpicWinDetailDto>(`/epic-wins/${id}`);
      setEpicWin(data);
    } catch {
      // Молча пропускаем — RefreshControl просто перестанет крутиться.
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useAuthedFocusEffect(load);

  async function onCompleteQuest(questId: string) {
    await api.post(`/quests/${questId}/complete`, {});
    await Promise.all([load(), refreshCharacter(), refreshEpicWins()]);
  }

  async function onFailQuest(questId: string) {
    await api.post(`/quests/${questId}/fail`, {});
    await Promise.all([load(), refreshCharacter(), refreshEpicWins()]);
  }

  /** Тап по ячейке недельной сетки — отметить/снять выполнение простой задачи за конкретный день. */
  async function onToggleWeekDay(taskId: string, dayIndex: number, currentlyDone: boolean) {
    const date = weekDates[dayIndex];
    setPendingDay({ taskId, dayIndex });
    try {
      if (currentlyDone) {
        await api.del(`/daily-tasks/${taskId}/complete?date=${date}`);
      } else {
        await api.post(`/daily-tasks/${taskId}/complete`, { date });
      }
      await Promise.all([load(), refreshCharacter()]);
    } catch {
      // Молча пропускаем — ячейка просто не переключится.
    } finally {
      setPendingDay(null);
    }
  }

  if (!epicWin) {
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
      data={epicWin.quests}
      keyExtractor={(q) => q.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View>
          <ScreenTitle style={styles.title}>{epicWin.title}</ScreenTitle>
          {epicWin.description ? <Text style={styles.description}>{epicWin.description}</Text> : null}
          {epicWin.deadline ? (
            <Text style={[styles.deadline, isOverdue(epicWin.deadline) && styles.deadlineOverdue]}>
              Дедлайн: {formatDeadline(epicWin.deadline)}
              {isOverdue(epicWin.deadline) && epicWin.status === "ACTIVE" ? " · просрочено" : ""}
            </Text>
          ) : null}

          <View style={styles.progressRow}>
            <View style={styles.progressBarWrapper}>
              <ProgressBar value={epicWin.progress / 100} color={theme.colors.success} />
            </View>
            <Text style={styles.progressLabel}>{epicWin.progress}%</Text>
          </View>

          <Button label="+ Добавить квест" onPress={() => router.push(`/epic-wins/${id}/quests/new`)} />
          <Text style={styles.sectionTitle}>Квесты</Text>
          <Text style={styles.hint}>Разверни квест, чтобы увидеть неделю выполнения по каждой задаче.</Text>
        </View>
      }
      ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Квестов пока нет.</Text> : null}
      renderItem={({ item: quest }) => {
        const expanded = expandedQuestId === quest.id;
        return (
          <Card style={styles.questCard}>
            <Pressable onPress={() => setExpandedQuestId(expanded ? null : quest.id)}>
              <View style={styles.questHeader}>
                <Text style={styles.questTitle}>
                  {expanded ? "▾" : "▸"} {quest.title}
                </Text>
                <Text style={styles.questStatus}>{QUEST_STATUS_LABEL[quest.status]}</Text>
              </View>
              {quest.description ? <Text style={styles.questDescription}>{quest.description}</Text> : null}
              {quest.deadline ? (
                <Text style={[styles.deadline, isOverdue(quest.deadline) && styles.deadlineOverdue]}>
                  Дедлайн: {formatDeadline(quest.deadline)}
                  {isOverdue(quest.deadline) && quest.status === "ACTIVE" ? " · просрочено" : ""}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {quest.dailyTasks.length} {quest.dailyTasks.length === 1 ? "задача" : "задач"} · награда {quest.xpReward}{" "}
                XP
              </Text>
            </Pressable>

            {expanded ? (
              <View style={styles.expandedArea}>
                {quest.dailyTasks.length === 0 ? (
                  <Text style={styles.emptyTasksText}>Ежедневных задач пока нет.</Text>
                ) : (
                  quest.dailyTasks.map((task) => {
                    const isQuantified = Boolean(task.unit && task.xpPerUnit);
                    return (
                      <View key={task.id} style={styles.taskRow}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <WeeklyGrid
                          days={task.last7Days}
                          onToggleDay={
                            isQuantified ? undefined : (dayIndex, done) => onToggleWeekDay(task.id, dayIndex, done)
                          }
                          pendingDayIndex={pendingDay?.taskId === task.id ? pendingDay.dayIndex : null}
                        />
                      </View>
                    );
                  })
                )}
                <Pressable onPress={() => router.push(`/quests/${quest.id}`)}>
                  <Text style={styles.openLink}>Открыть квест →</Text>
                </Pressable>
              </View>
            ) : null}

            {quest.status === "ACTIVE" ? (
              <View style={styles.questActions}>
                <View style={styles.questActionButton}>
                  <Button label="Завершить" variant="secondary" onPress={() => onCompleteQuest(quest.id)} />
                </View>
                <View style={styles.questActionButton}>
                  <Button label="Провалить" variant="secondary" onPress={() => onFailQuest(quest.id)} />
                </View>
              </View>
            ) : null}
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
        description: { fontSize: typography.sizeMd, color: theme.colors.muted, marginTop: spacing.xs, marginBottom: spacing.md },
        deadline: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.muted, marginTop: spacing.xs },
        deadlineOverdue: { color: theme.colors.danger },
        progressRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg, gap: spacing.sm },
        progressBarWrapper: { flex: 1 },
        progressLabel: { fontWeight: "700", color: theme.colors.ink, width: 44, textAlign: "right" },
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
          marginTop: spacing.lg,
          marginBottom: spacing.xs,
        },
        hint: { fontSize: typography.sizeSm, color: theme.colors.muted, marginBottom: spacing.sm },
        emptyText: { color: theme.colors.muted, marginTop: spacing.md },
        questCard: { marginBottom: spacing.md },
        questHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
        questTitle: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink, flexShrink: 1 },
        questStatus: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.muted },
        questDescription: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs },
        meta: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.sm },
        expandedArea: {
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.muted,
        },
        emptyTasksText: { fontSize: typography.sizeSm, color: theme.colors.muted },
        taskRow: { marginBottom: spacing.md },
        taskTitle: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink },
        openLink: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.accent, marginTop: spacing.xs },
        questActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
        questActionButton: { flex: 1 },
      }),
    [theme],
  );
}
