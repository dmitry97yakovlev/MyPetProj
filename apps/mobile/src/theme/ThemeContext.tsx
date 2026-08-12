import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { storage } from "../lib/storage";
import { gtaTheme, THEMES, type ThemeKey, type ThemeTokens } from "./themes";

const THEME_STORAGE_KEY = "mypetproj.themeKey";
const BACKGROUND_STORAGE_KEY = "mypetproj.backgroundIndexByTheme";
const PANEL_OPACITY_STORAGE_KEY = "mypetproj.panelOpacity";
const DEFAULT_PANEL_OPACITY = 0.4;

function isThemeKey(value: string | null): value is ThemeKey {
  return value !== null && value in THEMES;
}

type BackgroundIndexByTheme = Record<ThemeKey, number>;

const DEFAULT_BACKGROUND_INDEX: BackgroundIndexByTheme = Object.fromEntries(
  Object.keys(THEMES).map((key) => [key, 0]),
) as BackgroundIndexByTheme;

interface ThemeContextValue {
  themeKey: ThemeKey;
  theme: ThemeTokens;
  setThemeKey: (key: ThemeKey) => void;
  /** Индекс выбранной фоновой картинки для текущей темы (см. theme.backgroundImageOptions). */
  backgroundIndex: number;
  setBackgroundIndex: (index: number) => void;
  /** Готовый URL текущей выбранной фоновой картинки (или undefined, если у темы их нет). */
  backgroundImageUri: string | undefined;
  /** Насколько непрозрачны карточки/панели (0..1) — чтобы фоновая картинка была виднее сквозь них. См. app/settings.tsx. */
  panelOpacity: number;
  setPanelOpacity: (value: number) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: "gta",
  theme: gtaTheme,
  setThemeKey: () => {},
  backgroundIndex: 0,
  setBackgroundIndex: () => {},
  backgroundImageUri: gtaTheme.backgroundImageOptions[0],
  panelOpacity: DEFAULT_PANEL_OPACITY,
  setPanelOpacity: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("gta");
  const [backgroundIndexByTheme, setBackgroundIndexByTheme] = useState<BackgroundIndexByTheme>(
    DEFAULT_BACKGROUND_INDEX,
  );
  const [panelOpacity, setPanelOpacityState] = useState(DEFAULT_PANEL_OPACITY);

  useEffect(() => {
    storage
      .getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (isThemeKey(saved)) setThemeKeyState(saved);
      })
      .catch(() => {});

    storage
      .getItem(BACKGROUND_STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved) as Partial<BackgroundIndexByTheme>;
        setBackgroundIndexByTheme((prev) => ({ ...prev, ...parsed }));
      })
      .catch(() => {
        // Нет сохранённых настроек, битый JSON и т.п. — остаёмся на дефолтных.
      });

    storage
      .getItem(PANEL_OPACITY_STORAGE_KEY)
      .then((saved) => {
        const parsed = saved ? Number(saved) : NaN;
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) setPanelOpacityState(parsed);
      })
      .catch(() => {});
  }, []);

  function setThemeKey(key: ThemeKey) {
    setThemeKeyState(key);
    storage.setItem(THEME_STORAGE_KEY, key).catch(() => {});
  }

  function setBackgroundIndex(index: number) {
    setBackgroundIndexByTheme((prev) => {
      const next = { ...prev, [themeKey]: index };
      storage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function setPanelOpacity(value: number) {
    setPanelOpacityState(value);
    storage.setItem(PANEL_OPACITY_STORAGE_KEY, String(value)).catch(() => {});
  }

  const theme = THEMES[themeKey];
  const backgroundIndex = backgroundIndexByTheme[themeKey] ?? 0;
  const backgroundImageUri = theme.backgroundImageOptions[backgroundIndex] ?? theme.backgroundImageOptions[0];

  const value = useMemo(
    () => ({
      themeKey,
      theme,
      setThemeKey,
      backgroundIndex,
      setBackgroundIndex,
      backgroundImageUri,
      panelOpacity,
      setPanelOpacity,
    }),
    [themeKey, theme, backgroundIndex, backgroundImageUri, panelOpacity],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
