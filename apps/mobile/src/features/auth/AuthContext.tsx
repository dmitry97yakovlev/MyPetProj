import type { AuthResponse, AuthUser } from "@mypetproj/shared";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  /**
   * Тихо обновляет access-токен (он живёт всего 15 минут) через сохранённый
   * refresh-токен — без этого любой запрос дольше 15 минут после входа падал
   * с 401, а экраны вроде страницы Эпика молча проглатывали ошибку и
   * показывали обманчивое "Не найдено" вместо повторной попытки. См. useApi().
   * Возвращает новый accessToken либо null, если сессия действительно истекла
   * (тогда разлогинивает).
   */
  refreshSession: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // Дедуп параллельных refreshSession() — если несколько экранов словили 401
  // одновременно, обновляем сессию одним запросом, а не гонкой из нескольких.
  const inFlightRefresh = useRef<Promise<string | null> | null>(null);

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

  async function refreshSession(): Promise<string | null> {
    if (inFlightRefresh.current) return inFlightRefresh.current;

    const run = (async () => {
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        setStatus("signedOut");
        return null;
      }
      try {
        // /auth/refresh не ротирует refresh-токен (см. auth.service.ts) — безопасно
        // дергать его повторно, если несколько запросов словили 401 одновременно.
        const result = await apiClient.post<AuthResponse>("/auth/refresh", { refreshToken });
        await applySession(result);
        return result.accessToken;
      } catch {
        await storage.removeItem(REFRESH_TOKEN_KEY);
        setUser(null);
        setAccessToken(null);
        setStatus("signedOut");
        return null;
      }
    })();

    inFlightRefresh.current = run;
    try {
      return await run;
    } finally {
      inFlightRefresh.current = null;
    }
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
      refreshSession,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, user, accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}
