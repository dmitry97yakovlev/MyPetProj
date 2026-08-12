import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  /**
   * Если задан — ячейки становятся кликабельными: тап переключает выполнение
   * за этот день (0 = 6 дней назад … 6 = сегодня). Без обработчика сетка
   * остаётся только для просмотра (как раньше).
   */
  onToggleDay?: (dayIndex: number, currentlyDone: boolean) => void;
  /** Индекс дня, для которого сейчас идёт запрос — чтобы не давать тапать повторно и показать, что "в процессе". */
  pendingDayIndex?: number | null;
}

/** Недельная сетка выполнения задачи — по образцу "contribution graph", в стиле рун/печатей. */
export function WeeklyGrid({ days, onToggleDay, pendingDayIndex = null }: WeeklyGridProps) {
  const styles = useStyles();
  const letters = useMemo(last7DayLetters, []);

  return (
    <View style={styles.row}>
      {days.map((done, i) => {
        const mark = (
          <View style={[styles.mark, done && styles.markDone, pendingDayIndex === i && styles.markPending]}>
            {done ? <Text style={styles.check}>✓</Text> : null}
          </View>
        );
        return (
          <View key={i} style={styles.cell}>
            <Text style={styles.letter}>{letters[i]}</Text>
            {onToggleDay ? (
              <Pressable
                onPress={() => onToggleDay(i, done)}
                disabled={pendingDayIndex !== null}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
              >
                {mark}
              </Pressable>
            ) : (
              mark
            )}
          </View>
        );
      })}
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
        markPending: { opacity: 0.5 },
        check: { fontSize: 11, fontWeight: typography.weightBold, color: theme.colors.ink },
      }),
    [theme],
  );
}
