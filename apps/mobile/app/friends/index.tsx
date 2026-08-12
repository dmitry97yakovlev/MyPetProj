import type { FriendDto, FriendRequestDto } from "@mypetproj/shared";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { ScreenTitle } from "../../src/components/ScreenTitle";
import { TextField } from "../../src/components/TextField";
import { useApi } from "../../src/lib/useApi";
import { useAuthedFocusEffect } from "../../src/lib/useAuthedFocusEffect";
import { useTheme } from "../../src/theme/ThemeContext";
import { spacing, typography } from "../../src/theme/tokens";

export default function FriendsScreen() {
  const api = useApi();
  const router = useRouter();
  const styles = useStyles();
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [requests, setRequests] = useState<FriendRequestDto[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        api.get<FriendDto[]>("/friends"),
        api.get<FriendRequestDto[]>("/friends/requests"),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
    } catch {
      // Молча пропускаем — RefreshControl просто перестанет крутиться.
      // Реальные ошибки видно по пустым спискам + повторному pull-to-refresh.
    } finally {
      setLoading(false);
    }
  }, [api]);

  useAuthedFocusEffect(load);

  async function onSendRequest() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Укажи email друга");
      return;
    }
    setSending(true);
    try {
      await api.post("/friends/requests", { email: email.trim() });
      setEmail("");
      setNotice("Запрос отправлен");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить запрос");
    } finally {
      setSending(false);
    }
  }

  async function onRespond(requestId: string, accept: boolean) {
    await api.post(`/friends/requests/${requestId}/respond`, { accept });
    await load();
  }

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <ScreenTitle style={styles.title}>Друзья</ScreenTitle>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Добавить друга</Text>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="friend@example.com"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Button label={sending ? "Отправляем…" : "Отправить запрос"} onPress={onSendRequest} disabled={sending} />
      </Card>

      {incoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Входящие запросы</Text>
          {incoming.map((r) => (
            <Card key={r.id} style={styles.requestCard}>
              <Text style={styles.name}>{r.displayName || r.email}</Text>
              <View style={styles.requestActions}>
                <View style={styles.requestActionButton}>
                  <Button label="Принять" onPress={() => onRespond(r.id, true)} />
                </View>
                <View style={styles.requestActionButton}>
                  <Button label="Отклонить" variant="secondary" onPress={() => onRespond(r.id, false)} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {outgoing.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Отправленные запросы</Text>
          {outgoing.map((r) => (
            <Card key={r.id} style={styles.requestCard}>
              <Text style={styles.name}>{r.displayName || r.email}</Text>
              <Text style={styles.meta}>Ожидает ответа</Text>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Мои друзья ({friends.length})</Text>
          <Text style={styles.link} onPress={() => router.push("/leaderboard")}>
            Рейтинг →
          </Text>
        </View>
        {friends.length === 0 && !loading ? <Text style={styles.emptyText}>Друзей пока нет.</Text> : null}
        {friends.map((f) => (
          <Card key={f.userId} style={styles.requestCard}>
            <Text style={styles.name}>{f.displayName || f.email}</Text>
            <Text style={styles.meta}>Уровень {f.level}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: theme.colors.background },
        content: { padding: spacing.lg },
        title: { fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: theme.colors.ink, marginBottom: spacing.lg },
        card: { marginBottom: spacing.lg },
        section: { marginBottom: spacing.lg },
        sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        sectionTitle: {
          fontSize: typography.sizeMd,
          fontWeight: typography.weightBold,
          color: theme.colors.ink,
          marginBottom: spacing.sm,
        },
        link: { color: theme.colors.accent, fontWeight: "700" },
        error: { color: theme.colors.danger, marginBottom: spacing.md, fontWeight: "600" },
        notice: { color: theme.colors.success, marginBottom: spacing.md, fontWeight: "600" },
        emptyText: { color: theme.colors.muted },
        requestCard: { marginBottom: spacing.sm },
        name: { fontSize: typography.sizeMd, fontWeight: typography.weightBold, color: theme.colors.ink },
        meta: { fontSize: typography.sizeSm, color: theme.colors.muted, marginTop: spacing.xs },
        requestActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
        requestActionButton: { flex: 1 },
      }),
    [theme],
  );
}
