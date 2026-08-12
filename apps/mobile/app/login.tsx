import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { BackgroundPicker } from "../src/components/BackgroundPicker";
import { Button } from "../src/components/Button";
import { Checkbox } from "../src/components/Checkbox";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { TextField } from "../src/components/TextField";
import { ThemedBackground } from "../src/components/ThemedBackground";
import { ThemeSwitcher } from "../src/components/ThemeSwitcher";
import { useAuth } from "../src/features/auth/AuthContext";
import { SocialSignInButtons } from "../src/features/auth/SocialSignInButtons";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

export default function LoginScreen() {
  const { login } = useAuth();
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [unlimitedSession, setUnlimitedSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password, unlimitedSession });
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.screen}>
          <ThemeSwitcher />
          <BackgroundPicker />
          <ScreenTitle style={styles.title}>Вход</ScreenTitle>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <TextField
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <Checkbox
            label="Неограниченная сессия (не выходить из аккаунта)"
            value={unlimitedSession}
            onChange={setUnlimitedSession}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label={loading ? "Входим…" : "Войти"} onPress={onSubmit} disabled={loading} />

          <SocialSignInButtons unlimitedSession={unlimitedSession} />

          <Link href="/register" style={styles.link}>
            Нет аккаунта? Зарегистрироваться
          </Link>

          <View style={styles.hintBox}>
            <Text style={styles.hint}>Для просмотра интерфейса без регистрации: admin@local.test / admin</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        screen: { flexGrow: 1, padding: spacing.lg, justifyContent: "center" },
        title: {
          fontSize: typography.sizeXl,
          fontWeight: typography.weightBold,
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
          color: theme.colors.ink,
        },
        error: { color: theme.colors.danger, marginBottom: spacing.md, fontWeight: "600" },
        link: { marginTop: spacing.lg, textAlign: "center", fontWeight: "700", color: theme.colors.accent },
        hintBox: {
          marginTop: spacing.xl,
          borderWidth: 2,
          borderColor: theme.colors.ink,
          borderStyle: "dashed",
          padding: spacing.sm,
        },
        hint: { fontSize: typography.sizeSm, color: theme.colors.muted, textAlign: "center" },
      }),
    [theme],
  );
}
