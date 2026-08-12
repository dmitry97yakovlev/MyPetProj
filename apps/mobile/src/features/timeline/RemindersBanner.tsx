import type { TimelineEntryDto } from "@mypetproj/shared";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { formatDaysLeft } from "../../lib/date";
import { useApi } from "../../lib/useApi";
import { useAuthedFocusEffect } from "../../lib/useAuthedFocusEffect";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, typography } from "../../theme/tokens";

const KIND_ICON: Record<TimelineEntryDto["kind"], string> = { QUEST: "🎯", EPIC_WIN: "🏆" };
const URGENT_WITHIN_DAYS = 3;

/**
 * Напоминания внутри приложения — не push-уведомления и не запись в системный
 * календарь (это требует отдельных разрешений/интеграций), а заметный баннер
 * на главном экране про дедлайны, до которых осталось совсем немного или они
 * уже просрочены. Виден только пока открыто приложение.
 */
export function RemindersBanner() {
  const api = useApi();
  const router = useRouter();
  const styles = useStyles();
  const [entries, setEntries] = useState<TimelineEntryDto[]>([]);

  const load = useCallback(async () => {
    try {
      setEntries(await api.get<TimelineEntryDto[]>("/timeline"));
    } catch {
      // Молча пропускаем — баннер просто не покажется.
    }
  }, [api]);

  useAuthedFocusEffect(load);

  const urgent = entries.filter((e) => {
    if (e.status !== "ACTIVE") return false;
    const days = Math.ceil((new Date(e.deadline).getTime() - Date.now()) / 86_400_000);
    return days <= URGENT_WITHIN_DAYS;
  });

  if (urgent.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>🔔 Напоминания</Text>
      {urgent.map((entry) => (
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
            <Text style={styles.rowDeadline}>{formatDaysLeft(entry.deadline)}</Text>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.lg, borderColor: theme.colors.danger },
        title: {
          fontSize: typography.sizeMd,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.danger,
        },
        row: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
        icon: { fontSize: 20, marginRight: spacing.sm },
        rowInfo: { flex: 1 },
        rowTitle: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink },
        rowDeadline: { fontSize: 11, color: theme.colors.danger, fontWeight: "700", marginTop: 2 },
      }),
    [theme],
  );
}
