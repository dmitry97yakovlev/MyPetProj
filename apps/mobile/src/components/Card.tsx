import { type PropsWithChildren, useMemo } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, hexToRgba, spacing } from "../theme/tokens";

/**
 * Карточка-рамка с "гем"-акцентами по углам (в духе иконок предметов
 * Warcraft III) — вместо голой плоской обводки. Акценты — просто
 * повёрнутые квадраты цвета primary, без картинок.
 */
export function Card({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const styles = useStyles();
  return (
    <View style={[styles.card, style]} {...rest}>
      <View style={[styles.gem, styles.gemTopLeft]} />
      <View style={[styles.gem, styles.gemTopRight]} />
      <View style={[styles.gem, styles.gemBottomLeft]} />
      <View style={[styles.gem, styles.gemBottomRight]} />
      {children}
    </View>
  );
}

function useStyles() {
  const { theme, panelOpacity } = useTheme();
  return useMemo(() => {
    const gemSize = 9;
    return StyleSheet.create({
      card: {
        borderWidth,
        borderColor: theme.colors.ink,
        backgroundColor: hexToRgba(theme.colors.surface, panelOpacity),
        padding: spacing.lg,
        ...theme.hardShadow,
      },
      gem: {
        position: "absolute",
        width: gemSize,
        height: gemSize,
        backgroundColor: theme.colors.primary,
        borderWidth: 1,
        borderColor: theme.colors.ink,
        transform: [{ rotate: "45deg" }],
      },
      gemTopLeft: { top: -gemSize / 2, left: -gemSize / 2 },
      gemTopRight: { top: -gemSize / 2, right: -gemSize / 2 },
      gemBottomLeft: { bottom: -gemSize / 2, left: -gemSize / 2 },
      gemBottomRight: { bottom: -gemSize / 2, right: -gemSize / 2 },
    });
  }, [theme, panelOpacity]);
}
