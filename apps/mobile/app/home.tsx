import type { DailyTaskDto, EpicWinSummaryDto, QuestDto, QuestSummaryDto } from "@mypetproj/shared";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { CharacterPortrait } from "../src/components/CharacterPortrait";
import { ProgressBar } from "../src/components/ProgressBar";
import { SegmentedTimelineBar } from "../src/components/SegmentedTimelineBar";
import { ThemedBackground } from "../src/components/ThemedBackground";
import { WeeklyGrid } from "../src/components/WeeklyGrid";
import { useAuth } from "../src/features/auth/AuthContext";
import { useGamification } from "../src/features/gamification/GamificationContext";
import { TimelineWidget } from "../src/features/timeline/TimelineWidget";
import { useApi } from "../src/lib/useApi";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

const QUEST_STATUS_ICON: Record<string, string> = { ACTIVE: "▸", COMPLETED: "✓", FAILED: "✗" };
const MEDAL_ICON: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
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

export default function HomeScreen() {
  const { status, user, logout } = useAuth();
  const { character, epicWins, loading, refreshCharacter, refreshEpicWins } = useGamification();
  const router = useRouter();
  const api = useApi();
  const styles = useStyles();
  const { theme } = useTheme();
  const [expandedEpicId, setExpandedEpicId] = useState<string | null>(null);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [questDetails, setQuestDetails] = useState<Record<string, QuestDto>>({});
  const [questLoadingId, setQuestLoadingId] = useState<string | null>(null);

  const loadQuestDetail = useCallback(
    async (questId: string) => {
      if (questDetails[questId]) return;
      setQuestLoadingId(questId);
      try {
        const data = await api.get<QuestDto>(`/quests/${questId}`);
        setQuestDetails((prev) => ({ ...prev, [questId]: data }));
      } catch {
        // Молча пропускаем — раскрытый квест просто останется без списка задач.
      } finally {
        setQuestLoadingId(null);
      }
    },
    [api, questDetails],
  );

  if (status !== "signedIn" || !user) {
    return <Redirect href="/login" />;
  }

  async function onRefresh() {
    await Promise.all([refreshCharacter(), refreshEpicWins()]);
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

        {character ? (
          <Pressable onPress={() => router.push("/character")}>
            <Card style={styles.characterCard}>
              <View style={styles.characterHeaderRow}>
                <CharacterPortrait avatarIcon={character.avatarIcon} equipped={character.equipped} size="compact" />
                <View style={styles.characterHeaderInfo}>
                  <View style={styles.characterNameRow}>
                    <Text style={styles.characterTitle}>Уровень {character.level}</Text>
                    <Text style={styles.characterName} numberOfLines={1}>
                      {user.displayName || user.email}
                    </Text>
                  </View>
                  <Text style={styles.characterHint}>Персонаж и экипировка →</Text>

                  <View style={styles.compactBarRow}>
                    <Text style={styles.compactBarLabel}>XP</Text>
                    <View style={styles.compactBarTrack}>
                      <ProgressBar value={character.xp / character.xpToNextLevel} color={theme.colors.accent} height={8} />
                    </View>
                  </View>
                  <View style={styles.compactBarRow}>
                    <Text style={styles.compactBarLabel}>HP</Text>
                    <View style={styles.compactBarTrack}>
                      <ProgressBar value={character.hp / character.maxHp} color={theme.colors.danger} height={8} />
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        ) : null}

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
          <Pressable style={styles.navItemWide} onPress={() => router.push("/character")}>
            <Text style={styles.navItemText}>🎒 Персонаж и экипировка</Text>
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

interface EpicTileProps {
  epic: EpicWinSummaryDto;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onChangePriority: (delta: number) => void;
}

function EpicTile({ epic, expanded, onToggle, onOpen, onChangePriority }: EpicTileProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable onPress={onToggle} onLongPress={onOpen} style={styles.epicTileWrapper}>
      <Card style={[styles.epicTile, expanded && styles.epicTileExpanded]}>
        <View style={styles.epicTileHeader}>
          {epic.rank ? <Text style={styles.medal}>{MEDAL_ICON[epic.rank]}</Text> : null}
          <Text style={styles.epicTileTitle} numberOfLines={2}>
            {epic.title}
          </Text>
        </View>

        <SegmentedTimelineBar quests={epic.quests} height={8} />
        <Text style={styles.epicTileMeta}>
          {epic.progress}% · {epic.questCount} {epic.questCount === 1 ? "квест" : "квестов"}
        </Text>

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
}

function QuestRow({ quest, expanded, detail, loading, onToggle }: QuestRowProps) {
  const styles = useStyles();
  const tasks = detail?.dailyTasks ?? [];
  const grouped = tasks.length > TASKS_PER_WEEK_GROUP_THRESHOLD ? groupTasksByWeek(tasks) : null;

  return (
    <View style={styles.questRowWrapper}>
      <Pressable onPress={onToggle}>
        <Text style={styles.questRow} numberOfLines={1}>
          {expanded ? "▾" : QUEST_STATUS_ICON[quest.status] ?? "▸"} {quest.title}
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
                    <TaskRow key={task.id} task={task} />
                  ))}
                </View>
              ))
            : !loading
              ? tasks.map((task) => <TaskRow key={task.id} task={task} />)
              : null}
        </View>
      ) : null}
    </View>
  );
}

function TaskRow({ task }: { task: DailyTaskDto }) {
  const styles = useStyles();
  return (
    <View style={styles.taskRow}>
      <Text style={styles.taskRowTitle} numberOfLines={1}>
        {task.title}
      </Text>
      <WeeklyGrid days={task.last7Days} />
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
        characterCard: { marginBottom: spacing.lg, marginTop: spacing.md },
        characterHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
        characterHeaderInfo: { flex: 1 },
        characterHint: { fontSize: typography.sizeSm, color: theme.colors.accent, fontWeight: "700" },
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
        characterNameRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
        characterTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
        },
        characterName: { fontSize: typography.sizeSm, color: theme.colors.muted, flexShrink: 1 },
        compactBarRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs, gap: spacing.xs },
        compactBarLabel: { fontSize: 10, fontWeight: "700", color: theme.colors.muted, width: 20 },
        compactBarTrack: { width: 120 },
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
        epicTileHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.xs },
        medal: { fontSize: typography.sizeMd, marginRight: spacing.xs },
        epicTileTitle: { flex: 1, fontSize: typography.sizeSm, fontWeight: typography.weightBold, color: theme.colors.ink },
        epicTileMeta: { fontSize: 11, color: theme.colors.muted, marginTop: spacing.xs },
        priorityRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs, gap: spacing.xs },
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
