import { AVATAR_CHARACTERS } from "@mypetproj/shared";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BackgroundPicker } from "../src/components/BackgroundPicker";
import { Card } from "../src/components/Card";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { ThemeSwitcher } from "../src/components/ThemeSwitcher";
import { useGamification } from "../src/features/gamification/GamificationContext";
import { useApi } from "../src/lib/useApi";
import { useTheme } from "../src/theme/ThemeContext";
import { borderWidth, spacing, typography } from "../src/theme/tokens";

const OPACITY_STEPS = [0.4, 0.6, 0.8, 1] as const;

export default function SettingsScreen() {
  const { panelOpacity, setPanelOpacity } = useTheme();
  const { character, refreshCharacter } = useGamification();
  const api = useApi();
  const styles = useStyles();
  const [busyId, setBusyId] = useState<string | null>(null);

  const onPickAvatar = useCallback(
    async (icon: string) => {
      setBusyId(icon);
      try {
        await api.post("/character/avatar", { icon });
        await refreshCharacter();
      } catch {
        // Тихо игнорируем — иконка просто не поменяется, кнопка снова активна.
      } finally {
        setBusyId(null);
      }
    },
    [api, refreshCharacter],
  );

  const franchises: [string, typeof AVATAR_CHARACTERS][] = [];
  for (const avatarCharacter of AVATAR_CHARACTERS) {
    const group = franchises.find(([name]) => name === avatarCharacter.franchise);
    if (group) group[1].push(avatarCharacter);
    else franchises.push([avatarCharacter.franchise, [avatarCharacter]]);
  }

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

      {character ? (
        <>
          <Text style={styles.sectionTitle}>Персонаж</Text>
          {franchises.map(([franchise, characters]) => (
            <Card key={franchise} style={styles.card}>
              <Text style={styles.franchiseTitle}>{franchise}</Text>
              <View style={styles.avatarPickerRow}>
                {characters.map((avatarCharacter) => {
                  const active = avatarCharacter.id === character.avatarIcon;
                  return (
                    <Pressable
                      key={avatarCharacter.id}
                      onPress={() => onPickAvatar(avatarCharacter.id)}
                      disabled={busyId === avatarCharacter.id}
                      style={[styles.avatarOption, active && styles.avatarOptionActive]}
                    >
                      <Image source={{ uri: avatarCharacter.imageUrl }} style={styles.avatarOptionImage} resizeMode="cover" />
                      <Text style={styles.avatarOptionName}>{avatarCharacter.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          ))}
        </>
      ) : null}
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
        franchiseTitle: {
          fontSize: typography.sizeSm,
          fontWeight: typography.weightBold,
          color: theme.colors.accent,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
        },
        avatarPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        avatarOption: {
          width: 96,
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.background,
          alignItems: "center",
          padding: 2,
        },
        avatarOptionActive: { borderColor: theme.colors.primary, borderWidth: borderWidth + 1 },
        avatarOptionImage: { width: 92, height: 124 },
        avatarOptionName: { fontSize: 11, fontWeight: "700", color: theme.colors.ink, marginTop: 2, textAlign: "center" },
      }),
    [theme],
  );
}
