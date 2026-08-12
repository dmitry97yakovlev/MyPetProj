/**
 * Кривая опыта: сколько XP нужно, чтобы перейти С этого уровня на следующий.
 * Простая прогрессия — 100 XP за уровень, растущая на 50 с каждым уровнем.
 * level 1 -> 2: 100 XP
 * level 2 -> 3: 150 XP
 * level 3 -> 4: 200 XP
 * ...
 */
export function xpToNextLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

export interface LevelState {
  level: number;
  xp: number;
  maxHp: number;
}

/**
 * Применяет прирост опыта, разруливая переходы через несколько уровней разом.
 * При каждом level-up персонаж дополнительно исцеляется и его maxHp немного растёт —
 * приятный бонус за прогресс, а не только "квест закрыт".
 */
export function applyXpGain(state: LevelState, xpGain: number): LevelState {
  let { level, xp, maxHp } = state;
  xp += xpGain;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    maxHp += 10;
  }

  return { level, xp, maxHp };
}

/**
 * Прямая прибавка уровня (в обход накопления XP) — награда за завершение
 * Epic Win: большая цель поднимает персонажа сразу на уровень, а не просто
 * начисляет очки опыта. XP на текущем уровне не трогаем.
 */
export function applyLevelBonus(state: LevelState, levels: number): LevelState {
  return { level: state.level + levels, xp: state.xp, maxHp: state.maxHp + levels * 10 };
}
