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
  // Кольца
  { id: "ring-common-copper-band", name: "Медное кольцо", slot: "RING", rarity: "COMMON", icon: "⭕", bonusHp: 0 },
  { id: "ring-rare-frost-band", name: "Ледяное кольцо", slot: "RING", rarity: "RARE", icon: "💍", bonusHp: 5 },
  { id: "ring-epic-arcane-band", name: "Кольцо тайной магии", slot: "RING", rarity: "EPIC", icon: "🔮", bonusHp: 10 },
  {
    id: "ring-legendary-lich-band",
    name: "Кольцо Короля-лича",
    slot: "RING",
    rarity: "LEGENDARY",
    icon: "🖤",
    bonusHp: 20,
  },
  // Ожерелья
  { id: "necklace-common-bone", name: "Костяное ожерелье", slot: "NECKLACE", rarity: "COMMON", icon: "🦴", bonusHp: 0 },
  { id: "necklace-rare-emerald", name: "Изумрудное ожерелье", slot: "NECKLACE", rarity: "RARE", icon: "📿", bonusHp: 5 },
  {
    id: "necklace-epic-runed",
    name: "Рунное ожерелье",
    slot: "NECKLACE",
    rarity: "EPIC",
    icon: "🔱",
    bonusHp: 10,
  },
  {
    id: "necklace-legendary-nordskol",
    name: "Сердце Нордскола",
    slot: "NECKLACE",
    rarity: "LEGENDARY",
    icon: "❤️‍🔥",
    bonusHp: 20,
  },
  // Аксессуары (тринкеты)
  { id: "trinket-common-lucky-charm", name: "Амулет удачи", slot: "TRINKET", rarity: "COMMON", icon: "🍀", bonusHp: 0 },
  { id: "trinket-rare-hourglass", name: "Песочные часы времени", slot: "TRINKET", rarity: "RARE", icon: "⏳", bonusHp: 5 },
  {
    id: "trinket-epic-crown",
    name: "Корона стойкости",
    slot: "TRINKET",
    rarity: "EPIC",
    icon: "👑",
    bonusHp: 10,
  },
  {
    id: "trinket-legendary-phylactery",
    name: "Филактерия личности",
    slot: "TRINKET",
    rarity: "LEGENDARY",
    icon: "💎",
    bonusHp: 20,
  },

  // Вторая линейка предметов — больше вариантов на каждый слот/редкость.
  { id: "weapon-common-cracked-axe", name: "Треснувший топор", slot: "WEAPON", rarity: "COMMON", icon: "🪓", bonusHp: 0 },
  { id: "weapon-rare-nightblade", name: "Клинок ночи", slot: "WEAPON", rarity: "RARE", icon: "🌙", bonusHp: 5 },
  { id: "weapon-epic-stormhammer", name: "Молот бури", slot: "WEAPON", rarity: "EPIC", icon: "⚡", bonusHp: 10 },
  { id: "weapon-legendary-scourge-scythe", name: "Коса Плети", slot: "WEAPON", rarity: "LEGENDARY", icon: "☠️", bonusHp: 20 },

  { id: "armor-common-cloth-robe", name: "Тканевая роба", slot: "ARMOR", rarity: "COMMON", icon: "👘", bonusHp: 5 },
  { id: "armor-rare-guard-cuirass", name: "Кираса стража", slot: "ARMOR", rarity: "RARE", icon: "🔰", bonusHp: 10 },
  { id: "armor-epic-dragonscale", name: "Драконья чешуя", slot: "ARMOR", rarity: "EPIC", icon: "🐉", bonusHp: 15 },
  { id: "armor-legendary-frost-plate", name: "Ледяные латы", slot: "ARMOR", rarity: "LEGENDARY", icon: "🥶", bonusHp: 25 },

  { id: "ring-common-plain-band", name: "Простое кольцо", slot: "RING", rarity: "COMMON", icon: "⚪", bonusHp: 0 },
  { id: "ring-rare-swift-band", name: "Кольцо ловкости", slot: "RING", rarity: "RARE", icon: "🍃", bonusHp: 5 },
  { id: "ring-epic-shadow-band", name: "Кольцо теней", slot: "RING", rarity: "EPIC", icon: "🌑", bonusHp: 10 },
  { id: "ring-legendary-eternity-band", name: "Кольцо вечности", slot: "RING", rarity: "LEGENDARY", icon: "♾️", bonusHp: 20 },

  { id: "necklace-common-cord", name: "Верёвочный амулет", slot: "NECKLACE", rarity: "COMMON", icon: "🪢", bonusHp: 0 },
  { id: "necklace-rare-shaman", name: "Ожерелье шамана", slot: "NECKLACE", rarity: "RARE", icon: "🪶", bonusHp: 5 },
  { id: "necklace-epic-druid", name: "Ожерелье друида", slot: "NECKLACE", rarity: "EPIC", icon: "🍂", bonusHp: 10 },
  { id: "necklace-legendary-phoenix", name: "Ожерелье феникса", slot: "NECKLACE", rarity: "LEGENDARY", icon: "🔥", bonusHp: 20 },

  { id: "trinket-common-compass", name: "Компас странника", slot: "TRINKET", rarity: "COMMON", icon: "🧭", bonusHp: 0 },
  { id: "trinket-rare-scroll", name: "Свиток телепорта", slot: "TRINKET", rarity: "RARE", icon: "📜", bonusHp: 5 },
  { id: "trinket-epic-mana-shard", name: "Осколок маны", slot: "TRINKET", rarity: "EPIC", icon: "🔷", bonusHp: 10 },
  { id: "trinket-legendary-dragon-heart", name: "Сердце дракона", slot: "TRINKET", rarity: "LEGENDARY", icon: "❤️", bonusHp: 20 },
];
