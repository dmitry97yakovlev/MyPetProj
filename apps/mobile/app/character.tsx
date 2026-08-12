import { AVATAR_ICONS, type CatalogItemDto, type ItemRarity, type ItemSlot } from "@mypetproj/shared";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../src/components/Card";
import { ProgressBar } from "../src/components/ProgressBar";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { useGamification } from "../src/features/gamification/GamificationContext";
import { useApi } from "../src/lib/useApi";
import { useAuthedFocusEffect } from "../src/lib/useAuthedFocusEffect";
import { useTheme } from "../src/theme/ThemeContext";
import { borderWidth, spacing, typography } from "../src/theme/tokens";

const SLOT_LABEL: Record<ItemSlot, string> = {
  WEAPON: "Оружие",
  ARMOR: "Броня",
  TRINKET: "Аксессуар",
};
const SLOT_ORDER: ItemSlot[] = ["WEAPON", "ARMOR", "TRINKET"];

const RARITY_LABEL: Record<ItemRarity, string> = {
  COMMON: "Обычный",
  RARE: "Редкий",
  EPIC: "Эпический",
  LEGENDARY: "Легендарный",
};

export default function CharacterScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const api = useApi();
  const { character, refreshCharacter } = useGamification();
  const [catalog, setCatalog] = useState<CatalogItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [, catalogData] = await Promise.all([refreshCharacter(), api.get<CatalogItemDto[]>("/items")]);
      setCatalog(catalogData);
    } catch {
      // Молча пропускаем — RefreshControl просто перестанет крутиться.
    } finally {
      setLoading(false);
    }
  }, [api, refreshCharacter]);

  useAuthedFocusEffect(load);

  function rarityColor(rarity: ItemRarity): string {
    switch (rarity) {
      case "LEGENDARY":
        return theme.colors.primary;
      case "EPIC":
        return theme.colors.accent;
      case "RARE":
        return theme.colors.secondary;
      default:
        return theme.colors.muted;
    }
  }

  async function onPickAvatar(icon: string) {
    setBusyId(`avatar-${icon}`);
    try {
      await api.post("/character/avatar", { icon });
      await refreshCharacter();
    } catch {
      // Тихо игнорируем — иконка просто не поменяется, кнопка снова активна.
    } finally {
      setBusyId(null);
    }
  }

  async function onEquip(inventoryItemId: string) {
    setBusyId(inventoryItemId);
    try {
      await api.post(`/character/inventory/${inventoryItemId}/equip`, {});
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onUnequip(inventoryItemId: string) {
    setBusyId(inventoryItemId);
    try {
      await api.post(`/character/inventory/${inventoryItemId}/unequip`, {});
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (!character) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>{loading ? "Загрузка…" : "Не удалось загрузить персонажа"}</Text>
      </View>
    );
  }

  const catalogBySlot = SLOT_ORDER.map((slot) => ({
    slot,
    items: catalog.filter((item) => item.slot === slot),
  }));
  const unequippedInventory = character.inventory.filter((entry) => !entry.equipped);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <ScreenTitle style={styles.title}>Персонаж</ScreenTitle>

      <Card style={styles.card}>
        <View style={styles.avatarRow}>
          <Text style={styles.avatarBig}>{character.avatarIcon}</Text>
          <View style={styles.avatarInfo}>
            <Text style={styles.level}>Уровень {character.level}</Text>
            <Text style={styles.barLabel}>
              XP: {character.xp} / {character.xpToNextLevel}
            </Text>
            <ProgressBar value={character.xp / character.xpToNextLevel} color={theme.colors.accent} />
          </View>
        </View>

        <Text style={[styles.barLabel, styles.spacedLabel]}>
          HP: {character.hp} / {character.maxHp}
        </Text>
        <ProgressBar value={character.hp / character.maxHp} color={theme.colors.danger} />

        <Text style={[styles.barLabel, styles.spacedLabel]}>
          Прогресс к предмету: {character.itemProgress} / {character.itemProgressToNext}
        </Text>
        <ProgressBar value={character.itemProgress / character.itemProgressToNext} color={theme.colors.secondary} />
        <Text style={styles.hint}>Завершай квесты, чтобы копить прогресс — по достижении порога выпадет случайный предмет.</Text>
      </Card>

      <Text style={styles.sectionTitle}>Внешний вид</Text>
      <Card style={styles.card}>
        <View style={styles.avatarPickerRow}>
          {AVATAR_ICONS.map((icon) => {
            const active = icon === character.avatarIcon;
            return (
              <Pressable
                key={icon}
                onPress={() => onPickAvatar(icon)}
                disabled={busyId === `avatar-${icon}`}
                style={[styles.avatarOption, active && styles.avatarOptionActive]}
              >
                <Text style={styles.avatarOptionIcon}>{icon}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Экипировано</Text>
      <View style={styles.slotsRow}>
        {SLOT_ORDER.map((slot) => {
          const equippedItem = character.equipped[slot];
          const entry = equippedItem ? character.inventory.find((e) => e.item.id === equippedItem.id) : null;
          return (
            <Card key={slot} style={styles.slotCard}>
              <Text style={styles.slotLabel}>{SLOT_LABEL[slot]}</Text>
              {equippedItem && entry ? (
                <Pressable onPress={() => onUnequip(entry.inventoryItemId)} disabled={busyId === entry.inventoryItemId}>
                  <Text style={styles.slotIcon}>{equippedItem.icon}</Text>
                  <Text style={styles.slotItemName}>{equippedItem.name}</Text>
                  <Text style={styles.slotUnequipHint}>Снять</Text>
                </Pressable>
              ) : (
                <>
                  <Text style={styles.slotIcon}>—</Text>
                  <Text style={styles.slotEmptyHint}>Пусто</Text>
                </>
              )}
            </Card>
          );
        })}
      </View>

      {unequippedInventory.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Инвентарь</Text>
          {unequippedInventory.map((entry) => (
            <Card key={entry.inventoryItemId} style={styles.inventoryRow}>
              <Text style={styles.inventoryIcon}>{entry.item.icon}</Text>
              <View style={styles.inventoryInfo}>
                <Text style={styles.inventoryName}>{entry.item.name}</Text>
                <Text style={[styles.inventoryRarity, { color: rarityColor(entry.item.rarity) }]}>
                  {RARITY_LABEL[entry.item.rarity]} · {SLOT_LABEL[entry.item.slot]}
                </Text>
              </View>
              <Pressable
                onPress={() => onEquip(entry.inventoryItemId)}
                disabled={busyId === entry.inventoryItemId}
                style={styles.equipButton}
              >
                <Text style={styles.equipButtonText}>Экипировать</Text>
              </Pressable>
            </Card>
          ))}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Коллекция</Text>
      {catalogBySlot.map(({ slot, items }) => (
        <View key={slot} style={styles.collectionGroup}>
          <Text style={styles.collectionGroupTitle}>{SLOT_LABEL[slot]}</Text>
          <View style={styles.collectionGrid}>
            {items.map((item) => (
              <View key={item.id} style={[styles.collectionTile, !item.owned && styles.collectionTileLocked]}>
                <Text style={styles.collectionIcon}>{item.owned ? item.icon : "🔒"}</Text>
                <Text style={styles.collectionName} numberOfLines={2}>
                  {item.owned ? item.name : "???"}
                </Text>
                <Text style={[styles.collectionRarity, { color: rarityColor(item.rarity) }]}>
                  {RARITY_LABEL[item.rarity]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
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
        card: { marginBottom: spacing.lg },
        avatarRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
        avatarBig: { fontSize: 56, marginRight: spacing.md },
        avatarInfo: { flex: 1 },
        level: { fontSize: typography.sizeLg, fontWeight: typography.weightBold, color: theme.colors.ink, marginBottom: spacing.xs },
        barLabel: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink, marginBottom: spacing.xs },
        spacedLabel: { marginTop: spacing.sm },
        hint: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.sm },
        sectionTitle: {
          fontSize: typography.sizeLg,
          fontWeight: typography.weightBold,
          color: theme.colors.ink,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        avatarPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        avatarOption: {
          width: 52,
          height: 52,
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.background,
          alignItems: "center",
          justifyContent: "center",
        },
        avatarOptionActive: { backgroundColor: theme.colors.secondary },
        avatarOptionIcon: { fontSize: 26 },
        slotsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
        slotCard: { flex: 1, alignItems: "center" },
        slotLabel: {
          fontSize: typography.sizeSm,
          fontWeight: typography.weightBold,
          color: theme.colors.muted,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
        },
        slotIcon: { fontSize: 32, textAlign: "center" },
        slotItemName: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink, textAlign: "center", marginTop: spacing.xs },
        slotUnequipHint: { fontSize: typography.sizeSm, color: theme.colors.danger, textAlign: "center", marginTop: spacing.xs },
        slotEmptyHint: { fontSize: typography.sizeSm, color: theme.colors.muted, textAlign: "center", marginTop: spacing.xs },
        inventoryRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
        inventoryIcon: { fontSize: 28, marginRight: spacing.md },
        inventoryInfo: { flex: 1 },
        inventoryName: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink },
        inventoryRarity: { fontSize: typography.sizeSm, fontWeight: "700", marginTop: spacing.xs },
        equipButton: {
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.primary,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
        },
        equipButtonText: { fontSize: typography.sizeSm, fontWeight: typography.weightBold, color: theme.colors.background },
        collectionGroup: { marginBottom: spacing.lg },
        collectionGroupTitle: {
          fontSize: typography.sizeMd,
          fontWeight: typography.weightBold,
          color: theme.colors.muted,
          textTransform: "uppercase",
          marginBottom: spacing.sm,
        },
        collectionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        collectionTile: {
          width: 84,
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          padding: spacing.xs,
          alignItems: "center",
        },
        collectionTileLocked: { opacity: 0.45 },
        collectionIcon: { fontSize: 26, marginBottom: spacing.xs },
        collectionName: { fontSize: 11, fontWeight: "700", color: theme.colors.ink, textAlign: "center" },
        collectionRarity: { fontSize: 10, fontWeight: "700", marginTop: 2, textAlign: "center" },
      }),
    [theme],
  );
}
