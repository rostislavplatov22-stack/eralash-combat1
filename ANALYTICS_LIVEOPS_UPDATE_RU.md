# EraLash Combat — Analytics + LiveOps + Feedback Ready

Этот пакет добавляет слой контроля реальных игроков после Public Launch.

## Новые API

```text
/api/analytics
/api/feedback
/api/liveops
```

## Что добавлено

- analytics events: `app_open`, `fight_start`, `fight_finish`, `daily_claim`, `shop_open`, `stars_click`, `promo_used`, `invite_click`, `season_open`, `feedback_submit`;
- admin analytics dashboard внутри Mini App;
- feedback form внутри Mini App;
- LiveOps config для наград, season points, maintenance mode и launch message;
- команды бота `/feedback`, `/report`, `/analytics`, `/liveops`;
- таблицы Supabase: `analytics_events`, `feedback_messages`, `liveops_config`.

## После деплоя

В Supabase SQL Editor выполнить свежий `supabase_schema.sql`, затем:

```sql
notify pgrst, 'reload schema';
```

Проверка:

```text
https://eralash-combat1.vercel.app/api/liveops
https://eralash-combat1.vercel.app/api/analytics?secret=ТВОЙ_ADMIN_API_SECRET&admin_id=6270205852
https://eralash-combat1.vercel.app/api/feedback?secret=ТВОЙ_ADMIN_API_SECRET&admin_id=6270205852
```

В Telegram проверить:

```text
/feedback
/analytics
/liveops
```

В Mini App появятся кнопки:

```text
💬 Feedback
📊 Analytics
🎛️ LiveOps
```
