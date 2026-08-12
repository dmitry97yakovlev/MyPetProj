# MyPetProj

Трекер привычек с геймификацией. Архитектура и решения — в `CLAUDE.md`.

Монорепо (npm workspaces):

```
apps/
  api/     — backend, Node.js + TypeScript + Express + Prisma
  mobile/  — клиент, Expo (React Native), одна кодовая база на iOS/Android/Web
packages/
  shared/  — общие TS-типы и Zod-схемы (auth DTO и т.д.), используются и в api, и в mobile
```

## Требования

- Node.js 20+
- Docker (для локального Postgres) — или свой Postgres, если он уже есть
- Для запуска на телефоне — приложение **Expo Go** (iOS/Android) или Xcode/Android Studio для эмулятора

## Первый запуск

```bash
# 1. Установить зависимости всего монорепо
npm install

# 2. Поднять локальный Postgres
docker compose up -d

# 3. Настроить переменные окружения backend
cp apps/api/.env.example apps/api/.env
# при желании поменяй JWT_ACCESS_SECRET на свою случайную строку

# 4. Накатить схему БД (создаст таблицы users, sessions)
npm run prisma:migrate

# 5. Создать dev-пользователя admin/admin, чтобы сразу увидеть интерфейс
npm run db:seed
```

```bash
# 6. Настроить адрес API для мобильного приложения
cp apps/mobile/.env.example apps/mobile/.env
# localhost подходит для эмулятора/симулятора на этой же машине.
# Для физического устройства пропиши там IP своего компьютера в локальной сети.
```

Apple/Google Sign-In при этом не настроены — это нормально, см. раздел ниже. Всё остальное (email/пароль, геймификация, друзья) работает без них.

## Запуск в разработке

Два терминала:

```bash
# Терминал 1 — backend, http://localhost:4000
npm run dev:api
```

```bash
# Терминал 2 — мобильное приложение (веб/iOS/Android из одного меню)
npm run dev:mobile
```

`npm run dev:mobile` откроет меню Expo — оттуда можно открыть приложение в браузере (`w`), в Expo Go на телефоне (QR-код) или в симуляторе (`i` / `a`, если установлены Xcode/Android Studio).

## Вход для просмотра интерфейса

После `npm run db:seed` уже существует пользователь:

- **email:** `admin@local.test`
- **password:** `admin`

⚠️ Это **только для локальной разработки**. Скрипт сида откажется выполняться, если `NODE_ENV=production`, но сам пароль всё равно нужно будет удалить/сменить перед публикацией приложения — не забыть об этом при переходе к продакшену.

## Sign in with Apple / Google (опционально)

Без этой настройки приложение полностью работает на email/пароле — Apple/Google кнопки просто показывают понятное сообщение вместо входа. Чтобы включить:

