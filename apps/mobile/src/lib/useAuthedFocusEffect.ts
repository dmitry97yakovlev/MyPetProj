import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useAuth } from "../features/auth/AuthContext";

/**
 * Как useFocusEffect, но не запускает callback, пока не установлена
 * авторизация (status === "signedIn"). Без этого экран, открытый напрямую
 * по ссылке или обновлённый (F5), может смонтироваться раньше, чем
 * AuthProvider успеет обновить access-токен — запрос уйдёт без токена,
 * получит 401 и упадёт необработанным исключением.
 *
 * Как только status становится "signedIn" (пока экран ещё в фокусе),
 * useFocusEffect подхватывает новый callback и запускает его.
 */
export function useAuthedFocusEffect(callback: () => void) {
  const { status } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (status === "signedIn") callback();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, callback]),
  );
}
