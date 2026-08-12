import type { ItemRarity, ItemSlot } from "@prisma/client";

/**
 * Статический каталог экипировки. Слаги — стабильные id, чтобы сид можно было
 * гонять повторно (upsert), не плодя дубликаты. Правь список здесь — таблица
 * items в БД пересоздаётся из него скриптом `npm run seed -w apps/api`.
 */
export interface CatalogItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  icon: string;
  bonusHp: number;
}

export const ITEM_CATALOG: CatalogItem[] = [
  // Оружие
  { id: "weapon-common-rusty-sword", name: "Ржавый меч", slot: "WEAPON", rarity: "COMMON", icon: "🗡️", bonusHp: 0 },
  { id: "weapon-rare-steel-blade", name: "Стальной клинок", slot: "WEAPON", rarity: "RARE", icon: "⚔️", bonusHp: 5 },
  { id: "weapon-epic-frost-blade", name: "Ледяной клинок", slot: "WEAPON", rarity: "EPIC", icon: "❄️", bonusHp: 10 },
  {
    id: "weapon-legendary-frostmourne",
    name: "Клинок Фростморна",
    slot: "WEAPON",
    rarity: "LEGENDARY",
    icon: "🔱",
    bonusHp: 20,
  },
  // Броня
  { id: "armor-common-leather", name: "Кожаная броня", slot: "ARMOR", rarity: "COMMON", icon: "🥋", bonusHp: 5 },
  { id: "armor-rare-chainmail", name: "Кольчуга", slot: "ARMOR", rarity: "RARE", icon: "🛡️", bonusHp: 10 },
  {
    id: "armor-epic-paladin-plate",
    name: "Латы паладина",
    slot: "ARMOR",
    rarity: "EPIC",
    icon: "✨",
    bonusHp: 15,
  },
  {
    id: "armor-legendary-lich-king",
    name: "Доспех Короля-лича",
    slot: "ARMOR",
    rarity: "LEGENDARY",
    icon: "💀",
    bonusHp: 25,
  },
  // Аксессуары
  { id: "trinket-common-lucky-charm", name: "Амулет удачи", slot: "TRINKET", rarity: "COMMON", icon: "🍀", bonusHp: 0 },
  { id: "trinket-rare-power-ring", name: "Кольцо силы", slot: "TRINKET", rarity: "RARE", icon: "💍", bonusHp: 5 },
  {
    id: "trinket-epic-crown",
    name: "Корона стойкости",
    slot: "TRINKET",
    rarity: "EPIC",
    icon: "👑",
    bonusHp: 10,
  },
  {
    id: "trinket-legendary-heart",
    name: "Сердце Нордскола",
    slot: "TRINKET",
    rarity: "LEGENDARY",
    icon: "❤️‍🔥",
    bonusHp: 15,
  },
];
