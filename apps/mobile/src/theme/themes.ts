/**
 * Каталог тем оформления. Цвета/тени различаются по теме — размеры (spacing,
 * typography, borderWidth) общие для всех тем, см. tokens.ts. Добавить новую
 * тему = добавить объект сюда и ключ в THEMES; UI-переключатель (ThemeSwitcher)
 * подхватит её автоматически.
 */
import { borderWidth as sharedBorderWidth, spacing as sharedSpacing, typography as sharedTypography } from "./tokens";

export interface ThemeColors {
  background: string;
  surface: string;
  ink: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  danger: string;
  border: string;
  muted: string;
}

export interface HardShadow {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export interface ThemeTokens {
  key: "gta" | "warcraft3";
  label: string;
  colors: ThemeColors;
  hardShadow: HardShadow;
  /** Полноэкранная фоновая иллюстрация для "геройских" экранов (логин/дом). */
  backgroundImageUri?: string;
}

const gtaColors: ThemeColors = {
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

export const gtaTheme: ThemeTokens = {
  key: "gta",
  label: "GTA San Andreas",
  colors: gtaColors,
  hardShadow: {
    shadowColor: gtaColors.primary,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },
};

// Тема в духе Warcraft III / Frozen Throne — ледяные синие тона, руническая
// зелень Плети, костяной белый текст. Фон — заставка с Артасом (внешняя ссылка,
// не встраиваем файл в репозиторий).
const warcraft3Colors: ThemeColors = {
  background: "#070B14",
  surface: "#141E33",
  ink: "#EAF2FF",
  primary: "#3FA7D6",
  secondary: "#7CFF6B",
  accent: "#B98FE0",
  success: "#4CAF50",
  danger: "#C23B3B",
  border: "#EAF2FF",
  muted: "#8FA3C7",
};

export const warcraft3Theme: ThemeTokens = {
  key: "warcraft3",
  label: "Warcraft III",
  colors: warcraft3Colors,
  hardShadow: {
    shadowColor: warcraft3Colors.primary,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },
  backgroundImageUri: "https://images3.alphacoders.com/963/thumb-1920-963948.png",
};

export const THEMES = {
  gta: gtaTheme,
  warcraft3: warcraft3Theme,
} satisfies Record<string, ThemeTokens>;

export type ThemeKey = keyof typeof THEMES;

// Реэкспорт тема-независимых токенов — экраны продолжают импортировать их
// напрямую из tokens.ts, здесь только для удобства в одном месте.
export const spacing = sharedSpacing;
export const typography = sharedTypography;
export const borderWidth = sharedBorderWidth;
