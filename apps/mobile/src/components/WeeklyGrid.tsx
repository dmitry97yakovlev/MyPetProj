import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

const DAY_LETTERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

/** Буквы дней недели для последних 7 календарных дней (last7Days[6] — сегодня), от старого к новому. */
function last7DayLetters(): string[] {
  const today = new Date();
  const letters: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // getDay(): 0=Вс..6=Сб → сдвигаем на Пн=0
    letters.push(DAY_LETTERS[(d.getDay() + 6) % 7]);
  }
  return letters;
}

interface WeeklyGridProps {
  /** 7 значений, от самого старого дня к сегодняшнему (см. DailyTaskDto.last7Days). */
  days: boolean[];
}

/** Недельная сетка выполнения задачи — по образцу "contribution graph", в стиле рун/печатей. */
export function WeeklyGrid({ days }: WeeklyGridProps) {
  const styles = useStyles();
  const letters = useMemo(last7DayLetters, []);

  return (
    <View style={styles.row}>
      {days.map((done, i) => (
        <View key={i} style={styles.cell}>
          <Text style={styles.letter}>{letters[i]}</Text>
          <View style={[styles.mark, done && styles.markDone]}>{done ? <Text style={styles.check}>✓</Text> : null}</View>
        </View>
      ))}
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: "row", gap: 3, marginTop: spacing.xs },
        cell: { alignItems: "center" },
        letter: { fontSize: 9, color: theme.colors.muted, marginBottom: 2, textTransform: "uppercase" },
        mark: {
          width: 20,
          height: 20,
          borderWidth: 1,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.background,
          alignItems: "center",
          justifyContent: "center",
        },
        markDone: { backgroundColor: theme.colors.secondary },
        check: { fontSize: 11, fontWeight: typography.weightBold, color: theme.colors.ink },
      }),
    [theme],
  );
}
