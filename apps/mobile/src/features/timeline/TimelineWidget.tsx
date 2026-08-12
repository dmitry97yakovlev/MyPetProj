import type { TimelineEntryDto } from "@mypetproj/shared";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { formatDeadline, isOverdue } from "../../lib/date";
import { useApi } from "../../lib/useApi";
import { useAuthedFocusEffect } from "../../lib/useAuthedFocusEffect";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, typography } from "../../theme/tokens";

const KIND_ICON: Record<TimelineEntryDto["kind"], string> = { QUEST: "🎯", EPIC_WIN: "🏆" };

/** Компактная витрина ближайших дедлайнов (квесты + сами Эпики) — для главного экрана. */
export function TimelineWidget({ limit = 4 }: { limit?: number }) {
  const api = useApi();
  const router = useRouter();
  const styles = useStyles();
  const [entries, setEntries] = useState<TimelineEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setEntries(await api.get<TimelineEntryDto[]>("/timeline"));
    } catch {
      // Молча пропускаем — виджет просто не покажет ничего.
    } finally {
      setLoading(false);
    }
  }, [api]);

  useAuthedFocusEffect(load);

  const upcoming = entries.filter((e) => e.status === "ACTIVE").slice(0, limit);
  if (!loading && upcoming.length === 0) return null;
  if (upcoming.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🗓 Ближайшие дедлайны</Text>
        <Pressable onPress={() => router.push("/timeline")}>
          <Text style={styles.link}>Все →</Text>
        </Pressable>
      </View>

      {upcoming.map((entry) => {
        const overdue = isOverdue(entry.deadline);
        return (
          <Pressable
            key={`${entry.kind}-${entry.id}`}
            onPress={() => router.push(entry.kind === "QUEST" ? `/quests/${entry.id}` : `/epic-wins/${entry.id}`)}
            style={styles.row}
          >
            <Text style={styles.icon}>{KIND_ICON[entry.kind]}</Text>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {entry.title}
              </Text>
              <Text style={[styles.rowDeadline, overdue && styles.rowDeadlineOverdue]}>
                {formatDeadline(entry.deadline)}
                {overdue ? " · просрочено" : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.lg },
        headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
        title: {
          fontSize: typography.sizeMd,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
        },
        link: { color: theme.colors.accent, fontWeight: "700", fontSize: typography.sizeSm },
        row: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
        icon: { fontSize: 20, marginRight: spacing.sm },
        rowInfo: { flex: 1 },
        rowTitle: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink },
        rowDeadline: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
        rowDeadlineOverdue: { color: theme.colors.danger },
      }),
    [theme],
  );
}
