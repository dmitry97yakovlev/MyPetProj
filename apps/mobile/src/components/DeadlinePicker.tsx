import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, spacing, typography } from "../theme/tokens";
import { TextField } from "./TextField";

interface DeadlinePickerProps {
  /** Дата в формате YYYY-MM-DD или null, если дедлайна нет. */
  value: string | null;
  onChange: (value: string | null) => void;
}

const PRESETS: { label: string; days: number }[] = [
  { label: "+1 неделя", days: 7 },
  { label: "+1 месяц", days: 30 },
  { label: "+3 месяца", days: 90 },
];

function addDaysIsoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DeadlinePicker({ value, onChange }: DeadlinePickerProps) {
  const styles = useStyles();
  const [customMode, setCustomMode] = useState(false);
  const isPresetActive = (days: number) => value === addDaysIsoDate(days);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Дедлайн (необязательно)</Text>
      <View style={styles.chips}>
        <Pressable
          style={[styles.chip, !value && !customMode && styles.chipActive]}
          onPress={() => {
            setCustomMode(false);
            onChange(null);
          }}
        >
          <Text style={[styles.chipLabel, !value && !customMode && styles.chipLabelActive]}>Без дедлайна</Text>
        </Pressable>

        {PRESETS.map((preset) => {
          const active = !customMode && isPresetActive(preset.days);
          return (
            <Pressable
              key={preset.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setCustomMode(false);
                onChange(addDaysIsoDate(preset.days));
              }}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{preset.label}</Text>
            </Pressable>
          );
        })}

        <Pressable style={[styles.chip, customMode && styles.chipActive]} onPress={() => setCustomMode(true)}>
          <Text style={[styles.chipLabel, customMode && styles.chipLabelActive]}>Своя дата</Text>
        </Pressable>
      </View>

      {customMode ? (
        <TextField
          label="Дата (ГГГГ-ММ-ДД)"
          value={value ?? ""}
          onChangeText={(text) => onChange(text || null)}
          placeholder="2026-12-31"
        />
      ) : null}
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginBottom: spacing.md },
        label: {
          fontWeight: typography.weightBold,
          fontSize: typography.sizeSm,
          textTransform: "uppercase",
          marginBottom: spacing.xs,
          color: theme.colors.ink,
        },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
        chip: {
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
        },
        chipActive: { backgroundColor: theme.colors.secondary },
        chipLabel: { fontWeight: "700", fontSize: typography.sizeSm, color: theme.colors.ink },
        chipLabelActive: { color: theme.colors.ink },
      }),
    [theme],
  );
}
