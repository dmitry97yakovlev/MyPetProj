import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { borderWidth, spacing } from "../theme/tokens";

/** Горизонтальная лента миниатюр фоновых картинок текущей темы — тап выбирает фон. */
export function BackgroundPicker() {
  const { theme, backgroundIndex, setBackgroundIndex } = useTheme();
  const styles = useStyles();

  if (theme.backgroundImageOptions.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {theme.backgroundImageOptions.map((uri, index) => (
        <Pressable key={uri} onPress={() => setBackgroundIndex(index)}>
          <Image source={{ uri }} style={[styles.thumb, index === backgroundIndex && styles.thumbActive]} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: "row", gap: spacing.xs, paddingVertical: spacing.xs },
        thumb: {
          width: 56,
          height: 40,
          borderWidth,
          borderColor: theme.colors.muted,
          opacity: 0.7,
        },
        thumbActive: { borderColor: theme.colors.primary, opacity: 1 },
      }),
    [theme],
  );
}
