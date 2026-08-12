import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BackgroundPicker } from "../src/components/BackgroundPicker";
import { Card } from "../src/components/Card";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { ThemeSwitcher } from "../src/components/ThemeSwitcher";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

const OPACITY_STEPS = [0.4, 0.6, 0.8, 1] as const;

export default function SettingsScreen() {
  const { panelOpacity, setPanelOpacity } = useTheme();
  const styles = useStyles();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenTitle style={styles.title}>Настройки</ScreenTitle>

      <Text style={styles.sectionTitle}>Тема оформления</Text>
      <Card style={styles.card}>
        <ThemeSwitcher />
      </Card>

      <Text style={styles.sectionTitle}>Фон</Text>
      <Card style={styles.card}>
        <BackgroundPicker />
      </Card>

      <Text style={styles.sectionTitle}>Прозрачность панелей</Text>
      <Card style={styles.card}>
        <Text style={styles.hint}>
          Насколько видна фоновая картинка сквозь карточки — меньше % значит панели прозрачнее.
        </Text>
        <View style={styles.opacityRow}>
          {OPACITY_STEPS.map((value) => {
            const active = Math.abs(panelOpacity - value) < 0.01;
            return (
              <Pressable
                key={value}
                onPress={() => setPanelOpacity(value)}
                style={[styles.opacityChip, active && styles.opacityChipActive]}
              >
                <Text style={styles.opacityChipText}>{Math.round(value * 100)}%</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
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
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        card: { marginBottom: spacing.lg },
        hint: { fontSize: typography.sizeSm, color: theme.colors.muted, marginBottom: spacing.md },
        opacityRow: { flexDirection: "row", gap: spacing.sm },
        opacityChip: {
          flex: 1,
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.background,
          paddingVertical: spacing.sm,
          alignItems: "center",
        },
        opacityChipActive: { backgroundColor: theme.colors.secondary },
        opacityChipText: { fontWeight: typography.weightBold, color: theme.colors.ink },
      }),
    [theme],
  );
}
