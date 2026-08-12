import type { LeaderboardEntryDto, LeaderboardScope } from "@mypetproj/shared";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../src/components/Card";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { useApi } from "../src/lib/useApi";
import { useAuthedFocusEffect } from "../src/lib/useAuthedFocusEffect";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

const TABS: { value: LeaderboardScope; label: string }[] = [
  { value: "global", label: "Общий" },
  { value: "friends", label: "Друзья" },
];

export default function LeaderboardScreen() {
  const api = useApi();
  const styles = useStyles();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [entries, setEntries] = useState<LeaderboardEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextScope: LeaderboardScope) => {
      setLoading(true);
      try {
        const data = await api.get<LeaderboardEntryDto[]>(`/leaderboard?scope=${nextScope}`);
        setEntries(data);
      } catch {
        // Молча пропускаем — RefreshControl просто перестанет крутиться.
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useAuthedFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(scope)} />}
    >
      <ScreenTitle style={styles.title}>Рейтинг</ScreenTitle>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.value}
            onPress={() => setScope(tab.value)}
            style={[styles.tab, scope === tab.value && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, scope === tab.value && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {entries.length === 0 && !loading ? (
        <Text style={styles.emptyText}>
          {scope === "friends" ? "Добавь друзей, чтобы увидеть их здесь." : "Пока никого нет."}
        </Text>
      ) : null}

      {entries.map((entry) => (
        <Card key={entry.userId} style={[styles.row, entry.isMe && styles.rowMe]}>
          <Text style={styles.rank}>#{entry.rank}</Text>
          <View style={styles.rowInfo}>
            <Text style={styles.name}>
              {entry.displayName || entry.email}
              {entry.isMe ? " (ты)" : ""}
            </Text>
            <Text style={styles.meta}>
              Уровень {entry.level} · {entry.xp} XP
            </Text>
          </View>
        </Card>
      ))}
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
        title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: theme.colors.ink, marginBottom: spacing.lg },
        tabs: { flexDirection: "row", marginBottom: spacing.lg, gap: spacing.sm },
        tab: {
          flex: 1,
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.sm,
          alignItems: "center",
        },
        tabActive: { backgroundColor: theme.colors.secondary },
        tabLabel: { fontWeight: typography.weightBold, color: theme.colors.ink, textTransform: "uppercase" },
        tabLabelActive: { color: theme.colors.ink },
        emptyText: { color: theme.colors.muted },
        row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
        rowMe: { backgroundColor: theme.colors.secondary },
        rank: { fontSize: typography.sizeLg, fontWeight: typography.weightBold, color: theme.colors.ink, width: 48 },
        rowInfo: { flex: 1 },
        name: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink },
        meta: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs },
      }),
    [theme],
  );
}
