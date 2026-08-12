import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, typography } from "../../theme/tokens";
import { useAuth } from "./AuthContext";

WebBrowser.maybeCompleteAuthSession();

// Заполняются в apps/mobile/.env — см. .env.example и README ("Sign in with Apple / Google").
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_CONFIGURED = Boolean(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);

interface SocialSignInButtonsProps {
  unlimitedSession: boolean;
}

export function SocialSignInButtons({ unlimitedSession }: SocialSignInButtonsProps) {
  const router = useRouter();
  const { loginWithApple } = useAuth();
  const styles = useStyles();
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  async function onApplePress() {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple не вернул identityToken");
      const displayName =
        [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ") || undefined;
      await loginWithApple({ identityToken: credential.identityToken, displayName, unlimitedSession });
      router.replace("/home");
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "ERR_REQUEST_CANCELED") return;
      setError(err instanceof Error ? err.message : "Не удалось войти через Apple");
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.dividerText}>или</Text>

      {Platform.OS === "ios" && appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={0}
          style={styles.appleButton}
          onPress={onApplePress}
        />
      ) : null}

      {/* Хук Google.useIdTokenAuthRequest на вебе кидает исключение прямо при рендере,
          если webClientId не задан — поэтому он живёт в отдельном компоненте,
          который монтируется только когда конфиг реально есть. */}
      {GOOGLE_CONFIGURED ? (
        <GoogleSignInButton unlimitedSession={unlimitedSession} onError={setError} />
      ) : (
        <View>
          <Pressable
            style={[styles.googleButton, styles.googleButtonDisabled]}
            onPress={() => setError("Google Sign-In пока не настроен на этой сборке (нет client ID) — см. README")}
          >
            <Text style={styles.googleButtonText}>Продолжить с Google</Text>
          </Pressable>
          <Text style={styles.hint}>Google Sign-In: client ID не задан (см. README)</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

interface GoogleSignInButtonProps {
  unlimitedSession: boolean;
  onError: (message: string) => void;
}

function GoogleSignInButton({ unlimitedSession, onError }: GoogleSignInButtonProps) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const styles = useStyles();

  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === "success" && googleResponse.params.id_token) {
      onError("");
      loginWithGoogle({ idToken: googleResponse.params.id_token, unlimitedSession })
        .then(() => router.replace("/home"))
        .catch((err) => onError(err instanceof Error ? err.message : "Не удалось войти через Google"));
    } else if (googleResponse?.type === "error") {
      onError("Не удалось войти через Google");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  return (
    <Pressable onPress={() => promptGoogleAsync()} style={styles.googleButton}>
      <Text style={styles.googleButtonText}>Продолжить с Google</Text>
    </Pressable>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginTop: spacing.lg },
        dividerText: {
          textAlign: "center",
          color: theme.colors.muted,
          fontWeight: "700",
          textTransform: "uppercase",
          fontSize: typography.sizeSm,
          marginBottom: spacing.md,
        },
        appleButton: { width: "100%", height: 48, marginBottom: spacing.sm },
        googleButton: {
          borderWidth: 3,
          borderColor: theme.colors.ink,
          backgroundColor: theme.colors.surface,
          paddingVertical: spacing.md,
          alignItems: "center",
          justifyContent: "center",
        },
        googleButtonDisabled: { opacity: 0.5 },
        googleButtonText: {
          color: theme.colors.ink,
          fontWeight: typography.weightBold,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        hint: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs, textAlign: "center" },
        error: { color: theme.colors.danger, marginTop: spacing.md, fontWeight: "600", textAlign: "center" },
      }),
    [theme],
  );
}
