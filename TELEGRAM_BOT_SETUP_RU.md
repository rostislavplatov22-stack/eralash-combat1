# EraLash Combat — подключение Telegram Mini App

## 1. Создать бота

1. Открой Telegram.
2. Найди `@BotFather`.
3. Отправь `/newbot`.
4. Задай имя и username.
5. Скопируй `BOT_TOKEN`.

## 2. Настроить Web App кнопку в BotFather

В BotFather можно добавить Web App через меню бота:
- `/mybots`
- выбрать своего бота
- `Bot Settings`
- `Menu Button`
- указать URL Vercel проекта, например `https://eralash-combat1.vercel.app`

## 3. Добавить переменные окружения в Vercel

Открой проект на Vercel:

`Project → Settings → Environment Variables`

Добавь:

```text
BOT_TOKEN=твой_токен_из_BotFather
PUBLIC_APP_URL=https://твой-домен.vercel.app
TELEGRAM_WEBHOOK_SECRET=любая-длинная-строка
SETUP_SECRET=любой-приватный-код
```

После добавления переменных нажми `Redeploy`.

## 4. Включить webhook

После redeploy открой в браузере:

```text
https://твой-домен.vercel.app/api/set-webhook?secret=твой_SETUP_SECRET
```

Должен прийти JSON:

```json
{"ok":true}
```

## 5. Проверить

1. Открой бота в Telegram.
2. Напиши `/start`.
3. Нажми кнопку `⚔️ Играть в EraLash Combat`.
4. Игра должна открыться внутри Telegram.
5. Заверши бой.
6. Результат отправится в `/api/result`.

## 6. Важно для production

В этом архиве leaderboard хранится в demo in-memory store. Для полноценного продукта подключи постоянную БД:
- Vercel Postgres;
- Neon;
- Supabase;
- PostgreSQL на Render/Fly.

Без постоянной БД рейтинг может очищаться после cold start serverless-функций.
