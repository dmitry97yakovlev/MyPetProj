import type { EpicWinSummaryDto } from "@mypetproj/shared";
import { Redirect, useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { ProgressBar } from "../src/components/ProgressBar";
import { ThemedBackground } from "../src/components/ThemedBackground";
import { ThemeSwitcher } from "../src/components/ThemeSwitcher";
import { CoachTipCard } from "../src/features/aiCoach/CoachTipCard";
import { useAuth } from "../src/features/auth/AuthContext";
import { useGamification } from "../src/features/gamification/GamificationContext";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

export default function HomeScreen() {
  const { status, user, logout } = useAuth();
  const { character, epicWins, loading, refreshCharacter, refreshEpicWins } = useGamification();
  const router = useRouter();
  const styles = useStyles();
  const { theme } = useTheme();

  if (status !== "signedIn" || !user) {
    return <Redirect href="/login" />;
  }

  async function onRefresh() {
    await Promise.all([refreshCharacter(), refreshEpicWins()]);
  }

  return (
    <ThemedBackground>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={epicWins}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.hello}>Привет, {user.displayName || user.email}!</Text>
              <Pressable onPress={logout}>
                <Text style={styles.logout}>Выйти</Text>
              </Pressable>
            </View>

            {user.isAdmin ? <Text style={styles.badge}>ADMIN</Text> : null}

            <ThemeSwitcher />

            {character ? (
              <Pressable onPress={() => router.push("/character")}>
                <Card style={styles.characterCard}>
                  <View style={styles.characterHeaderRow}>
                    <Text style={styles.avatarIcon}>{character.avatarIcon}</Text>
                    <View style={styles.characterHeaderInfo}>
                      <Text style={styles.characterTitle}>Уровень {character.level}</Text>
                      <Text style={styles.characterHint}>Персонаж и экипировка →</Text>
                    </View>
                  </View>

                  <Text style={styles.barLabel}>
                    XP: {character.xp} / {character.xpToNextLevel}
                  </Text>
                  <ProgressBar value={character.xp / character.xpToNextLevel} color={theme.colors.accent} />

                  <Text style={[styles.barLabel, styles.hpLabel]}>
                    HP: {character.hp} / {character.maxHp}
                  </Text>
                  <ProgressBar value={character.hp / character.maxHp} color={theme.colors.danger} />

                  <Text style={[styles.barLabel, styles.hpLabel]}>
                    Прогресс к предмету: {character.itemProgress} / {character.itemProgressToNext}
                  </Text>
                  <ProgressBar
                    value={character.itemProgress / character.itemProgressToNext}
                    color={theme.colors.secondary}
                  />
                </Card>
              </Pressable>
            ) : null}

            <CoachTipCard />

            <View style={styles.navRow}>
              <Pressable style={styles.navItem} onPress={() => router.push("/friends")}>
                <Text style={styles.navItemText}>👥 Друзья</Text>
              </Pressable>
              <Pressable style={styles.navItem} onPress={() => router.push("/leaderboard")}>
                <Text style={styles.navItemText}>🏆 Рейтинг</Text>
              </Pressable>
              <Pressable style={styles.navItem} onPress={() => router.push("/timeline")}>
                <Text style={styles.navItemText}>🗓 Таймлайн</Text>
              </Pressable>
            </View>
            <View style={styles.navRow}>
              <Pressable style={styles.navItemWide} onPress={() => router.push("/character")}>
                <Text style={styles.navItemText}>🎒 Персонаж и экипировка</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Твои Epic Win</Text>
            <Button label="+ Новая Epic Win" onPress={() => router.push("/epic-wins/new")} />
          </View>
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>Пока пусто — создай свою первую Epic Win выше.</Text> : null
        }
        renderItem={({ item }) => <EpicWinListItem item={item} onPress={() => router.push(`/epic-wins/${item.id}`)} />}
      />
    </ThemedBackground>
  );
}

function EpicWinListItem({ item, onPress }: { item: EpicWinSummaryDto; onPress: () => void }) {
  const styles = useStyles();
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.epicWinCard}>
        <Text style={styles.epicWinTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.epicWinDescription}>{item.description}</Text> : null}
        <View style={styles.progressRow}>
          <View style={styles.progressBarWrapper}>
            <ProgressBar value={item.progress / 100} color={theme.colors.success} />
          </View>
          <Text style={styles.progressLabel}>{item.progress}%</Text>
        </View>
        <Text style={styles.meta}>
          {item.questCount} {item.questCount === 1 ? "квест" : "квестов"}
          {item.memberCount > 1 ? ` · ${item.memberCount} участников` : ""}
          {item.status !== "ACTIVE" ? ` · ${item.status === "COMPLETED" ? "завершена" : "в архиве"}` : ""}
        </Text>
      </Card>
    </Pressable>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        list: { flex: 1 },
        listContent: { padding: spacing.lg },
        headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
        hello: { fontSize: typography.sizeLg, fontWeight: typography.weightBold, color: theme.colors.ink, flexShrink: 1 },
        logout: { color: theme.colors.accent, fontWeight: "700" },
        badge: {
          alignSelf: "flex-start",
          backgroundColor: theme.colors.primary,
          // Тёмный текст на золоте/акценте — светлый (ink) тут почти не читается.
          color: theme.colors.background,
          fontWeight: typography.weightBold,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderWidth: 2,
          borderColor: theme.colors.ink,
          marginBottom: spacing.md,
        },
        characterCard: { marginBottom: spacing.lg, marginTop: spacing.md },
        characterHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
        avatarIcon: { fontSize: 40, marginRight: spacing.md },
        characterHeaderInfo: { flex: 1 },
        characterHint: { fontSize: typography.sizeSm, color: theme.colors.accent, fontWeight: "700" },
        navRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
        navItem: {
          flex: 1,
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.sm,
          alignItems: "center",
        },
        navItemWide: {
          flex: 1,
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.sm,
          alignItems: "center",
          marginBottom: spacing.lg,
        },
        navItemText: { fontWeight: typography.weightBold, color: theme.colors.ink, fontSize: typography.sizeSm },
        characterTitle: { fontSize: typography.sizeLg, fontWeight: typography.weightBold, color: theme.colors.ink },
        barLabel: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink, marginBottom: spacing.xs },
        hpLabel: { marginTop: spacing.sm },
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          color: theme.colors.ink,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        emptyText: { color: theme.colors.muted, textAlign: "center", marginTop: spacing.xl },
        epicWinCard: { marginTop: spacing.md },
        epicWinTitle: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink },
        epicWinDescription: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs },
        progressRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.sm },
        progressBarWrapper: { flex: 1 },
        progressLabel: { fontWeight: "700", color: theme.colors.ink, width: 44, textAlign: "right" },
        meta: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.sm },
      }),
    [theme],
  );
}
