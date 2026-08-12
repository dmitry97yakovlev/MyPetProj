import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth } from "../theme/tokens";

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, color, height = 16 }: ProgressBarProps) {
  const { theme } = useTheme();
  const styles = useStyles();
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color ?? theme.colors.primary }]} />
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        track: {
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        },
        fill: {
          height: "100%",
        },
      }),
    [theme],
  );
}
