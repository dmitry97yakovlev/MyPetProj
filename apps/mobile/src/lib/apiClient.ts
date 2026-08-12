const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit, accessToken?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Ошибка запроса (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, accessToken?: string): Promise<T> => request<T>(path, {}, accessToken),
  post: <T>(path: string, body: unknown, accessToken?: string): Promise<T> =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, accessToken),
  patch: <T>(path: string, body: unknown, accessToken?: string): Promise<T> =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, accessToken),
  del: <T>(path: string, accessToken?: string): Promise<T> =>
    request<T>(path, { method: "DELETE" }, accessToken),
};
