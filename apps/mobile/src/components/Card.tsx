import { type PropsWithChildren, useMemo } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, spacing } from "../theme/tokens";

export function Card({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const styles = useStyles();
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderWidth,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          padding: spacing.lg,
          ...theme.hardShadow,
        },
      }),
    [theme],
  );
}
