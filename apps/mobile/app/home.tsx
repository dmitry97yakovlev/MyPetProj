import type { DailyTaskDto, EpicWinSummaryDto, QuestDto, QuestSummaryDto, TodayTaskDto } from "@mypetproj/shared";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActivityHeatmap } from "../src/components/ActivityHeatmap";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { ProgressBar } from "../src/components/ProgressBar";
import { ThemedBackground } from "../src/components/ThemedBackground";
import { WeeklyGrid } from "../src/components/WeeklyGrid";
import { useAuth } from "../src/features/auth/AuthContext";
import { useGamification } from "../src/features/gamification/GamificationContext";
import { RemindersBanner } from "../src/features/timeline/RemindersBanner";
import { TimelineWidget } from "../src/features/timeline/TimelineWidget";
import { last7DayDates } from "../src/lib/date";
import { useApi } from "../src/lib/useApi";
import { useAuthedFocusEffect } from "../src/lib/useAuthedFocusEffect";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

const QUEST_STATUS_ICON: Record<string, string> = { ACTIVE: "▸", COMPLETED: "✓", FAILED: "✗" };
const TASKS_PER_WEEK_GROUP_THRESHOLD = 10;

/** Понедельник той недели, куда попадает дата — как ключ группировки "Неделя от DD.MM". */
function weekLabel(iso: string): string {
  const d = new Date(iso);
  const dayOffset = (d.getUTCDay() + 6) % 7; // 0=понедельник
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dayOffset);
  return `Неделя от ${monday.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`;
}

