import type { JournalAutoEventDto, JournalAutoEventKind, JournalDayDto, JournalEntryDto, TodayTaskDto } from "@mypetproj/shared";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { TextField } from "../src/components/TextField";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "../src/lib/dailyTaskCategory";
import { useApi } from "../src/lib/useApi";
import { useAuthedFocusEffect } from "../src/lib/useAuthedFocusEffect";
import { useVoiceRecorder } from "../src/lib/useVoiceRecorder";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

const AUTO_EVENT_ICON: Record<JournalAutoEventKind, string> = {
  DAILY_TASK: "✅",
  QUEST: "🎯",
  EPIC_WIN: "🏆",
};

type FeedItem =
  | { type: "entry"; at: string; entry: JournalEntryDto }
  | { type: "auto"; at: string; event: JournalAutoEventDto };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayLabel(date: string): string {
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (date === todayIso()) return "Сегодня";
  if (date === yesterdayIso) return "Вчера";
  return new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

const MOOD_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function dayFeed(day: JournalDayDto): FeedItem[] {
  const items: FeedItem[] = [
    ...day.entries.map((entry): FeedItem => ({ type: "entry", at: entry.createdAt, entry })),
    ...day.autoEvents.map((event): FeedItem => ({ type: "auto", at: event.at, event })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export default function JournalScreen() {
  const api = useApi();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles();
  const [days, setDays] = useState<JournalDayDto[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isRecording, error: recordError, start, stop } = useVoiceRecorder();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [journalDays, tasks] = await Promise.all([
        api.get<JournalDayDto[]>("/journal?days=14"),
        api.get<TodayTaskDto[]>("/daily-tasks/today"),
      ]);
      setDays(journalDays);
      setTodayTasks(tasks);
    } catch {
      // Молча пропускаем — RefreshControl просто перестанет крутиться.
    } finally {
      setLoading(false);
    }
  }, [api]);

  useAuthedFocusEffect(load);

  async function onAddThought() {
    if (!draft.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await api.post("/journal", { content: draft.trim() });
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить запись");
    } finally {
      setPosting(false);
    }
  }

  async function onToggleRecording() {
    if (isRecording) {
      const recorded = await stop();
      if (!recorded) return;
      setPosting(true);
      setError(null);
      try {
        const formData = new FormData();
        if (recorded.platform === "web") {
          const blob = await (await fetch(recorded.uri)).blob();
          formData.append("audio", blob, "voice.webm");
        } else {
          // React Native FormData принимает {uri,name,type} для файлов — DOM-типы этого не знают, отсюда каст.
          formData.append("audio", { uri: recorded.uri, name: "voice.m4a", type: "audio/m4a" } as unknown as Blob);
        }
        await api.postForm("/journal/voice", formData);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить запись");
      } finally {
        setPosting(false);
      }
    } else {
      await start();
    }
  }

  function goToAutoEvent(event: JournalAutoEventDto) {
    if (event.kind === "EPIC_WIN" && event.epicWinId) router.push(`/epic-wins/${event.epicWinId}`);
    else if (event.questId) router.push(`/quests/${event.questId}`);
  }

  async function onSetMood(score: number) {
    try {
      await api.post("/journal/mood", { score });
      await load();
    } catch {
      // Тихо игнорируем — просто останется прежней/пустой отметка.
    }
  }

  const todayMood = days.find((d) => d.date === todayIso())?.moodScore ?? null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <ScreenTitle style={styles.title}>Дневник</ScreenTitle>
      <Text style={styles.hint}>
        Свои мысли — текстом или голосом — и то, что ты сегодня сделал по квестам и Эпикам, само появится здесь.
      </Text>

      <Card style={styles.composerCard}>
        <TextField
          label="Новая мысль"
          value={draft}
          onChangeText={setDraft}
          placeholder="Что сегодня в голове?"
          multiline
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {recordError ? <Text style={styles.error}>{recordError}</Text> : null}
        <View style={styles.composerRow}>
          <View style={styles.composerButton}>
            <Button label={posting ? "…" : "Записать текстом"} onPress={onAddThought} disabled={posting || isRecording} />
          </View>
          <View style={styles.composerButton}>
            <Button
              label={isRecording ? "⏹ Стоп" : "🎙️ Голосом"}
              variant="secondary"
              onPress={onToggleRecording}
              disabled={posting}
            />
          </View>
        </View>
      </Card>

      <Card style={styles.composerCard}>
        <Text style={styles.moodTitle}>Эмоциональная стабильность сегодня</Text>
        <Text style={styles.hint}>Насколько ты сегодня устойчив(а) эмоционально, по своим ощущениям — 1 совсем нет, 10 отлично.</Text>
        <View style={styles.moodRow}>
          {MOOD_SCALE.map((score) => {
            const active = todayMood === score;
            return (
              <Pressable
                key={score}
                onPress={() => onSetMood(score)}
                style={[styles.moodChip, active && styles.moodChipActive]}
              >
                <Text style={styles.moodChipText}>{score}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {todayTasks.length > 0 ? (
        <View style={styles.todaySection}>
          <Text style={styles.dayLabel}>Сегодня по категориям</Text>
          {CATEGORY_ORDER.map((category) => {
            const tasksInCategory = todayTasks.filter((t) => t.category === category);
            if (tasksInCategory.length === 0) return null;
            return (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryGroupTitle}>{CATEGORY_LABEL[category]}</Text>
                {tasksInCategory.map((task) => (
                  <Pressable key={task.id} onPress={() => router.push(`/quests/${task.questId}`)}>
                    <Card style={styles.taskRowCard}>
                      <Text style={styles.taskDoneMark}>{task.completedToday ? "✅" : "▢"}</Text>
                      <View style={styles.taskRowInfo}>
                        <Text style={[styles.taskRowTitle, task.completedToday && styles.taskRowTitleDone]} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <Text style={styles.taskRowMeta} numberOfLines={1}>
                          {task.questTitle}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </View>
      ) : null}

      {days.every((d) => d.entries.length === 0 && d.autoEvents.length === 0 && d.moodScore === null) && !loading ? (
        <Text style={styles.emptyText}>Пока пусто — напиши первую мысль выше или сделай что-нибудь по квестам.</Text>
      ) : null}

      {days.map((day) => {
        const feed = dayFeed(day);
        if (feed.length === 0 && day.moodScore === null) return null;
        return (
          <View key={day.date} style={styles.dayGroup}>
            <View style={styles.dayHeaderRow}>
              <Text style={styles.dayLabel}>{dayLabel(day.date)}</Text>
              {day.moodScore !== null ? <Text style={styles.moodBadge}>🙂 {day.moodScore}/10</Text> : null}
            </View>
            {feed.map((item, index) =>
              item.type === "entry" ? (
                <Card key={`entry-${item.entry.id}`} style={styles.entryCard}>
                  {item.entry.kind === "VOICE" ? (
                    <VoicePlayer
                      audioUrl={item.entry.audioUrl}
                      caption={item.entry.content}
                      transcript={item.entry.transcript}
                    />
                  ) : (
                    <Text style={styles.entryText}>{item.entry.content}</Text>
                  )}
                </Card>
              ) : (
                <Pressable key={`auto-${index}`} onPress={() => goToAutoEvent(item.event)}>
                  <View style={styles.autoRow}>
                    <Text style={styles.autoIcon}>{AUTO_EVENT_ICON[item.event.kind]}</Text>
                    <Text style={styles.autoText} numberOfLines={1}>
                      {item.event.title}
                    </Text>
                  </View>
                </Pressable>
              ),
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function VoicePlayer({
  audioUrl,
  caption,
  transcript,
}: {
  audioUrl: string | null;
  caption: string | null;
  transcript: string | null;
}) {
  const styles = useStyles();
  const [playing, setPlaying] = useState(false);

  async function onPlay() {
    if (!audioUrl) return;
    setPlaying(true);
    try {
      const url = audioUrl.startsWith("http") ? audioUrl : `${API_URL}${audioUrl}`;
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch {
      setPlaying(false);
    }
  }

  return (
    <View>
      <View style={styles.voiceRow}>
        <Pressable onPress={onPlay} disabled={playing} style={styles.voiceButton}>
          <Text style={styles.voiceButtonIcon}>{playing ? "▶️…" : "▶️"}</Text>
        </Pressable>
        <Text style={styles.entryText}>{caption || "Голосовая заметка"}</Text>
      </View>
      {transcript ? <Text style={styles.transcriptText}>«{transcript}»</Text> : null}
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: theme.colors.background },
        content: { padding: spacing.lg },
        title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: theme.colors.ink },
        hint: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
        composerCard: { marginBottom: spacing.lg },
        composerRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
        composerButton: { flex: 1 },
        moodTitle: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink, marginBottom: spacing.xs },
        moodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
        moodChip: {
          width: 36,
          height: 36,
          borderWidth: 2,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.background,
          alignItems: "center",
          justifyContent: "center",
        },
        moodChipActive: { backgroundColor: theme.colors.secondary },
        moodChipText: { fontWeight: typography.weightBold, color: theme.colors.ink },
        error: { color: theme.colors.danger, marginBottom: spacing.sm, fontWeight: "600" },
        emptyText: { color: theme.colors.muted, textAlign: "center", marginTop: spacing.lg },
        todaySection: { marginBottom: spacing.xl },
        categoryGroup: {
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 2,
          borderTopColor: theme.colors.muted,
        },
        categoryGroupTitle: {
          fontSize: typography.sizeSm,
          fontWeight: typography.weightBold,
          color: theme.colors.muted,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
        },
        taskRowCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
        taskDoneMark: { fontSize: typography.sizeLg, marginRight: spacing.sm },
        taskRowInfo: { flex: 1 },
        taskRowTitle: { fontSize: typography.sizeMd, fontWeight: "700", color: theme.colors.ink },
        taskRowTitleDone: { color: theme.colors.muted, textDecorationLine: "line-through" },
        taskRowMeta: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
        dayGroup: { marginBottom: spacing.lg },
        dayHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
        dayLabel: {
          fontSize: typography.sizeMd,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.accent,
          textTransform: "uppercase",
        },
        moodBadge: { fontSize: typography.sizeSm, color: theme.colors.ink, fontWeight: "700" },
        entryCard: { marginBottom: spacing.sm },
        entryText: { fontSize: typography.sizeMd, color: theme.colors.ink, flexShrink: 1 },
        voiceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        voiceButton: {
          width: 36,
          height: 36,
          borderWidth: 2,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.secondary,
          alignItems: "center",
          justifyContent: "center",
        },
        voiceButtonIcon: { fontSize: typography.sizeSm },
        transcriptText: {
          fontSize: typography.sizeSm,
          color: theme.colors.muted,
          fontStyle: "italic",
          marginTop: spacing.xs,
          marginLeft: 44,
        },
        autoRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs, paddingLeft: spacing.xs },
        autoIcon: { fontSize: typography.sizeMd, marginRight: spacing.sm },
        autoText: { fontSize: typography.sizeSm, color: theme.colors.muted, flexShrink: 1 },
      }),
    [theme],
  );
}

