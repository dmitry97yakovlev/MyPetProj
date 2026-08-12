import type { EpicWinSummaryDto } from "@mypetproj/shared";
import { Redirect, useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { CharacterPortrait } from "../src/components/CharacterPortrait";
import { ProgressBar } from "../src/components/ProgressBar";
import { SegmentedTimelineBar } from "../src/components/SegmentedTimelineBar";
import { ThemedBackground } from "../src/components/ThemedBackground";
import { useAuth } from "../src/features/auth/AuthContext";
import { useGamification } from "../src/features/gamification/GamificationContext";
import { TimelineWidget } from "../src/features/timeline/TimelineWidget";
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
              {user.isAdmin ? <Text style={styles.badge}>ADMIN</Text> : <View />}
              <View style={styles.headerActions}>
                <Pressable onPress={() => router.push("/settings")}>
                  <Text style={styles.logout}>⚙️ Настройки</Text>
                </Pressable>
                <Pressable onPress={logout}>
                  <Text style={styles.logout}>Выйти</Text>
                </Pressable>
              </View>
            </View>

            {character ? (
              <Pressable onPress={() => router.push("/character")}>
                <Card style={styles.characterCard}>
                  <View style={styles.characterHeaderRow}>
                    <CharacterPortrait avatarIcon={character.avatarIcon} equipped={character.equipped} size="compact" />
                    <View style={styles.characterHeaderInfo}>
                      <View style={styles.characterNameRow}>
                        <Text style={styles.characterTitle}>Уровень {character.level}</Text>
                        <Text style={styles.characterName} numberOfLines={1}>
                          {user.displayName || user.email}
                        </Text>
                      </View>
                      <Text style={styles.characterHint}>Персонаж и экипировка →</Text>

                      <View style={styles.compactBarRow}>
                        <Text style={styles.compactBarLabel}>XP</Text>
                        <View style={styles.compactBarTrack}>
                          <ProgressBar value={character.xp / character.xpToNextLevel} color={theme.colors.accent} height={8} />
                        </View>
                      </View>
                      <View style={styles.compactBarRow}>
                        <Text style={styles.compactBarLabel}>HP</Text>
                        <View style={styles.compactBarTrack}>
                          <ProgressBar value={character.hp / character.maxHp} color={theme.colors.danger} height={8} />
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ) : null}

            <TimelineWidget />

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
            <View style={styles.navRow}>
              <Pressable style={styles.navItemWide} onPress={() => router.push("/journal")}>
                <Text style={styles.navItemText}>📔 Дневник</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Твои Эпики</Text>
            <Button label="+ Новый Эпик" onPress={() => router.push("/epic-wins/new")} />
          </View>
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>Пока пусто — создай свой первый Эпик выше.</Text> : null
        }
        renderItem={({ item }) => <EpicWinListItem item={item} onPress={() => router.push(`/epic-wins/${item.id}`)} />}
      />
    </ThemedBackground>
  );
}

const QUEST_STATUS_ICON: Record<string, string> = { ACTIVE: "▸", COMPLETED: "✓", FAILED: "✗" };
const VISIBLE_QUESTS = 4;

function EpicWinListItem({ item, onPress }: { item: EpicWinSummaryDto; onPress: () => void }) {
  const styles = useStyles();
  const visibleQuests = item.quests.slice(0, VISIBLE_QUESTS);
  const hiddenCount = item.quests.length - visibleQuests.length;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.epicWinCard}>
        <Text style={styles.epicWinTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.epicWinDescription}>{item.description}</Text> : null}

        <View style={styles.progressRow}>
          <View style={styles.progressBarWrapper}>
            <SegmentedTimelineBar quests={item.quests} />
          </View>
          <Text style={styles.progressLabel}>{item.progress}%</Text>
        </View>

        <Text style={styles.meta}>
          {item.questCount} {item.questCount === 1 ? "квест" : "квестов"}
          {item.memberCount > 1 ? ` · ${item.memberCount} участников` : ""}
          {item.status !== "ACTIVE" ? ` · ${item.status === "COMPLETED" ? "завершён" : "в архиве"}` : ""}
        </Text>

        {visibleQuests.length > 0 ? (
          <View style={styles.questList}>
            {visibleQuests.map((quest) => (
              <Text key={quest.id} style={styles.questRow} numberOfLines={1}>
                {QUEST_STATUS_ICON[quest.status] ?? "▸"} {quest.title}
              </Text>
            ))}
            {hiddenCount > 0 ? <Text style={styles.questMore}>+{hiddenCount} ещё</Text> : null}
          </View>
        ) : null}
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
        headerActions: { flexDirection: "row", gap: spacing.md },
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
        },
        characterCard: { marginBottom: spacing.lg, marginTop: spacing.md },
        characterHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
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
        characterNameRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
        characterTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
          color: theme.colors.ink,
        },
        characterName: { fontSize: typography.sizeSm, color: theme.colors.muted, flexShrink: 1 },
        compactBarRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs, gap: spacing.xs },
        compactBarLabel: { fontSize: 10, fontWeight: "700", color: theme.colors.muted, width: 20 },
        compactBarTrack: { width: 120 },
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          fontFamily: theme.headingFontFamily,
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
        questList: { marginTop: spacing.sm, gap: 2 },
        questRow: { fontSize: typography.sizeSm, color: theme.colors.ink },
        questMore: { fontSize: typography.sizeSm, color: theme.colors.accent, fontWeight: "700", marginTop: 2 },
      }),
    [theme],
  );
}
