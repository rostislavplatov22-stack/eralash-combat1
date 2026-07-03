# EraLash Combat — Missions + Achievements + Boss Rush Ready

Этот пакет добавляет следующий слой удержания после Combat 2.0:

- ежедневные/боевые миссии;
- достижения;
- Boss Rush API;
- награды XP/coins за выполненные цели;
- прогресс миссий после боя;
- endpoint-ы `/api/missions`, `/api/achievements`, `/api/boss`;
- UI-кнопки в Mini App: `🎯 Missions`, `🏅 Achievements`, `👹 Boss Rush`.

## Что проверить после деплоя

```text
https://eralash-combat1.vercel.app/api/missions
https://eralash-combat1.vercel.app/api/achievements
https://eralash-combat1.vercel.app/api/boss
```

В Supabase обязательно выполнить свежий `supabase_schema.sql`, затем:

```sql
notify pgrst, 'reload schema';
```

## Важно

Перед копированием в GitHub Desktop удалить старую папку `api`, потому что проект работает через одну catch-all функцию `/api/[route].js`, чтобы не превысить лимит Vercel Hobby.
