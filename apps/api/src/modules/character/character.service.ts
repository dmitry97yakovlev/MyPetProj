import { AVATAR_ICONS } from "@mypetproj/shared";
import type { CharacterDto, InventoryItemDto, ItemDto, ItemSlot } from "@mypetproj/shared";
import type { Character, InventoryItem, Item } from "@prisma/client";
import { prisma } from "../../db";
import { AppError } from "../../errors";
import { applyLevelBonus, applyXpGain, xpToNextLevel } from "./leveling";

/** Сколько итем-прогресса нужно набрать, чтобы выпал случайный предмет экипировки. */
export const ITEM_PROGRESS_THRESHOLD = 100;
/** Сколько итем-прогресса даёт завершение одного квеста (4 квеста ≈ 1 предмет). */
export const ITEM_PROGRESS_PER_QUEST = 25;

function toItemDto(item: Item): ItemDto {
  return { id: item.id, name: item.name, slot: item.slot, rarity: item.rarity, icon: item.icon, bonusHp: item.bonusHp };
}

type InventoryItemWithItem = InventoryItem & { item: Item };

function toInventoryItemDto(entry: InventoryItemWithItem): InventoryItemDto {
  return {
    inventoryItemId: entry.id,
    item: toItemDto(entry.item),
    equipped: entry.equipped,
    acquiredAt: entry.acquiredAt.toISOString(),
  };
}

/** Создаёт персонажа для пользователя, если его ещё нет (идемпотентно). */
export async function getOrCreateCharacter(userId: string): Promise<Character> {
  const existing = await prisma.character.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.character.create({ data: { userId } });
}

/** Полный DTO персонажа для клиента: статы + инвентарь + что экипировано по слотам. */
export async function getCharacterDto(userId: string): Promise<CharacterDto> {
  const character = await getOrCreateCharacter(userId);
  const inventory = await prisma.inventoryItem.findMany({
    where: { userId },
    include: { item: true },
    orderBy: { acquiredAt: "asc" },
  });

  const equipped: Record<ItemSlot, ItemDto | null> = { WEAPON: null, ARMOR: null, TRINKET: null };
  for (const entry of inventory) {
    if (entry.equipped) equipped[entry.item.slot] = toItemDto(entry.item);
  }

  return {
    level: character.level,
    xp: character.xp,
    xpToNextLevel: xpToNextLevel(character.level),
    hp: character.hp,
    maxHp: character.maxHp,
    avatarIcon: character.avatarIcon,
    itemProgress: character.itemProgress,
    itemProgressToNext: ITEM_PROGRESS_THRESHOLD,
    inventory: inventory.map(toInventoryItemDto),
    equipped,
  };
}

/** Начисляет опыт (с автоматическим level-up) персонажу владельца userId. */
export async function grantXp(userId: string, amount: number): Promise<Character> {
  if (amount <= 0) return getOrCreateCharacter(userId);

  const character = await getOrCreateCharacter(userId);
  const next = applyXpGain(character, amount);

  return prisma.character.update({
    where: { userId },
    data: {
      level: next.level,
      xp: next.xp,
      maxHp: next.maxHp,
      // level-up лечит персонажа до полного HP
      hp: next.level > character.level ? next.maxHp : character.hp,
    },
  });
}

/**
 * Прямая прибавка уровня — награда за завершение большой цели (Epic Win),
 * а не рядового квеста. В отличие от grantXp не трогает накопленный XP.
 */
export async function grantLevelBonus(userId: string, levels = 1): Promise<Character> {
  if (levels <= 0) return getOrCreateCharacter(userId);

  const character = await getOrCreateCharacter(userId);
  const next = applyLevelBonus(character, levels);

  return prisma.character.update({
    where: { userId },
    data: { level: next.level, maxHp: next.maxHp, hp: next.maxHp },
  });
}

/** Наносит урон персонажу владельца userId (например, за проваленный квест). */
export async function applyDamage(userId: string, amount: number): Promise<Character> {
  const character = await getOrCreateCharacter(userId);
  const hp = Math.max(0, character.hp - amount);

  return prisma.character.update({ where: { userId }, data: { hp } });
}

/**
 * Начисляет прогресс к следующему предмету экипировки; при достижении
 * порога выдаёт случайный ещё не полученный предмет (остаток прогресса
 * переносится на следующий). Если каталог полностью собран — прогресс
 * просто копится сверх порога, ничего не выдаём (не из чего выбирать).
 */
export async function grantItemProgress(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await getOrCreateCharacter(userId);

  const character = await prisma.character.update({
    where: { userId },
    data: { itemProgress: { increment: amount } },
  });

  if (character.itemProgress < ITEM_PROGRESS_THRESHOLD) return;

  const owned = await prisma.inventoryItem.findMany({ where: { userId }, select: { itemId: true } });
  const ownedIds = new Set(owned.map((o) => o.itemId));
  const candidates = await prisma.item.findMany({ where: { id: { notIn: [...ownedIds] } } });

  if (candidates.length === 0) return;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  await prisma.$transaction([
    prisma.inventoryItem.create({ data: { userId, itemId: picked.id } }),
    prisma.character.update({
      where: { userId },
      data: { itemProgress: { decrement: ITEM_PROGRESS_THRESHOLD } },
    }),
  ]);
}

export async function setAvatarIcon(userId: string, icon: string): Promise<CharacterDto> {
  if (!(AVATAR_ICONS as readonly string[]).includes(icon)) {
    throw new AppError(400, "Недопустимая иконка аватара");
  }
  await getOrCreateCharacter(userId);
  await prisma.character.update({ where: { userId }, data: { avatarIcon: icon } });
  return getCharacterDto(userId);
}

async function assertOwnedInventoryItem(userId: string, inventoryItemId: string) {
  const entry = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId }, include: { item: true } });
  if (!entry || entry.userId !== userId) throw new AppError(404, "Предмет не найден");
  return entry;
}

/** Экипирует предмет; любой другой предмет в том же слоте автоматически снимается. */
export async function equipItem(userId: string, inventoryItemId: string): Promise<CharacterDto> {
  const entry = await assertOwnedInventoryItem(userId, inventoryItemId);

  await prisma.$transaction([
    prisma.inventoryItem.updateMany({
      where: { userId, equipped: true, item: { slot: entry.item.slot } },
      data: { equipped: false },
    }),
    prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { equipped: true } }),
  ]);

  return getCharacterDto(userId);
}

export async function unequipItem(userId: string, inventoryItemId: string): Promise<CharacterDto> {
  await assertOwnedInventoryItem(userId, inventoryItemId);
  await prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { equipped: false } });
  return getCharacterDto(userId);
}
