import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider } from "../src/features/auth/AuthContext";
import { GamificationProvider } from "../src/features/gamification/GamificationContext";
import { ThemeProvider } from "../src/theme/ThemeContext";
import { useAppFonts } from "../src/theme/useAppFonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <GamificationProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </GamificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
