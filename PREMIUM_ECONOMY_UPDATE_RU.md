# EraLash Combat — Premium Economy Update

Версия добавляет premium-прогресс для Telegram Mini App:

- Daily rewards с streak;
- Premium shop за coins;
- Telegram Stars invoice endpoint;
- Inventory;
- Weekly leaderboard;
- Admin endpoint для безопасной синхронизации каталога;
- Supabase/Postgres таблицы `shop_items`, `inventory`, `daily_claims`, `purchases`.

## Что загрузить в GitHub

Загрузи в репозиторий всё содержимое архива с заменой файлов.

Обязательно проверь, что появились:

```text
api/_economy.js
api/shop.js
api/inventory.js
api/daily-reward.js
api/weekly-leaderboard.js
api/stars-invoice.js
api/admin.js
supabase_schema.sql
```

## Что выполнить в Supabase

Открой:

```text
Supabase → SQL Editor → New query
```

Скопируй весь файл:

```text
supabase_schema.sql
```

Нажми **Run**.

SQL безопасный: его можно запускать повторно, потому что используются `if not exists` и `on conflict`.

## Переменные Vercel

Обязательные:

```text
BOT_TOKEN
PUBLIC_APP_URL
TELEGRAM_WEBHOOK_SECRET
SETUP_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Опционально для админки:

```text
ADMIN_TELEGRAM_IDS
```

Пример значения:

```text
123456789,987654321
```

## После GitHub Push

1. Открой Vercel.
2. Дождись нового деплоя.
3. Если переменные менялись — сделай Redeploy.
4. Проверь:

```text
https://eralash-combat1.vercel.app/api/shop
https://eralash-combat1.vercel.app/api/weekly-leaderboard
https://eralash-combat1.vercel.app/api/leaderboard
```

## Telegram bot commands

После обновления бот поддерживает:

```text
/start
/play
/profile
/leaderboard
/daily
/shop
```

В меню бота появятся кнопки:

- 🎁 Daily
- 🛒 Магазин
- 🥇 Weekly Top

## Telegram Stars

Endpoint:

```text
POST /api/stars-invoice
```

Требует запуск из Telegram Mini App, потому что проверяет `initData`.
