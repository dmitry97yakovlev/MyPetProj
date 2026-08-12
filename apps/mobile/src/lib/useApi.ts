import { useMemo } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { apiClient } from "./apiClient";

/** apiClient, автоматически подставляющий access-токен текущего пользователя. */
export function useApi() {
  const { accessToken } = useAuth();

  return useMemo(
    () => ({
      get: <T>(path: string) => apiClient.get<T>(path, accessToken ?? undefined),
      post: <T>(path: string, body: unknown) => apiClient.post<T>(path, body, accessToken ?? undefined),
      postForm: <T>(path: string, formData: FormData) => apiClient.postForm<T>(path, formData, accessToken ?? undefined),
      patch: <T>(path: string, body: unknown) => apiClient.patch<T>(path, body, accessToken ?? undefined),
      del: <T>(path: string) => apiClient.del<T>(path, accessToken ?? undefined),
    }),
    [accessToken],
  );
}
