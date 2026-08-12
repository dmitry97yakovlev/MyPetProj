# Claude API Reference — MyPetProj

Справочник для написания кода интеграции с Claude API в этом проекте.
Стек: **backend Node.js + TypeScript** (единственное место, вызывающее Claude API) + **frontend React (Vite/Next.js)**, который дёргает только наш backend, а не Claude напрямую + **PostgreSQL** для аккаунтов/истории.

Актуально на 2026-08-12. Если что-то не сходится с реальным поведением API — смотри официальную докупентацию (`https://platform.claude.com/docs`) или спрашивай Claude Code с `/claude-api`.

---

## 1. Установка и инициализация клиента

```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Клиент сам читает ANTHROPIC_API_KEY из env — ключ никогда не хардкодить
const client = new Anthropic();
```

Ключ хранить в `.env` (добавить в `.gitignore`), пробрасывать в backend через переменные окружения (Docker/CI — через секреты, не в коде и не в репозитории).

---

## 2. Выбор модели

| Модель | ID | Вход $/1M | Выход $/1M | Когда использовать в проекте |
|---|---|---|---|---|
| Claude Opus 5 | `claude-opus-5` | $5.00 | $25.00 | Сложные агентные задачи, код-ревью, где важно качество больше цены |
| Claude Sonnet 5 | `claude-sonnet-5` | $3.00 ($2.00 до 31.08.2026) | $15.00 ($10.00 до 31.08.2026) | **Дефолт для проекта** — баланс цена/качество, подходит для большинства фич |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1.00 | $5.00 | Простые/массовые задачи: классификация, короткие ответы, высокая нагрузка |

**Решение для проекта:** дефолтная модель — `claude-sonnet-5` (задать константой, не хардкодить по всему коду):

```typescript
// config/claude.ts
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
```

Никогда не приписывать модели дату/суффикс вручную (`claude-sonnet-5-20260101` и т.п.) — используются только строки как есть.

---

## 3. Базовый запрос (без стриминга)

```typescript
const response = await client.messages.create({
  model: CLAUDE_MODEL,
  max_tokens: 4096,
  system: "Ты — ассистент проекта MyPetProj. ...",
  messages: [{ role: "user", content: userMessage }],
});

const text = response.content.find((b) => b.type === "text")?.text ?? "";
```

`response.content` — массив блоков разных типов (`text`, `thinking`, `tool_use`...), всегда проверять `.type` перед `.text`.

## 4. Стриминг (для чата в UI)

Раз фронт не ходит в Claude напрямую, backend стримит ответ Claude через SSE/WebSocket к React-клиенту:

```typescript
const stream = client.messages.stream({
  model: CLAUDE_MODEL,
  max_tokens: 4096,
  messages: [{ role: "user", content: userMessage }],
});

for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    // прокинуть event.delta.text во фронт (SSE chunk / WS message)
    sendChunkToClient(event.delta.text);
  }
}

const finalMessage = await stream.finalMessage(); // usage, stop_reason и т.д. — писать в БД
```

Использовать `.stream()` + `finalMessage()` для любого запроса, где `max_tokens` выше ~16000, — иначе риск таймаута HTTP.

---

## 5. Thinking (рассуждения) и effort

```typescript
thinking: { type: "adaptive" }               // модель сама решает, сколько думать
output_config: { effort: "medium" }           // low | medium | high | xhigh | max
```

- `budget_tokens` — устарел, не использовать.
- Для быстрых фич (чат-ответы, короткие задачи) — `effort: "low"` или `"medium"`.
- Для сложных агентных задач — `"high"`/`"xhigh"`.
- Если рассуждения нужно показывать в UI — `thinking: { type: "adaptive", display: "summarized" }`, иначе поле `thinking` в блоке будет пустым.

---

## 6. Многоходовые диалоги (история — в PostgreSQL)

API — stateless: на каждый запрос отправляется вся история заново.

