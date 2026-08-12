import { useMemo } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { typography } from "../theme/tokens";

/**
 * Заголовок экрана: крупный, капслок, с жёсткой тенью-обводкой вместо блюра —
 * эффект штампованной вывески без кастомных шрифтов и картинок. Цвета берутся
 * из активной темы (GTA / Warcraft III / ...).
 */
export function ScreenTitle({ style, ...rest }: TextProps) {
  const styles = useStyles();
  return <Text style={[styles.title, style]} {...rest} />;
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        title: {
          fontSize: typography.sizeXl,
          fontWeight: "900",
          color: theme.colors.primary,
          textTransform: "uppercase",
          letterSpacing: 1,
          textShadowColor: theme.colors.background,
          textShadowOffset: { width: 3, height: 3 },
          textShadowRadius: 0,
        },
      }),
    [theme],
  );
}
