/**
 * Каталог тем оформления. Цвета/тени/фоновые картинки/шрифт различаются по
 * теме — размеры (spacing, typography, borderWidth) общие для всех тем, см.
 * tokens.ts. Добавить новую тему = добавить объект сюда и ключ в THEMES;
 * UI-переключатель (ThemeSwitcher) подхватит её автоматически.
 *
 * Фоновые картинки — внешние ссылки (не встраиваем файлы в репозиторий),
 * личное некоммерческое использование. Пользователь выбирает одну из
 * нескольких вариантов на тему через BackgroundPicker.
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
  /** Варианты полноэкранной фоновой иллюстрации для "геройских" экранов — пользователь выбирает одну. */
  backgroundImageOptions: string[];
  /** Кастомный шрифт для заголовков (см. useAppFonts.ts); undefined — системный жирный. */
  headingFontFamily?: string;
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
  backgroundImageOptions: [
    "https://images8.alphacoders.com/107/thumb-1920-1077297.png",
    "https://images5.alphacoders.com/596/thumb-1920-596248.jpg",
    "https://images4.alphacoders.com/596/thumb-1920-596253.jpg",
    "https://images4.alphacoders.com/854/thumb-1920-85444.jpg",
    "https://images3.alphacoders.com/139/thumb-1920-1395361.png",
  ],
};

// Тема в духе Warcraft III / Frozen Throne — ледяные синие тона, руническая
// зелень Плети, костяной белый текст.
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
  backgroundImageOptions: [
    "https://images3.alphacoders.com/963/thumb-1920-963948.png",
    "https://images3.alphacoders.com/963/thumb-1920-963943.png",
    "https://images2.alphacoders.com/963/thumb-1920-963945.png",
    "https://images6.alphacoders.com/963/thumb-1920-963947.jpg",
    "https://images.alphacoders.com/963/thumb-1920-963951.png",
    "https://images6.alphacoders.com/963/thumb-1920-963953.png",
    "https://images7.alphacoders.com/107/thumb-1920-1070049.jpg",
  ],
  headingFontFamily: "Cinzel_700Bold",
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
