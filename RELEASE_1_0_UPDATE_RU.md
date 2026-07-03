# EraLash Combat — Release 1.0 Ready

Этот пакет фиксирует стабильную версию перед запуском на аудиторию.

## Что добавлено

- `/api/health` — быстрый healthcheck сервиса.
- `/api/status` — публичный launch status без раскрытия секретов.
- `/api/qa` — admin-only полный QA snapshot.
- `/api/client-error` — сбор ошибок Mini App в Supabase.
- Admin action `GET /api/admin?action=launch&secret=...` — launch checklist внутри backend.
- Таблицы `client_errors`, `api_errors`, `payment_errors`, `telegram_errors`.
- Onboarding-блок на главном экране.
- Кнопка `🚀 QA` внутри Mini App.
- Команда бота `/status`.
- Release 1.0 launch checklist.

## Что проверить после деплоя

Открой:

```text
https://eralash-combat1.vercel.app/api/health
https://eralash-combat1.vercel.app/api/status
https://eralash-combat1.vercel.app/api/qa?secret=ТВОЙ_ADMIN_API_SECRET
https://eralash-combat1.vercel.app/api/admin?action=launch&secret=ТВОЙ_ADMIN_API_SECRET
```

Хороший статус:

```json
{
  "ok": true,
  "release": "1.0.0-rc",
  "storage": "supabase-postgres"
}
```

## Supabase

Выполни свежий `supabase_schema.sql` в Supabase SQL Editor и потом:

```sql
notify pgrst, 'reload schema';
```

## Telegram

Проверь команды:

```text
/start
/help
/status
/shop
/invite
/season
```

## Финальный checklist

- Bot отвечает.
- Mini App открывается.
- Меню скроллится на телефоне.
- Бой запускается.
- HP, XP, coins сохраняются.
- Daily reward не выдаётся второй раз.
- Promo WELCOME100 работает.
- Stars purchase выдаёт inventory.
- Referral link работает.
- Season leaderboard обновляется.
- Admin API закрыт secret и Telegram ID.
- `/api/status` показывает зелёный launch status.
