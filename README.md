# EraLash Combat — Dark Arena

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