**Google:**
1. В [Google Cloud Console](https://console.cloud.google.com/) создать OAuth-клиенты (тип "iOS", "Android", "Web") для проекта.
2. Вписать их в `apps/mobile/.env`: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. На backend в `apps/api/.env` указать `GOOGLE_CLIENT_ID` — тот же ID, что стоит `audience` в токене (обычно Web client ID).

**Apple** (нужен платный Apple Developer Program):
1. Завести Services ID (или использовать bundle ID `com.mypetproj.app`) с включённым Sign in with Apple.
2. На backend в `apps/api/.env` указать `APPLE_CLIENT_ID` — этот Services ID/bundle ID.
3. Работает только на iOS (это и требование Apple, и ограничение нативного флоу — на Android/Web кнопка Apple не показывается).

Без этих переменных `/auth/apple` и `/auth/google` отвечают `501`, а не падают — остальной сервер продолжает работать.

## Что уже реализовано

**Аутентификация**
- Регистрация и вход (email + пароль), Apple Sign-In (iOS) и Google Sign-In — см. раздел выше про настройку
- Опция **«неограниченная сессия»** на регистрации и входе — если включена, refresh-токен не имеет срока действия (в БД `sessions.expiresAt = null`); иначе сессия живёт 30 дней
- Access-токен (JWT, 15 минут) + refresh-токен (непрозрачный, хранится в БД только его хэш)
- Вход через Apple/Google привязывается к существующему аккаунту по email, если такой уже есть, иначе создаёт новый

**Геймификация**
- Персонаж: уровень, опыт (XP), здоровье (HP). Опыт растёт по прогрессии 100 + 50×(уровень-1) на переход; level-up лечит персонажа и немного увеличивает maxHP
- Epic Win → Квесты → Ежедневные задачи, с описанием, дедлайном и наградой в XP
- Отметка «выполнено сегодня» на ежедневной задаче начисляет XP и считает **стрик** (дней подряд)
- Завершение квеста начисляет XP; провал квеста наносит урон персонажу (-20 HP) — это осознанное упрощение: HP меняется только по явному действию пользователя, а не автоматически по пропущенным дням (см. ниже)
- Совместные Epic Win: список участников, приглашение уже зарегистрированного пользователя по email
- Экраны: дашборд (персонаж + список Epic Win), Epic Win (квесты + прогресс), квест (ежедневные задачи + чекбоксы), формы создания на каждом уровне

**Друзья и рейтинги**
- Запрос в друзья по email, принятие/отклонение входящих запросов
- Лидерборд: общий (топ-50 по уровню/XP) и «мой» — я + мои друзья

**Таймлайн**
- Дедлайны у Epic Win и квеста задаются через быстрые пресеты (+неделя/+месяц/+3 месяца) или свою дату
- Экран «Таймлайн» — все квесты с дедлайном по всем моим Epic Win, ближайшие сверху, просроченные подсвечены

**AI-коуч**
- `GET /coach/tip` — совет по текущему состоянию персонажа/квестов. Реализация — `RuleBasedAICoachService`: набор правил, **не настоящий вызов LLM** и не требует API-ключа. Интерфейс `AICoachService` — единственное место, которое нужно поменять, чтобы подключить реального провайдера (DeepSeek/Gemini/Groq/Claude), не трогая остальной код

**Известные упрощения v1** (осознанно, не баг):
- HP не падает автоматически, если пропустить день — только когда квест явно помечен «провален». Автоматическое отслеживание пропущенных дней с учётом часовых поясов — отдельная, более сложная задача на будущее.
- Приглашение в совместную Epic Win и в друзья работает только по email уже зарегистрированного пользователя — инвайт-ссылок и push-уведомлений пока нет.
- Порядок квестов внутри Epic Win фиксируется при создании (по `position`), перетаскивания/сортировки в UI пока нет.
- AI-коуч — правило-ориентированная заглушка, не реальная LLM (см. выше).

## API (backend)

Все эндпоинты ниже, кроме `/auth/*` и `/health`, требуют `Authorization: Bearer <accessToken>`.

```
POST   /auth/register            { email, password, displayName?, unlimitedSession? }
POST   /auth/login               { email, password, unlimitedSession? }
POST   /auth/apple               { identityToken, displayName?, unlimitedSession? }  — 501, если не настроен APPLE_CLIENT_ID
POST   /auth/google              { idToken, unlimitedSession? }                      — 501, если не настроен GOOGLE_CLIENT_ID
POST   /auth/refresh             { refreshToken }
POST   /auth/logout              { refreshToken }

GET    /character                — персонаж текущего пользователя (level/xp/hp)

GET    /epic-wins                — список моих Epic Win (владелец или участник)
POST   /epic-wins                { title, description?, deadline? }
GET    /epic-wins/:id
PATCH  /epic-wins/:id            (только владелец)
DELETE /epic-wins/:id            (только владелец)
POST   /epic-wins/:id/members    { email }  — пригласить существующего пользователя
POST   /epic-wins/:id/quests     { title, description?, deadline?, xpReward? }

GET    /quests/:id
PATCH  /quests/:id
DELETE /quests/:id
POST   /quests/:id/complete      — награда XP владельцу действия
POST   /quests/:id/fail          — урон -20 HP владельцу действия
POST   /quests/:questId/daily-tasks   { title, description?, xpReward? }

PATCH  /daily-tasks/:id
DELETE /daily-tasks/:id
POST   /daily-tasks/:id/complete     — отметить выполненным сегодня (+XP)
DELETE /daily-tasks/:id/complete     — снять отметку за сегодня

GET    /friends                      — список друзей
GET    /friends/requests             — входящие и исходящие запросы (status=PENDING)
POST   /friends/requests             { email }
POST   /friends/requests/:id/respond { accept: boolean }

GET    /leaderboard?scope=global|friends

GET    /timeline                     — квесты с дедлайном по всем моим Epic Win, по возрастанию даты

GET    /coach/tip                    — { tip: string }, см. "AI-коуч" выше
```

## Дальше по архитектуре (см. CLAUDE.md)

- Настоящий провайдер для AI-коуча вместо `RuleBasedAICoachService` (см. раздел "AI-коуч" выше)
- Мини-комьюнити как отдельная сущность (сейчас "мой лидерборд" = я + все мои друзья одним списком, без деления на группы)
- Drag & drop сортировка квестов, редактирование дедлайна из UI (сейчас — только при создании)
- Web-сборка (Expo уже настроен на это — `npm run dev:mobile` → клавиша `w`), но пока не тестировалась предметно
- Web-сборка (Expo уже настроен на это — `npm run dev:mobile` → клавиша `w`), но пока не тестировалась предметно