```typescript
type ChatMessage = { role: "user" | "assistant"; content: string };

async function sendMessage(userId: string, userText: string): Promise<string> {
  const history = await db.getConversationHistory(userId); // Anthropic.MessageParam[]

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [...history, { role: "user", content: userText }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";

  await db.appendToHistory(userId, [
    { role: "user", content: userText },
    { role: "assistant", content: text },
  ]);

  return text;
}
```

Правила: первое сообщение — всегда `user`; роли `user`/`assistant` должны чередоваться (последовательные одной роли API сам склеит, но лучше не полагаться на это).

---

## 7. Prompt caching (экономия на повторяющемся системном промпте)

Если у фичи большой статичный `system` промпт (инструкции, контекст проекта) — кешировать:

```typescript
const response = await client.messages.create({
  model: CLAUDE_MODEL,
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: LARGE_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }, // 5 мин TTL по умолчанию
    },
  ],
  messages: [{ role: "user", content: userText }],
});

// Проверка эффективности кеша
console.log(response.usage.cache_read_input_tokens); // ~0.1x цены — хит
console.log(response.usage.cache_creation_input_tokens); // ~1.25x цены — запись
```

Минимальная длина промпта для кеша на Sonnet 5 — 1024 токена. Кеш ломается от любого изменения байтов в префиксе (timestamp, user id и т.п. в system-промпте — не класть).

---

## 8. Учёт стоимости (раз это pet-проект — считаем расходы)

На каждый ответ писать usage в БД, чтобы видеть реальные траты:

```typescript
await db.logUsage({
  userId,
  model: CLAUDE_MODEL,
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  cacheReadTokens: response.usage.cache_read_input_tokens,
  cacheCreationTokens: response.usage.cache_creation_input_tokens,
});
```

Прикидка цены — по таблице из раздела 2 (`inputTokens * price/1e6 + outputTokens * price/1e6`).

Использовать `client.messages.countTokens(...)` для оценки стоимости **до** отправки дорогого запроса (например, если в промпт зашивается большой документ).

---

## 9. Обработка ошибок

Ловить типизированные исключения SDK, от специфичных к общим:

```typescript
try {
  const response = await client.messages.create({...});
} catch (error) {
  if (error instanceof Anthropic.RateLimitError) {
    // 429 — подождать retry-after, SDK сам ретраит 2 раза по умолчанию
  } else if (error instanceof Anthropic.AuthenticationError) {
    // 401 — не валидный ключ, проверить .env
  } else if (error instanceof Anthropic.BadRequestError) {
    // 400 — ошибка в параметрах запроса
  } else if (error instanceof Anthropic.APIError) {
    // общий фолбэк
    logger.error("Claude API error", { status: error.status, message: error.message });
  }
}
```

Также проверять `response.stop_reason === "refusal"` — модель может отказать по политике безопасности; `response.content` в этом случае может быть пустым.

---

## 10. Чек-лист перед тем как писать фичу с Claude API

- [ ] Модель берётся из константы `CLAUDE_MODEL`, не захардкожена в фиче
- [ ] `max_tokens` разумный (не завышен зря — платим за потолок только если реально используется, но занижать тоже нельзя — обрежет ответ)
- [ ] Если ответ длинный/долгий — используется `.stream()`, а не `.create()`
- [ ] Системный промпт стабилен (не содержит timestamp/uuid) — если большой, добавлен `cache_control`
- [ ] История диалога хранится в Postgres и подставляется в `messages`, а не полагаемся на память API
- [ ] Ошибки ловятся типизированными классами, не строковым сравнением
- [ ] Usage (`response.usage`) логируется для учёта расходов
- [ ] API-ключ — только через env, не закоммичен

---

## 11. Где смотреть больше

- Полный список фич (structured outputs, batches, files API, MCP, extended thinking детали) — вызвать в Claude Code скилл `/claude-api` с описанием задачи.
- Актуальные цены/модели могут поменяться — при сомнениях сверяться через `client.models.retrieve("claude-sonnet-5")`.
