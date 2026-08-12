import type { EpicActivityDayDto } from "@mypetproj/shared";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { hexToRgba } from "../theme/tokens";

interface ActivityHeatmapProps {
  /** Последние N дней, от самого старого к сегодняшнему (см. EpicWinSummaryDto.activity). */
  days: EpicActivityDayDto[];
  /** Компактный размер ячеек — для плитки Эпика на главном экране. */
  compact?: boolean;
}

/** Понедельник=0 .. воскресенье=6, для выравнивания первой недели по дням недели, как в GitHub. */
function dayOfWeekMonFirst(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

/**
 * GitHub-style тепловая сетка: столбцы — недели, строки — дни недели (Пн..Вс).
 * Первая неделя дополняется пустыми ячейками слева, чтобы дни недели совпадали
 * по горизонтали с остальными столбцами.
 */
export function ActivityHeatmap({ days, compact = false }: ActivityHeatmapProps) {
  const styles = useStyles(compact);
  const { theme } = useTheme();

  const columns = useMemo(() => {
    if (days.length === 0) return [];
    const leadingEmpty = dayOfWeekMonFirst(days[0].date);
    const padded: (EpicActivityDayDto | null)[] = [...Array(leadingEmpty).fill(null), ...days];
    const cols: (EpicActivityDayDto | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  function cellColor(day: EpicActivityDayDto | null): string {
    if (!day || day.ratio <= 0) return theme.colors.surface;
    if (day.ratio < 0.34) return hexToRgba(theme.colors.success, 0.35);
    if (day.ratio < 0.67) return hexToRgba(theme.colors.success, 0.65);
    return theme.colors.success;
  }

  return (
    <View style={styles.grid}>
      {columns.map((col, colIndex) => (
        <View key={colIndex} style={styles.column}>
          {col.map((day, rowIndex) => (
            <View
              key={rowIndex}
              style={[styles.cell, { backgroundColor: cellColor(day) }, !day && styles.cellGhost]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function useStyles(compact: boolean) {
  const { theme } = useTheme();
  return useMemo(() => {
    const cellSize = compact ? 6 : 11;
    const gap = compact ? 2 : 3;
    return StyleSheet.create({
      grid: { flexDirection: "row", gap, alignSelf: "flex-start" },
      column: { gap },
      cell: {
        width: cellSize,
        height: cellSize,
        borderWidth: 1,
        borderColor: theme.colors.ink,
      },
      cellGhost: { opacity: 0, borderWidth: 0 },
    });
  }, [theme, compact]);
}