function groupTasksByWeek(tasks: DailyTaskDto[]): [string, DailyTaskDto[]][] {
  const sorted = [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const groups = new Map<string, DailyTaskDto[]>();
  for (const task of sorted) {
    const key = weekLabel(task.createdAt);
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

/**
 * Дневная результативность: доля выполненных сегодня задач, взвешенная по
 * приоритету родительского Эпика (вес = приоритет + 1, чтобы Эпики с
 * приоритетом 0 тоже что-то весили) — задачи из более приоритетных Эпиков
 * дают больше процентов, как и было явно попрошено.
 */
function computePerformance(tasks: TodayTaskDto[]): { percent: number; completed: number; total: number } {
  if (tasks.length === 0) return { percent: 0, completed: 0, total: 0 };
  let doneWeight = 0;
  let totalWeight = 0;
  let completed = 0;
  for (const task of tasks) {
    const weight = task.epicPriority + 1;
    totalWeight += weight;
    if (task.completedToday) {
      doneWeight += weight;
      completed += 1;
    }
  }
  return { percent: totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0, completed, total: tasks.length };
}

export default function HomeScreen() {
  const { status, user, logout } = useAuth();
  const { epicWins, loading, refreshEpicWins } = useGamification();
  const router = useRouter();
  const api = useApi();
  const styles = useStyles();
  const [expandedEpicId, setExpandedEpicId] = useState<string | null>(null);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [questDetails, setQuestDetails] = useState<Record<string, QuestDto>>({});
  const [questLoadingId, setQuestLoadingId] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<{ taskId: string; dayIndex: number } | null>(null);
  const [todayTasks, setTodayTasks] = useState<TodayTaskDto[]>([]);
  const weekDates = useMemo(last7DayDates, []);

  const loadToday = useCallback(async () => {
    try {
      setTodayTasks(await api.get<TodayTaskDto[]>("/daily-tasks/today"));
    } catch {
      // Молча пропускаем — виджет результативности просто не покажется.
    }
  }, [api]);

  useAuthedFocusEffect(loadToday);

  const fetchQuestDetail = useCallback(
    async (questId: string) => {
      try {
        const data = await api.get<QuestDto>(`/quests/${questId}`);
        setQuestDetails((prev) => ({ ...prev, [questId]: data }));
      } catch {
        // Молча пропускаем — раскрытый квест просто останется без списка задач.
      }
    },
    [api],
  );

  const loadQuestDetail = useCallback(
    async (questId: string) => {
      if (questDetails[questId]) return;
      setQuestLoadingId(questId);
      await fetchQuestDetail(questId);
      setQuestLoadingId(null);
    },
    [questDetails, fetchQuestDetail],
  );

  /** Тап по ячейке недельной сетки внутри раскрытого квеста на главной — отметить/снять выполнение за конкретный день. */
  async function onToggleWeekDay(task: DailyTaskDto, dayIndex: number, currentlyDone: boolean) {
    const date = weekDates[dayIndex];
    setPendingDay({ taskId: task.id, dayIndex });
    try {
      if (currentlyDone) {
        await api.del(`/daily-tasks/${task.id}/complete?date=${date}`);
      } else {
        await api.post(`/daily-tasks/${task.id}/complete`, { date });
      }
      await Promise.all([fetchQuestDetail(task.questId), refreshEpicWins(), loadToday()]);
    } catch {
      // Молча пропускаем — ячейка просто не переключится.
    } finally {
      setPendingDay(null);
    }
  }

  if (status !== "signedIn" || !user) {
    return <Redirect href="/login" />;
  }

  async function onRefresh() {
    await Promise.all([refreshEpicWins(), loadToday()]);
  }

  function onToggleEpic(epicId: string) {
    setExpandedEpicId((prev) => (prev === epicId ? null : epicId));
    setExpandedQuestId(null);
  }

  function onToggleQuest(questId: string) {
    if (expandedQuestId === questId) {
      setExpandedQuestId(null);
      return;
    }
    setExpandedQuestId(questId);
    loadQuestDetail(questId);
  }

  async function onChangePriority(epic: EpicWinSummaryDto, delta: number) {
    try {
      await api.patch(`/epic-wins/${epic.id}`, { priority: Math.max(0, epic.priority + delta) });
      await refreshEpicWins();
    } catch {
      // Молча пропускаем — приоритет просто не изменится.
    }
  }

  const expandedEpic = epicWins.find((e) => e.id === expandedEpicId) ?? null;
  const performance = computePerformance(todayTasks);

  return (
    <ThemedBackground>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          {user.isAdmin ? <Text style={styles.badge}>ADMIN</Text> : <View />}
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push("/settings")}>
              <Text style={styles.logout}>⚙️ Настройки</Text>
            </Pressable>
            <Pressable onPress={logout}>
              <Text style={styles.logout}>Выйти</Text>
            </Pressable>
          </View>
        </View>

        {todayTasks.length > 0 ? (
          <Card style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Сегодня: результативность {performance.percent}%</Text>
            <ProgressBar value={performance.percent / 100} color={progressColor(performance.percent)} height={14} />
            <Text style={styles.performanceMeta}>
              Выполнено {performance.completed} из {performance.total} — приоритетные задачи весят больше.
            </Text>
          </Card>
        ) : null}

        <RemindersBanner />
        <TimelineWidget />

        <View style={styles.navRow}>
          <Pressable style={styles.navItem} onPress={() => router.push("/friends")}>
            <Text style={styles.navItemText}>👥 Друзья</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push("/leaderboard")}>
            <Text style={styles.navItemText}>🏆 Рейтинг</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push("/timeline")}>
            <Text style={styles.navItemText}>🗓 Таймлайн</Text>
          </Pressable>
        </View>
        <View style={styles.navRow}>
          <Pressable style={styles.navItemWide} onPress={() => router.push("/journal")}>
            <Text style={styles.navItemText}>📔 Дневник</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Твои Эпики</Text>
        <Button label="+ Новый Эпик" onPress={() => router.push("/epic-wins/new")} />

        {epicWins.length === 0 && !loading ? (
          <Text style={styles.emptyText}>Пока пусто — создай свой первый Эпик выше.</Text>
        ) : null}

        <View style={styles.epicGrid}>
          {epicWins.map((epic) => (
            <EpicTile
              key={epic.id}
              epic={epic}
              expanded={epic.id === expandedEpicId}
              onToggle={() => onToggleEpic(epic.id)}
              onOpen={() => router.push(`/epic-wins/${epic.id}`)}
              onChangePriority={(delta) => onChangePriority(epic, delta)}
            />
          ))}
        </View>

        {expandedEpic ? (
          <Card style={styles.expandedPanel}>
            <Text style={styles.expandedTitle}>{expandedEpic.title}</Text>
            {expandedEpic.quests.length === 0 ? (
              <Text style={styles.emptyText}>Квестов пока нет.</Text>
            ) : (
              expandedEpic.quests.map((quest) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  expanded={quest.id === expandedQuestId}
                  detail={questDetails[quest.id]}
                  loading={questLoadingId === quest.id}
                  onToggle={() => onToggleQuest(quest.id)}
                  onToggleWeekDay={onToggleWeekDay}
                  pendingDay={pendingDay}
                />
              ))
            )}
            <Pressable onPress={() => router.push(`/epic-wins/${expandedEpic.id}`)}>
              <Text style={styles.openLink}>Открыть Эпик →</Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>
    </ThemedBackground>
  );
}

/** Цвет полосы результативности: красный/жёлтый/зелёный в зависимости от %. */
function progressColor(percent: number): string {
  if (percent >= 70) return "#3ba55c";
  if (percent >= 40) return "#d9a441";
  return "#d94848";
}

interface EpicTileProps {
  epic: EpicWinSummaryDto;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onChangePriority: (delta: number) => void;
}

function EpicTile({ epic, expanded, onToggle, onOpen, onChangePriority }: EpicTileProps) {
  const styles = useStyles();
  const hasMetric = epic.metricTargetValue !== null && epic.metricStartValue !== null;

  return (
    <Pressable onPress={onToggle} onLongPress={onOpen} style={styles.epicTileWrapper}>
      <Card style={[styles.epicTile, expanded && styles.epicTileExpanded]}>
        <Text style={styles.epicTileTitle} numberOfLines={2}>
          {epic.title}
        </Text>

        {hasMetric ? (
          <Text style={styles.epicTileMeta}>
            Сейчас: {epic.metricCurrentValue ?? epic.metricStartValue} {epic.metricUnit} · Цель: {epic.metricTargetValue}{" "}
            {epic.metricUnit}
          </Text>
        ) : null}
        <Text style={styles.epicTileMeta}>
          {epic.progress}% · {epic.questCount} {epic.questCount === 1 ? "квест" : "квестов"}
        </Text>

        <View style={styles.epicTileHeatmap}>
          <ActivityHeatmap days={epic.activity} compact />
        </View>

        {epic.isOwner ? (
          <View style={styles.priorityRow}>
            <Pressable onPress={() => onChangePriority(-1)} style={styles.priorityButton}>
              <Text style={styles.priorityButtonText}>−</Text>
            </Pressable>
            <Text style={styles.priorityValue}>{epic.priority}</Text>
            <Pressable onPress={() => onChangePriority(1)} style={styles.priorityButton}>
              <Text style={styles.priorityButtonText}>+</Text>
            </Pressable>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

interface QuestRowProps {
  quest: QuestSummaryDto;
  expanded: boolean;
  detail: QuestDto | undefined;
  loading: boolean;
  onToggle: () => void;
  onToggleWeekDay: (task: DailyTaskDto, dayIndex: number, currentlyDone: boolean) => void;
  pendingDay: { taskId: string; dayIndex: number } | null;
}

function QuestRow({ quest, expanded, detail, loading, onToggle, onToggleWeekDay, pendingDay }: QuestRowProps) {
  const styles = useStyles();
  const tasks = detail?.dailyTasks ?? [];
  const grouped = tasks.length > TASKS_PER_WEEK_GROUP_THRESHOLD ? groupTasksByWeek(tasks) : null;

  return (
    <View style={styles.questRowWrapper}>
      <Pressable onPress={onToggle}>
        <Text style={styles.questRow} numberOfLines={1}>
          {expanded ? "▾" : QUEST_STATUS_ICON[quest.status] ?? "▸"} {quest.title}
          {quest.assignedToName ? ` · ${quest.assignedToName}` : ""}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.questExpanded}>
          {loading ? <Text style={styles.emptyText}>Загрузка…</Text> : null}
          {!loading && tasks.length === 0 ? <Text style={styles.emptyText}>Задач пока нет.</Text> : null}
          {!loading && grouped
            ? grouped.map(([week, weekTasks]) => (
                <View key={week} style={styles.weekGroup}>
                  <Text style={styles.weekGroupTitle}>{week}</Text>
                  {weekTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggleWeekDay={onToggleWeekDay} pendingDay={pendingDay} />
                  ))}
                </View>
              ))
            : !loading
              ? tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onToggleWeekDay={onToggleWeekDay} pendingDay={pendingDay} />
                ))
              : null}
        </View>
      ) : null}
    </View>
  );
}

