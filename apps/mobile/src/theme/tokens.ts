/**
 * Дизайн-токены. Тема — «GTA San Andreas»: чёрный фон, золотой HUD-акцент,
 * зелёный Grove Street, кремовый текст/обводки. Вынесена отдельно от
 * компонентов, чтобы позже можно было добавить другие темы, просто
 * подставив другой набор токенов (см. CLAUDE.md).
 */
export const colors = {
  background: "#0A0A0A",
  surface: "#1C1C1A",
  ink: "#F2ECD9",
  primary: "#F5A623",
  secondary: "#3E7B27",
  accent: "#4FA8E0",
  success: "#4CAF50",
  danger: "#D62828",
  border: "#F2ECD9",
  muted: "#9C9587",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderWidth = 3;

export const typography = {
  weightBold: "800" as const,
  sizeXl: 32,
  sizeLg: 22,
  sizeMd: 16,
  sizeSm: 13,
};

/** "Жёсткая" тень без блюра — читается как золотой контур HUD-панели на чёрном фоне. */
export const hardShadow = {
  shadowColor: colors.primary,
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: 4, height: 4 },
  elevation: 4,
};

/** "#RRGGBB" → "rgba(r,g,b,alpha)" — для настраиваемой прозрачности панелей (см. ThemeContext.panelOpacity). */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
