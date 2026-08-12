import { useCallback, useMemo, useRef } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { ApiError, apiClient } from "./apiClient";

/**
 * apiClient, автоматически подставляющий access-токен текущего пользователя.
 * Access-токен живёт всего 15 минут — если запрос упал с 401 (протух токен,
 * а не реально закрытый доступ), тихо обновляем сессию через refreshSession()
 * и повторяем запрос один раз с новым токеном, не тревожа пользователя и не
 * показывая экранам ложные "Не найдено"/ошибки доступа.
 */
export function useApi() {
  const { accessToken, refreshSession } = useAuth();
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;

  const withRetry = useCallback(
    async <T,>(call: (token: string | undefined) => Promise<T>): Promise<T> => {
      try {
        return await call(tokenRef.current ?? undefined);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const newToken = await refreshSession();
          if (newToken) return call(newToken);
        }
        throw err;
      }
    },
    [refreshSession],
  );

  return useMemo(
    () => ({
      get: <T>(path: string) => withRetry((token) => apiClient.get<T>(path, token)),
      post: <T>(path: string, body: unknown) => withRetry((token) => apiClient.post<T>(path, body, token)),
      postForm: <T>(path: string, formData: FormData) =>
        withRetry((token) => apiClient.postForm<T>(path, formData, token)),
      patch: <T>(path: string, body: unknown) => withRetry((token) => apiClient.patch<T>(path, body, token)),
      del: <T>(path: string) => withRetry((token) => apiClient.del<T>(path, token)),
    }),
    [withRetry],
  );
}
