import { Redirect } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../src/features/auth/AuthContext";
import { useTheme } from "../src/theme/ThemeContext";

export default function Index() {
  const { status } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles();

  if (status === "loading") {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Redirect href={status === "signedIn" ? "/home" : "/login"} />;
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
      }),
    [theme],
  );
}
