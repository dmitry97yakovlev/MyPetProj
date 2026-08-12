import type { ItemDto, ItemSlot } from "@mypetproj/shared";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getAvatarCharacter } from "../lib/avatarCharacters";
import { useTheme } from "../theme/ThemeContext";
import { hexToRgba, spacing, typography } from "../theme/tokens";

interface CharacterPortraitProps {
  avatarIcon: string;
  equipped: Record<ItemSlot, ItemDto | null>;
  size?: "compact" | "large" | "hero";
  /** Только для size="hero" — оверлей с уровнем/именем поверх картинки. */
  level?: number;
  name?: string;
}

const SLOT_ORDER: ItemSlot[] = ["WEAPON", "ARMOR", "NECKLACE", "RING", "TRINKET"];

/**
 * "Портрет" персонажа — полноростовая иллюстрация выбранного героя в рамке
 * с самоцветами по углам + видимая экипировка по слотам (пока не
 * накладывается на саму картинку — просто бейджи, см. CLAUDE.md).
 *
 * size="hero" — большая на всю ширину версия для верха экрана персонажа:
 * уровень/имя выводятся оверлеем поверх картинки внизу, слоты — тоже оверлеем.
 */
export function CharacterPortrait({ avatarIcon, equipped, size = "large", level, name }: CharacterPortraitProps) {
  const styles = useStyles();
  const compact = size === "compact";
  const hero = size === "hero";
  const character = getAvatarCharacter(avatarIcon);

  const slots = (
    <>
      {SLOT_ORDER.map((slot) => {
        const item = equipped[slot];
        return (
          <View key={slot} style={[styles.slotBadge, compact && styles.slotBadgeCompact]}>
            <Text style={compact ? styles.slotIconCompact : styles.slotIconLarge}>{item ? item.icon : "·"}</Text>
          </View>
        );
      })}
    </>
  );

  if (hero) {
    return (
      <View style={styles.frameHero}>
        <View style={[styles.gem, styles.gemTopLeft]} />
        <View style={[styles.gem, styles.gemTopRight]} />
        <View style={[styles.gem, styles.gemBottomLeft]} />
        <View style={[styles.gem, styles.gemBottomRight]} />
        <Image source={{ uri: character.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.heroOverlay}>
          {level !== undefined ? <Text style={styles.heroLevel}>Уровень {level}</Text> : null}
          {name ? (
            <Text style={styles.heroName} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
          <View style={styles.slotsRowHero}>{slots}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={compact ? styles.rowWrapper : styles.columnWrapper}>
      <View style={[styles.frame, compact ? styles.frameCompact : styles.frameLarge]}>
        <View style={[styles.gem, styles.gemTopLeft]} />
        <View style={[styles.gem, styles.gemTopRight]} />
        <View style={[styles.gem, styles.gemBottomLeft]} />
        <View style={[styles.gem, styles.gemBottomRight]} />
        <Image source={{ uri: character.imageUrl }} style={styles.image} resizeMode="cover" />
      </View>

      <View style={compact ? styles.slotsRowCompact : styles.slotsRowLarge}>{slots}</View>
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(() => {
    const gemSize = 8;
    return StyleSheet.create({
      rowWrapper: { flexDirection: "row", alignItems: "center" },
      columnWrapper: { alignItems: "center" },
      frame: {
        borderWidth: 3,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.background,
        overflow: "hidden",
        ...theme.hardShadow,
      },
      frameCompact: { width: 60, height: 84, marginRight: spacing.md },
      frameLarge: { width: 120, height: 168, marginBottom: spacing.sm },
      frameHero: {
        width: "100%",
        height: 380,
        borderWidth: 3,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.background,
        overflow: "hidden",
        marginBottom: spacing.md,
        ...theme.hardShadow,
      },
      image: { width: "100%", height: "100%" },
      heroOverlay: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: spacing.md,
        backgroundColor: hexToRgba(theme.colors.background, 0.72),
      },
      heroLevel: {
        fontSize: typography.sizeXl,
        fontWeight: "900",
        fontFamily: theme.headingFontFamily,
        color: theme.colors.primary,
        textShadowColor: theme.colors.background,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 0,
      },
      heroName: { fontSize: typography.sizeMd, color: theme.colors.ink, marginTop: 2 },
      slotsRowHero: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
      gem: {
        position: "absolute",
        width: gemSize,
        height: gemSize,
        backgroundColor: theme.colors.primary,
        borderWidth: 1,
        borderColor: theme.colors.ink,
        transform: [{ rotate: "45deg" }],
        zIndex: 1,
      },
      gemTopLeft: { top: -gemSize / 2, left: -gemSize / 2 },
      gemTopRight: { top: -gemSize / 2, right: -gemSize / 2 },
      gemBottomLeft: { bottom: -gemSize / 2, left: -gemSize / 2 },
      gemBottomRight: { bottom: -gemSize / 2, right: -gemSize / 2 },
      slotsRowCompact: { flexDirection: "row", gap: 4, flexShrink: 1, flexWrap: "wrap" },
      slotsRowLarge: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
      slotBadge: {
        width: 28,
        height: 28,
        borderWidth: 1,
        borderColor: theme.colors.ink,
        backgroundColor: theme.colors.surface,
        alignItems: "center",
        justifyContent: "center",
      },
      slotBadgeCompact: { width: 20, height: 20 },
      slotIconLarge: { fontSize: typography.sizeMd },
      slotIconCompact: { fontSize: 11 },
    });
  }, [theme]);
}
