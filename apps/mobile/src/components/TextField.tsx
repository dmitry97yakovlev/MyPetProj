import { useMemo } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, spacing, typography } from "../theme/tokens";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginBottom: spacing.md },
        label: {
          fontWeight: typography.weightBold,
          fontSize: typography.sizeSm,
          textTransform: "uppercase",
          marginBottom: spacing.xs,
          color: theme.colors.ink,
        },
        input: {
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.sizeMd,
          color: theme.colors.ink,
        },
        error: { color: theme.colors.danger, marginTop: spacing.xs, fontWeight: "600" },
      }),
    [theme],
  );
}
