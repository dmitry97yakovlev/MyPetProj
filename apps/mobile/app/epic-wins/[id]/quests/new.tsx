import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../../../src/components/Button";
import { DeadlinePicker } from "../../../../src/components/DeadlinePicker";
import { ScreenTitle } from "../../../../src/components/ScreenTitle";
import { TextField } from "../../../../src/components/TextField";
import { toApiDeadline } from "../../../../src/lib/date";
import { useApi } from "../../../../src/lib/useApi";
import { useTheme } from "../../../../src/theme/ThemeContext";
import { spacing, typography } from "../../../../src/theme/tokens";

export default function NewQuestScreen() {
  const { id: epicWinId } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const styles = useStyles();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [estimatedDays, setEstimatedDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Укажи название");
      return;
    }
    const days = Number(estimatedDays.replace(",", "."));
    if (estimatedDays.trim() && (!Number.isFinite(days) || days < 1)) {
      setError("Длительность — целое число дней, минимум 1");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/epic-wins/${epicWinId}/quests`, {
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: toApiDeadline(deadline),
        estimatedDays: estimatedDays.trim() ? Math.round(days) : undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать квест");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenTitle style={styles.title}>Новый квест</ScreenTitle>
        <Text style={styles.hint}>Шаг на пути к Эпику. Например: «Пробежать 5 км».</Text>

        <TextField label="Название" value={title} onChangeText={setTitle} placeholder="Пробежать 5 км" />
        <TextField
          label="Описание (необязательно)"
          value={description}
          onChangeText={setDescription}
          placeholder="Детали квеста"
          multiline
        />
        <DeadlinePicker value={deadline} onChange={setDeadline} />
        <TextField
          label="Сколько дней это займёт (необязательно)"
          value={estimatedDays}
          onChangeText={setEstimatedDays}
          placeholder="Например, 14"
          keyboardType="numeric"
        />
        <Text style={styles.hint}>
          Определяет размер сегмента этого квеста на таймлайн-полоске прогресса Эпика — длинные квесты займут на ней
          больше места.
        </Text>

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
