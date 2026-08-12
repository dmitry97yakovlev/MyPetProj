import type { AuthResponse, AuthUser } from "@mypetproj/shared";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { storage } from "../../lib/storage";

const REFRESH_TOKEN_KEY = "mypetproj.refreshToken";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface RegisterArgs {
  email: string;
  password: string;
  displayName?: string;
  unlimitedSession: boolean;
}

interface LoginArgs {
  email: string;
  password: string;
  unlimitedSession: boolean;
}

interface AppleLoginArgs {
  identityToken: string;
  displayName?: string;
  unlimitedSession: boolean;
}

interface GoogleLoginArgs {
  idToken: string;
  unlimitedSession: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  register: (input: RegisterArgs) => Promise<void>;
  login: (input: LoginArgs) => Promise<void>;
  loginWithApple: (input: AppleLoginArgs) => Promise<void>;
  loginWithGoogle: (input: GoogleLoginArgs) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        if (!cancelled) setStatus("signedOut");
        return;
      }
      try {
        const result = await apiClient.post<AuthResponse>("/auth/refresh", { refreshToken });
        if (!cancelled) await applySession(result);
      } catch {
        await storage.removeItem(REFRESH_TOKEN_KEY);
        if (!cancelled) setStatus("signedOut");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applySession(result: AuthResponse) {
    await storage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setUser(result.user);
    setAccessToken(result.accessToken);
    setStatus("signedIn");
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      async register(input) {
        const result = await apiClient.post<AuthResponse>("/auth/register", input);
        await applySession(result);
      },
      async login(input) {
        const result = await apiClient.post<AuthResponse>("/auth/login", input);
        await applySession(result);
      },
      async loginWithApple(input) {
        const result = await apiClient.post<AuthResponse>("/auth/apple", input);
        await applySession(result);
      },
      async loginWithGoogle(input) {
        const result = await apiClient.post<AuthResponse>("/auth/google", input);
        await applySession(result);
      },
      async logout() {
        const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          await apiClient.post("/auth/logout", { refreshToken }).catch(() => undefined);
        }
        await storage.removeItem(REFRESH_TOKEN_KEY);
        setUser(null);
        setAccessToken(null);
        setStatus("signedOut");
      },
    }),
    [status, user, accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}
