import { useMemo } from "react";
import { Pressable, type PressableProps, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, spacing, typography } from "../theme/tokens";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "primary" | "secondary";
}

export function Button({ label, variant = "primary", disabled, ...rest }: ButtonProps) {
  const { theme } = useTheme();
  const styles = useStyles();
  const backgroundColor = variant === "primary" ? theme.colors.primary : theme.colors.secondary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, opacity: disabled ? 0.6 : 1 },
        pressed && styles.pressed,
      ]}
      {...rest}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderWidth,
          borderColor: theme.colors.ink,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: theme.colors.ink,
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 4, height: 4 },
          elevation: 4,
        },
        pressed: {
          shadowOffset: { width: 0, height: 0 },
          transform: [{ translateX: 4 }, { translateY: 4 }],
        },
        label: {
          fontWeight: typography.weightBold,
          fontSize: typography.sizeMd,
          // Светлый текст (colors.ink) на золотой/зелёной заливке кнопки читается
          // плохо — тёмный фон даёт нужный контраст на обоих вариантах.
          color: theme.colors.background,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
      }),
    [theme],
  );
}