interface TaskRowProps {
  task: DailyTaskDto;
  onToggleWeekDay: (task: DailyTaskDto, dayIndex: number, currentlyDone: boolean) => void;
  pendingDay: { taskId: string; dayIndex: number } | null;
}

function TaskRow({ task, onToggleWeekDay, pendingDay }: TaskRowProps) {
  const styles = useStyles();
  const isQuantified = Boolean(task.unit);
  return (
    <View style={styles.taskRow}>
      <Text style={styles.taskRowTitle} numberOfLines={1}>
        {task.title}
      </Text>
      <WeeklyGrid
        days={task.last7Days}
        onToggleDay={isQuantified ? undefined : (dayIndex, done) => onToggleWeekDay(task, dayIndex, done)}
        pendingDayIndex={pendingDay?.taskId === task.id ? pendingDay.dayIndex : null}
      />
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        list: { flex: 1 },
        listContent: { padding: spacing.lg },
        headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
        headerActions: { flexDirection: "row", gap: spacing.md },
        logout: { color: theme.colors.accent, fontWeight: "700" },
        badge: {
          alignSelf: "flex-start",
          backgroundColor: theme.colors.primary,
          color: theme.colors.background,
          fontWeight: typography.weightBold,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderWidth: 2,
          borderColor: theme.colors.ink,
        },
        performanceCard: { marginTop: spacing.md, marginBottom: spacing.lg },
        performanceTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
          marginBottom: spacing.sm,
        },
        performanceMeta: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.sm },
        navRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
        navItem: {
          flex: 1,
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.sm,
          alignItems: "center",
        },
        navItemWide: {
          flex: 1,
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.sm,
          alignItems: "center",
          marginBottom: spacing.lg,
        },
        navItemText: { fontWeight: typography.weightBold, color: theme.colors.ink, fontSize: typography.sizeSm },
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        emptyText: { color: theme.colors.muted, textAlign: "center", marginTop: spacing.sm },
        epicGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
        epicTileWrapper: { width: "48%" },
        epicTile: { padding: spacing.sm },
        epicTileExpanded: { borderColor: theme.colors.primary },
        epicTileTitle: { fontSize: typography.sizeSm, fontWeight: typography.weightBold, color: theme.colors.ink, marginBottom: spacing.xs },
        epicTileMeta: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
        epicTileHeatmap: { marginTop: spacing.sm },
        priorityRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.xs },
        priorityButton: {
          width: 20,
          height: 20,
          borderWidth: 1,
          borderColor: theme.colors.ink,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        },
        priorityButtonText: { color: theme.colors.ink, fontWeight: "700", fontSize: 12 },
        priorityValue: { fontSize: 11, color: theme.colors.muted, fontWeight: "700" },
        expandedPanel: { marginTop: spacing.md },
        expandedTitle: {
          fontSize: typography.sizeMd,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
          marginBottom: spacing.sm,
        },
        questRowWrapper: { marginBottom: spacing.xs },
        questRow: { fontSize: typography.sizeSm, color: theme.colors.ink, paddingVertical: spacing.xs },
        questExpanded: { paddingLeft: spacing.md, marginBottom: spacing.xs },
        weekGroup: { marginBottom: spacing.sm },
        weekGroupTitle: {
          fontSize: 11,
          fontWeight: typography.weightBold,
          color: theme.colors.muted,
          textTransform: "uppercase",
          marginBottom: spacing.xs,
        },
        taskRow: { marginBottom: spacing.sm },
        taskRowTitle: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink },
        openLink: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.accent, marginTop: spacing.xs },
      }),
    [theme],
  );
}
