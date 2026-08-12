import type { QuestSummaryDto } from "@mypetproj/shared";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth } from "../theme/tokens";

interface SegmentedTimelineBarProps {
  quests: QuestSummaryDto[];
  height?: number;
}

/**
 * Полоска прогресса Эпика, разбитая на сегменты по квестам — ширина сегмента
 * пропорциональна estimatedDays (квест на 30 дней шире квеста на 10 дней),
 * а не просто "1 квест = 1/N полоски". Цвет сегмента — статус квеста.
 */
export function SegmentedTimelineBar({ quests, height = 14 }: SegmentedTimelineBarProps) {
  const styles = useStyles();

  if (quests.length === 0) {
    return <View style={[styles.track, { height }]} />;
  }

  return (
    <View style={[styles.track, { height }]}>
      {quests.map((quest) => (
        <View
          key={quest.id}
          style={[
            styles.segment,
            { flex: Math.max(quest.estimatedDays, 1) },
            quest.status === "COMPLETED" && styles.segmentDone,
            quest.status === "FAILED" && styles.segmentFailed,
          ]}
        />
      ))}
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        track: {
          flexDirection: "row",
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.background,
          overflow: "hidden",
          gap: 2,
        },
        segment: { backgroundColor: theme.colors.surface },
        segmentDone: { backgroundColor: theme.colors.success },
        segmentFailed: { backgroundColor: theme.colors.danger },
      }),
    [theme],
  );
}
