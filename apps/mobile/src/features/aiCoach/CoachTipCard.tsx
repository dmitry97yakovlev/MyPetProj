import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Card } from "../../components/Card";
import { useApi } from "../../lib/useApi";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, typography } from "../../theme/tokens";

/**
 * Совет по текущему состоянию персонажа/квестов — правило-ориентированная
 * заглушка на backend (AICoachService), не настоящий вызов LLM. См. CLAUDE.md.
 */
export function CoachTipCard() {
  const api = useApi();
  const styles = useStyles();
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ tip: string }>("/coach/tip")
      .then((data) => setTip(data.tip))
      .catch(() => setTip(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tip) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Совет</Text>
      <Text style={styles.tip}>{tip}</Text>
    </Card>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.lg, backgroundColor: theme.colors.secondary },
        label: {
          fontWeight: typography.weightBold,
          fontSize: typography.sizeSm,
          textTransform: "uppercase",
          color: theme.colors.ink,
          marginBottom: spacing.xs,
        },
        tip: { fontSize: typography.sizeMd, color: theme.colors.ink },
      }),
    [theme],
  );
}
