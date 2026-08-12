import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { THEMES, type ThemeKey } from "../theme/themes";
import { borderWidth, spacing, typography } from "../theme/tokens";

const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

/** Переключатель темы оформления — рендерится с текущими цветами темы, поэтому не нужен useTheme-хук стилей. */
export function ThemeSwitcher() {
  const { themeKey, theme, setThemeKey } = useTheme();

  return (
    <View style={styles.row}>
      {THEME_KEYS.map((key) => {
        const active = key === themeKey;
        return (
          <Pressable
            key={key}
            onPress={() => setThemeKey(key)}
            style={[
              styles.chip,
              { borderColor: theme.colors.ink, backgroundColor: active ? theme.colors.primary : theme.colors.surface },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? theme.colors.background : theme.colors.ink }]}>
              {THEMES[key].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipText: { fontWeight: typography.weightBold, fontSize: typography.sizeSm, textTransform: "uppercase" },
});
