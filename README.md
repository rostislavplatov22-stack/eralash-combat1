# EraLash Combat — Visual 4.0 Cinematic Overhaul — Dark Arena
## Mobile Polish 1.8

Исправлены прокрутка меню в Telegram на телефоне, скрыта системная MainButton, усилен визуал боя и добавлен компактный HUD для мобильного экрана.



Premium browser / Telegram Mini App-ready fighting game.

## Что внутри

- `index.html` — игра одним файлом: Canvas, HUD, меню, управление, AI, раунды, эффекты.
- `package.json` — Vite-сборка для Vercel.
- `vercel.json` — production-friendly настройки.
- `.gitignore` — чистый GitHub-репозиторий без мусора.

## Локальный запуск

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy через GitHub + Vercel

1. Создай новый репозиторий на GitHub.
2. Загрузи все файлы из архива в корень репозитория.
3. Открой Vercel → Add New → Project.
4. Выбери GitHub-репозиторий.
5. Framework Preset: Vite.
6. Build Command: `npm run build`.
7. Output Directory: `dist`.
8. Нажми Deploy.

## Telegram Mini App

Игра уже вызывает `window.Telegram?.WebApp.ready()` и `expand()`, если запускается внутри Telegram WebView.
Для production Telegram Mini App нужен HTTPS URL из Vercel и кнопка Web App в Telegram-боте.


## Telegram Mini App integration

В этой версии добавлены:

- `/api/bot` — webhook для Telegram-бота;
- `/api/result` — приём результата боя;
- `/api/leaderboard` — demo leaderboard;
- `/api/set-webhook` — быстрая установка webhook;
- Telegram WebApp init в `index.html`;
- отправка результата боя через `Telegram.WebApp.sendData()` и `fetch('/api/result')`;
- `.env.example`;
- подробная инструкция `TELEGRAM_BOT_SETUP_RU.md`.

Для деплоя на Vercel:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Переменные окружения:

```text
BOT_TOKEN
PUBLIC_APP_URL
TELEGRAM_WEBHOOK_SECRET
SETUP_SECRET
```


## Production DB Update — Supabase/Postgres

Версия `1.2.0` добавляет реальное сохранение прогресса через Supabase/Postgres:

- `/api/result` сохраняет бой в `battles` и обновляет профиль в `users`;
- `/api/profile` отдаёт сохранённый профиль игрока по Telegram `initData`;
- `/api/leaderboard` отдаёт настоящий leaderboard;
- бот показывает реальные `/profile` и `/leaderboard`;
- если Supabase не настроен, проект автоматически работает в `memory-preview` режиме.

Файлы:

```text
api/_db.js
api/_store.js
api/profile.js
supabase_schema.sql
SUPABASE_SETUP_RU.md
```

Настройка базы описана в `SUPABASE_SETUP_RU.md`.


## Premium Economy Update

Добавлены:

- `/api/shop` — каталог и покупка за coins;
- `/api/inventory` — инвентарь игрока;
- `/api/daily-reward` — ежедневная награда;
- `/api/weekly-leaderboard` — недельный рейтинг;
- `/api/stars-invoice` — Telegram Stars invoice link;
- `/api/admin` — безопасная админ-синхронизация каталога по `ADMIN_TELEGRAM_IDS`.

Перед деплоем выполни SQL из `supabase_schema.sql` в Supabase.


## Telegram Stars Payments Update

В этой версии добавлена полноценная обработка Stars:

- `/api/stars-invoice` создаёт invoice link.
- `/api/bot` подтверждает `pre_checkout_query`.
- `/api/bot` обрабатывает `successful_payment`.
- Покупка записывается в `purchases`.
- Предмет добавляется в `inventory`.
- В боте команда `/shop` показывает кнопки прямой покупки за Stars.

После обновления обязательно выполнить свежий `supabase_schema.sql` в Supabase SQL Editor.


## Admin Panel + Promo + Anti-cheat

Эта версия добавляет production-инструменты:

- Admin dashboard;
- Shop Manager API;
- Players Manager API;
- Promo Codes;
- Anti-cheat result validation;
- Admin audit logs;
- Ban / unban;
- Grant coins / XP;
- Reset player progress.

Новые API:

```text
/api/admin
/api/promo
/api/anti-cheat
```

Новые Vercel переменные:

```text
ADMIN_TELEGRAM_IDS
ADMIN_API_SECRET
```

После деплоя выполни свежий `supabase_schema.sql` в Supabase SQL Editor.


## Content System

Добавлены API `/api/content`, `/api/fighters`, `/api/arenas`, `/api/abilities`, таблицы `fighters`, `arenas`, `abilities`, `content_balance`, выбор бойца/арены в Mini App и admin-actions для live-баланса.


## Referral + Season Update

Добавлены referral, share victory, сезонный рейтинг и начисление season points после боя. Подробности: `REFERRAL_SEASON_UPDATE_RU.md`.


## Release 1.0 Ready

Добавлены `/api/health`, `/api/status`, `/api/qa`, `/api/client-error`, onboarding, launch checklist, error logs и команда Telegram `/status`.

Подробнее: `RELEASE_1_0_UPDATE_RU.md`.


## Analytics + LiveOps + Feedback Ready

Добавлены `/api/launch`, `/api/news`, `/api/founder-bonus`, команды `/about`, `/rules`, `/news`, `/launch`, Founder Drop и launch-кнопки внутри Mini App.


## Analytics + LiveOps

Добавлены `/api/analytics`, `/api/feedback`, `/api/liveops`, события игроков, feedback форма и LiveOps конфиг.


## Combat 2.0 Premium Fight Feel

Добавлены dodge, ultimate, combo counter, cinematic zoom, afterimages, улучшенный AI и усиленные hit sparks/slash trails. Управление: `Q/Space` — dodge, `O` — ultimate, мобильные кнопки `DGE` и `ULT`.


## Missions + Achievements + Boss Rush

Добавлены `/api/missions`, `/api/achievements`, `/api/boss`, Supabase-таблицы миссий/достижений/боссов и новые UI-кнопки в Mini App.


## Visual 3.0

Добавлен premium art direction: новая кинематографичная арена, улучшенные бойцы, свет, туман, руны, slash trails и улучшенный mobile readability.


## Visual 4.0

Добавлен большой cinematic visual overhaul: 2.5D арена, premium HUD, улучшенные бойцы, slash trails, ultimate aura, foreground particles и меню с top-tier presentation.


## Visual 4.1

Добавлен cinematic combat framing fix: крупнее бойцы, центрирование камеры, исправление mirrored nameplate, усиление stage focus.
