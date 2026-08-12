import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { storage } from "../lib/storage";
import { gtaTheme, THEMES, type ThemeKey, type ThemeTokens } from "./themes";

const STORAGE_KEY = "mypetproj.themeKey";

function isThemeKey(value: string | null): value is ThemeKey {
  return value !== null && value in THEMES;
}

interface ThemeContextValue {
  themeKey: ThemeKey;
  theme: ThemeTokens;
  setThemeKey: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: "gta",
  theme: gtaTheme,
  setThemeKey: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("gta");

  useEffect(() => {
    storage
      .getItem(STORAGE_KEY)
      .then((saved) => {
        if (isThemeKey(saved)) setThemeKeyState(saved);
      })
      .catch(() => {
        // Нет сохранённой темы или хранилище недоступно — остаёмся на дефолтной.
      });
  }, []);

  function setThemeKey(key: ThemeKey) {
    setThemeKeyState(key);
    storage.setItem(STORAGE_KEY, key).catch(() => {});
  }

  const value = useMemo(() => ({ themeKey, theme: THEMES[themeKey], setThemeKey }), [themeKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
