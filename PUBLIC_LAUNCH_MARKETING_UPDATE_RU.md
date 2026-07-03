# EraLash Combat — Public Launch Marketing Pack

Этот пакет переводит Release 1.0 в публичную упаковку для запуска аудитории.

## Добавлено

- `/api/launch` — публичный launch event, Founder Drop, season rewards.
- `/api/news` — новости проекта для бота и Mini App.
- `/api/founder-bonus` — выдача Founder reward первым 100 игрокам.
- Бот-команды `/about`, `/rules`, `/news`, `/launch`.
- Кнопки Mini App: `📣 Launch`, `📰 News`, `🎖️ Founder Gift`.
- Таблицы Supabase `launch_claims` и `news_posts`.

## Что проверить после деплоя

```text
https://eralash-combat1.vercel.app/api/launch
https://eralash-combat1.vercel.app/api/news
https://eralash-combat1.vercel.app/api/founder-bonus
```

В Telegram:

```text
/start
/about
/rules
/news
/launch
```

## Supabase

После загрузки архива обязательно выполнить свежий `supabase_schema.sql`, затем:

```sql
notify pgrst, 'reload schema';
```

## Зачем это нужно

Теперь игрок не просто видит игру, а понимает запуск:

1. Что это за игра.
2. Как играть.
3. Что он получит в первые минуты.
4. Зачем приглашать друзей.
5. Почему нужно вернуться в season leaderboard.
