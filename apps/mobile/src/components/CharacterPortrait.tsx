import type { ItemDto, ItemSlot } from "@mypetproj/shared";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View, type DimensionValue } from "react-native";
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
 * Примерные точки крепления экипировки на полноростовой иллюстрации героя —
 * в процентах от рамки (для size="hero"). Единой 3D-модели или разметки
 * скелета у нас нет (картинки — готовые иллюстрации разных художников), так
 * что это грубое, но единое для всех персонажей приближение позы "стоя,
 * анфас/три четверти": оружие — у правой руки, кольцо — у левой, ожерелье —
 * у горла, броня — по центру груди, трофей — у пояса.
 */
const SLOT_ANCHOR: Record<ItemSlot, { top: DimensionValue; left: DimensionValue }> = {
  WEAPON: { top: "46%", left: "76%" },
  ARMOR: { top: "34%", left: "48%" },
  NECKLACE: { top: "16%", left: "48%" },
  RING: { top: "56%", left: "18%" },
  TRINKET: { top: "70%", left: "48%" },
};

/**
 * "Портрет" персонажа — полноростовая иллюстрация выбранного героя в рамке
 * с самоцветами по углам.
 *
 * size="hero" — большая на всю ширину версия для верха экрана персонажа:
 * уровень/имя выводятся оверлеем поверх картинки внизу; экипированные
 * предметы — иконками поверх самой картинки, в точках примерного крепления
 * (см. SLOT_ANCHOR), а не отдельным списком — так виднее, что "надето".
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
    const equippedSlots = SLOT_ORDER.filter((slot) => equipped[slot]);
    return (
      <View style={styles.frameHero}>
        <View style={[styles.gem, styles.gemTopLeft]} />
        <View style={[styles.gem, styles.gemTopRight]} />
        <View style={[styles.gem, styles.gemBottomLeft]} />
        <View style={[styles.gem, styles.gemBottomRight]} />
        <Image source={{ uri: character.imageUrl }} style={styles.image} resizeMode="contain" />

        {equippedSlots.map((slot) => (
          <View key={slot} style={[styles.equipAnchor, SLOT_ANCHOR[slot]]}>
            <Text style={styles.equipAnchorIcon}>{equipped[slot]!.icon}</Text>
          </View>
        ))}

        <View style={styles.heroOverlay}>
          {level !== undefined ? <Text style={styles.heroLevel}>Уровень {level}</Text> : null}
          {name ? (
            <Text style={styles.heroName} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
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
        // Уже, не во всю ширину, и с высотой, подобранной под портретный кадр
        // иллюстраций (там же используется resizeMode="contain") — раньше
        // широкая мелкая рамка с resizeMode="cover" обрезала почти всё тело,
        // оставляя видимым только маленький кусок картинки.
        width: "70%",
        maxWidth: 340,
        height: 460,
        alignSelf: "center",
        borderWidth: 3,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
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
      equipAnchor: {
        position: "absolute",
        width: 36,
        height: 36,
        marginLeft: -18,
        marginTop: -18,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        backgroundColor: hexToRgba(theme.colors.background, 0.78),
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        ...theme.hardShadow,
      },
      equipAnchorIcon: { fontSize: typography.sizeMd },
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
