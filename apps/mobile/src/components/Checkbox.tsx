import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, spacing, typography } from "../theme/tokens";

interface CheckboxProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function Checkbox({ label, value, onChange }: CheckboxProps) {
  const styles = useStyles();
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.box, value && styles.boxChecked]}>
        {value ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
        box: {
          width: 24,
          height: 24,
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.sm,
        },
        boxChecked: { backgroundColor: theme.colors.secondary },
        check: { fontWeight: typography.weightBold, color: theme.colors.ink },
        label: { fontSize: typography.sizeMd, color: theme.colors.ink, fontWeight: "600", flexShrink: 1 },
      }),
    [theme],
  );
}
