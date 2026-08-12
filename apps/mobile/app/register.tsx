import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../src/components/Button";
import { Checkbox } from "../src/components/Checkbox";
import { ScreenTitle } from "../src/components/ScreenTitle";
import { TextField } from "../src/components/TextField";
import { ThemedBackground } from "../src/components/ThemedBackground";
import { useAuth } from "../src/features/auth/AuthContext";
import { SocialSignInButtons } from "../src/features/auth/SocialSignInButtons";
import { useTheme } from "../src/theme/ThemeContext";
import { spacing, typography } from "../src/theme/tokens";

export default function RegisterScreen() {
  const { register } = useAuth();
  const styles = useStyles();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlimitedSession, setUnlimitedSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);

    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
        unlimitedSession,
      });
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.screen}>
          <ScreenTitle style={styles.title}>Регистрация</ScreenTitle>

          <TextField label="Имя" value={displayName} onChangeText={setDisplayName} placeholder="Как к тебе обращаться" />
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
            placeholder="Минимум 8 символов"
          />
          <TextField
            label="Повтор пароля"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <Checkbox
            label="Неограниченная сессия (не выходить из аккаунта)"
            value={unlimitedSession}
            onChange={setUnlimitedSession}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label={loading ? "Регистрируем…" : "Зарегистрироваться"} onPress={onSubmit} disabled={loading} />

          <SocialSignInButtons unlimitedSession={unlimitedSession} />

          <Link href="/login" style={styles.link}>
            Уже есть аккаунт? Войти
          </Link>
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
        title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, marginBottom: spacing.lg, color: theme.colors.ink },
        error: { color: theme.colors.danger, marginBottom: spacing.md, fontWeight: "600" },
        link: { marginTop: spacing.lg, textAlign: "center", fontWeight: "700", color: theme.colors.accent },
      }),
    [theme],
  );
}
