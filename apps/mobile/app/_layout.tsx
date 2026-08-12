import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/features/auth/AuthContext";
import { GamificationProvider } from "../src/features/gamification/GamificationContext";
import { ThemeProvider } from "../src/theme/ThemeContext";

export default function RootLayout() {
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
