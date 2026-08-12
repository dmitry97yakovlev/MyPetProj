import { type PropsWithChildren } from "react";
import { ImageBackground, StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";

/**
 * Полноэкранная подложка для "геройских" экранов (вход/регистрация/дом) —
 * если у темы задан backgroundImageUri (см. themes.ts), рендерит его с
 * затемняющим скримом для читаемости текста; иначе — просто фон темы.
 * Не используется на списках/деталях, чтобы не мешать чтению.
 */
export function ThemedBackground({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const { theme } = useTheme();

  if (theme.backgroundImageUri) {
    return (
      <ImageBackground
        source={{ uri: theme.backgroundImageUri }}
        style={[styles.fill, style]}
        resizeMode="cover"
        {...rest}
      >
        <View style={[styles.scrim, { backgroundColor: theme.colors.background }]} />
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.colors.background }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, opacity: 0.62 },
});
