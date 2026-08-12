import { Cinzel_400Regular, Cinzel_700Bold, useFonts } from "@expo-google-fonts/cinzel";

/** Декоративный шрифт для темы Warcraft III (см. themes.ts → headingFontFamily). */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({ Cinzel_400Regular, Cinzel_700Bold });
  return loaded;
}
