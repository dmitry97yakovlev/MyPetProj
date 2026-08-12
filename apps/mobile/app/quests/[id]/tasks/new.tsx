import type { DailyTaskCategory } from "@mypetproj/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../../src/components/Button";
import { Checkbox } from "../../../../src/components/Checkbox";
import { ScreenTitle } from "../../../../src/components/ScreenTitle";
import { TextField } from "../../../../src/components/TextField";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "../../../../src/lib/dailyTaskCategory";
import { useApi } from "../../../../src/lib/useApi";
import { useTheme } from "../../../../src/theme/ThemeContext";
import { borderWidth, spacing, typography } from "../../../../src/theme/tokens";

export default function NewDailyTaskScreen() {
  const { id: questId } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const { theme } = useTheme();
  const styles = useStyles();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DailyTaskCategory>("MANDATORY");
  const [isQuantified, setIsQuantified] = useState(false);
  const [unit, setUnit] = useState("");
  const [tracksEpicMetric, setTracksEpicMetric] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Укажи название");
      return;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
    };

    if (isQuantified) {
      if (!unit.trim()) {
        setError("Укажи единицу измерения (например, км)");
        return;
      }
      payload.unit = unit.trim();
      payload.tracksEpicMetric = tracksEpicMetric;
    }

    setLoading(true);
    try {
      await api.post(`/quests/${questId}/daily-tasks`, payload);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenTitle style={styles.title}>Новая ежедневная задача</ScreenTitle>
        <Text style={styles.hint}>Повторяющееся действие внутри квеста. Например: «Пробежать 2 км сегодня».</Text>

        <TextField label="Название" value={title} onChangeText={setTitle} placeholder="Пробежать 2 км" />
        <TextField
          label="Описание (необязательно)"
          value={description}
          onChangeText={setDescription}
          placeholder="Детали"
          multiline
        />

        <Text style={styles.label}>Категория</Text>
        <View style={styles.categoryRow}>
          {CATEGORY_ORDER.map((value) => {
            const active = value === category;
            return (
              <Pressable
                key={value}
                onPress={() => setCategory(value)}
                style={[
                  styles.categoryChip,
                  { borderColor: theme.colors.ink, backgroundColor: active ? theme.colors.secondary : theme.colors.surface },
                ]}
              >
                <Text style={styles.categoryChipText}>{CATEGORY_LABEL[value]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Checkbox
          label="Задача по количеству (например, км, минуты, кг)"
          value={isQuantified}
          onChange={setIsQuantified}
        />

        {isQuantified ? (
          <>
            <TextField label="Единица измерения" value={unit} onChangeText={setUnit} placeholder="км" />
            <Checkbox
              label="Отмечать текущее значение как показатель цели Эпика (например, вес)"
              value={tracksEpicMetric}
              onChange={setTracksEpicMetric}
            />
          </>
        ) : null}

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
        label: {
          fontWeight: typography.weightBold,
          fontSize: typography.sizeSm,
          textTransform: "uppercase",
          marginBottom: spacing.xs,
          color: theme.colors.ink,
        },
        categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
        categoryChip: { borderWidth, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
        categoryChipText: { fontSize: typography.sizeSm, fontWeight: "700", color: theme.colors.ink },
        error: { color: theme.colors.danger, marginBottom: spacing.md, fontWeight: "600" },
      }),
    [theme],
  );
}
