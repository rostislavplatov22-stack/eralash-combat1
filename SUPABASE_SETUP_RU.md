# Подключение реальной базы данных Supabase для EraLash Combat

Эта версия сохраняет XP, coins, wins, losses, streak и leaderboard в Supabase/Postgres.

## 1. Создай Supabase project

1. Открой Supabase.
2. Создай новый проект.
3. Дождись, пока база будет готова.

## 2. Создай таблицы

1. Supabase → SQL Editor.
2. New query.
3. Открой файл `supabase_schema.sql` из проекта.
4. Скопируй весь SQL.
5. Нажми Run.

Должны появиться таблицы:

```text
users
battles
```

## 3. Возьми ключи Supabase

В Supabase открой Project Settings / API или Connect.

Нужны:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Важно: `SUPABASE_SERVICE_ROLE_KEY` / secret key нельзя вставлять в `index.html`, нельзя отправлять в чат и нельзя хранить на frontend. Он должен быть только в Vercel Environment Variables.

## 4. Добавь переменные в Vercel

Vercel → Project `eralash-combat1` → Settings → Environment Variables.

Добавь:

```text
BOT_TOKEN=токен_бота_из_BotFather
PUBLIC_APP_URL=https://eralash-combat1.vercel.app
TELEGRAM_WEBHOOK_SECRET=твой_webhook_secret
SETUP_SECRET=eralash_setup_secret_2026_victory
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxx
```

Для каждой переменной выбери:

```text
Production
Preview
Development
```

## 5. Redeploy

После добавления переменных сделай:

```text
Vercel → Deployments → верхний деплой → ... → Redeploy
```

Дождись статуса `Ready`.

## 6. Проверь backend

Открой:

```text
https://eralash-combat1.vercel.app/api/leaderboard
```

Должно быть:

```json
{
  "ok": true,
  "storage": "supabase-postgres",
  "leaderboard": []
}
```

Если storage показывает `memory-preview`, значит Supabase-переменные не добавились или не был сделан Redeploy.

## 7. Проверь Telegram

1. Открой бота.
2. Напиши `/start`.
3. Нажми кнопку игры.
4. Заверши бой.
5. Открой `/api/leaderboard`.

После первого боя в leaderboard должен появиться игрок.

## 8. Команды бота

```text
/start
/play
/profile
/leaderboard
/help
```

Теперь `/profile` и `/leaderboard` берут данные из базы, если Supabase настроен.
