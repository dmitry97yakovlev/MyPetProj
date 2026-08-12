import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { ScreenTitle } from "../../../src/components/ScreenTitle";
import { TextField } from "../../../src/components/TextField";
import { useApi } from "../../../src/lib/useApi";
import { useTheme } from "../../../src/theme/ThemeContext";
import { spacing, typography } from "../../../src/theme/tokens";

/** Пригласить друга в совместный Эпик по email — до 5 участников (см. MAX_EPIC_WIN_MEMBERS). */
export default function InviteToEpicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onInvite() {
    if (!email.trim()) {
      setError("Укажи email друга");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.post(`/epic-wins/${id}/members`, { email: email.trim() });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось пригласить");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenTitle style={styles.title}>Пригласить в Эпик</ScreenTitle>
      <Card style={styles.card}>
        <Text style={styles.hint}>
          Друг увидит этот Эпик у себя, сможет отмечать выполнение и назначать себе квесты. До 5 участников в одном
          Эпике.
        </Text>
        <TextField
          label="Email друга"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="friend@example.com"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={sending ? "Приглашаем…" : "Пригласить"} onPress={onInvite} disabled={sending} />
      </Card>
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background, padding: spacing.lg },
    title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: theme.colors.ink, marginBottom: spacing.lg },
    card: { marginBottom: spacing.lg },
    hint: { fontSize: typography.sizeSm, color: theme.colors.muted, marginBottom: spacing.md },
    error: { color: theme.colors.danger, marginBottom: spacing.sm, fontWeight: "600" },
  });
}
