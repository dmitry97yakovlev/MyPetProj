import type { TimelineEntryDto } from "@mypetproj/shared";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { Card } from "../src/components/Card";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { formatDeadline, isOverdue } from "../src/lib/date";
import { useApi } from "../src/lib/useApi";
import { useAuthedFocusEffect } from "../src/lib/useAuthedFocusEffect";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

const STATUS_LABEL: Record<TimelineEntryDto["status"], string> = {
  ACTIVE: "В процессе",
  COMPLETED: "Завершён",
  FAILED: "Провален",
};

export default function TimelineScreen() {
  const api = useApi();
  const router = useRouter();
  const styles = useStyles();
  const [entries, setEntries] = useState<TimelineEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.get<TimelineEntryDto[]>("/timeline"));
    } catch {
      // Молча пропускаем — RefreshControl просто перестанет крутиться.
    } finally {
      setLoading(false);
    }
  }, [api]);

  useAuthedFocusEffect(load);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <ScreenTitle style={styles.title}>Таймлайн</ScreenTitle>
      <Text style={styles.hint}>Все квесты с дедлайном, по всем твоим Epic Win — ближайшие сверху.</Text>

      {entries.length === 0 && !loading ? (
        <Text style={styles.emptyText}>Пока нет квестов с дедлайном.</Text>
      ) : null}

      {entries.map((entry) => {
        const overdue = entry.status === "ACTIVE" && isOverdue(entry.deadline);
        return (
          <Pressable key={entry.questId} onPress={() => router.push(`/quests/${entry.questId}`)}>
            <Card style={[styles.card, overdue && styles.cardOverdue]}>
              <Text style={styles.questTitle}>{entry.questTitle}</Text>
              <Text style={styles.epicWinTitle}>{entry.epicWinTitle}</Text>
              <Text style={[styles.deadline, overdue && styles.deadlineOverdue]}>
                {formatDeadline(entry.deadline)}
                {overdue ? " · просрочено" : ""} · {STATUS_LABEL[entry.status]}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
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
        emptyText: { color: theme.colors.muted },
        card: { marginBottom: spacing.sm },
        // Тёмно-красная подложка вместо светло-розовой — под тёмный фон темы.
        cardOverdue: { backgroundColor: "#2A1414" },
        questTitle: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink },
        epicWinTitle: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs },
        deadline: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.muted, marginTop: spacing.xs },
        deadlineOverdue: { color: theme.colors.danger },
      }),
    [theme],
  );
}
