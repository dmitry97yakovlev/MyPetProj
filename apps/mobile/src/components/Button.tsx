import { useMemo } from "react";
import { Pressable, type PressableProps, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, hexToRgba, spacing, typography } from "../theme/tokens";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "primary" | "secondary";
}

/** Компактная кнопка размером по тексту (не на всю ширину) — с прозрачностью панелей, как и карточки. */
export function Button({ label, variant = "primary", disabled, ...rest }: ButtonProps) {
  const { theme, panelOpacity } = useTheme();
  const styles = useStyles();
  const solid = variant === "primary" ? theme.colors.primary : theme.colors.secondary;
  const backgroundColor = hexToRgba(solid, panelOpacity);

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
          alignSelf: "center",
          borderWidth: Math.max(1, borderWidth - 1),
          borderColor: theme.colors.ink,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: theme.colors.ink,
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 2, height: 2 },
          elevation: 2,
        },
        pressed: {
          shadowOffset: { width: 0, height: 0 },
          transform: [{ translateX: 2 }, { translateY: 2 }],
        },
        label: {
          fontWeight: typography.weightBold,
          fontSize: typography.sizeSm,
          color: theme.colors.ink,
          letterSpacing: 0.3,
        },
      }),
    [theme],
  );
}
