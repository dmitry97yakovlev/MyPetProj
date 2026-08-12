import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../src/components/Button";
import { DeadlinePicker } from "../../src/components/DeadlinePicker";
import { ScreenTitle } from "../../src/components/ScreenTitle";
import { TextField } from "../../src/components/TextField";
import { useGamification } from "../../src/features/gamification/GamificationContext";
import { toApiDeadline } from "../../src/lib/date";
import { useTheme } from "../../src/theme/ThemeContext";
import { spacing, typography } from "../../src/theme/tokens";

export default function NewEpicWinScreen() {
  const { createEpicWin } = useGamification();
  const styles = useStyles();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Укажи название");
      return;
    }
    setLoading(true);
    try {
      const created = await createEpicWin({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: toApiDeadline(deadline),
      });
      router.replace(`/epic-wins/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать Epic Win");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenTitle style={styles.title}>Новая Epic Win</ScreenTitle>
        <Text style={styles.hint}>
          Большая долгосрочная цель. Например: «Привести себя в форму» или «Выучить испанский».
        </Text>

        <TextField label="Название" value={title} onChangeText={setTitle} placeholder="Привести себя в форму" />
        <TextField
          label="Описание (необязательно)"
          value={description}
          onChangeText={setDescription}
          placeholder="Зачем тебе эта цель"
          multiline
        />
        <DeadlinePicker value={deadline} onChange={setDeadline} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={loading ? "Создаём…" : "Создать"} onPress={onSubmit} disabled={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1, backgroundColor: theme.colors.background },
        screen: { flexGrow: 1, padding: spacing.lg },
        title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: theme.colors.ink, marginBottom: spacing.sm },
        hint: { fontSize: typography.sizeSm, color: theme.colors.muted, marginBottom: spacing.lg },
        error: { color: theme.colors.danger, marginBottom: spacing.md, fontWeight: "600" },
      }),
    [theme],
  );
}
