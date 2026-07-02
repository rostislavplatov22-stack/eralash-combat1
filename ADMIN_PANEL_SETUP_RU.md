# EraLash Combat — Admin Panel + Promo Codes + Anti-cheat

## Что добавлено

- `/api/admin` — админ API: dashboard, игроки, магазин, промокоды, выдача наград, бан/разбан.
- `/api/promo` — активация промокода игроком внутри Telegram Mini App.
- `/api/anti-cheat` — журнал подозрительных результатов боя.
- `/admin` через Mini App: кнопка **⚙️ Admin** на главном экране.
- Таблицы Supabase: `promo_codes`, `promo_redemptions`, `admin_audit_logs`, `anti_cheat_events`.
- Поля игрока: `banned`, `ban_reason`, `admin_note`.

## Новые переменные Vercel

Открой:

```text
Vercel → eralash-combat1 → Settings → Environment Variables
```

Добавь:

```text
ADMIN_TELEGRAM_IDS=твой_telegram_id
ADMIN_API_SECRET=длинный_секрет_для_тестов
```

`ADMIN_TELEGRAM_IDS` можно указать через запятую:

```text
123456789,987654321
```

`ADMIN_API_SECRET` нужен для проверки API в браузере:

```text
https://eralash-combat1.vercel.app/api/admin?secret=ТВОЙ_ADMIN_API_SECRET
```

## Где взять Telegram ID

В Telegram можно написать боту `@userinfobot` или любому ID-боту и скопировать свой numeric ID. Не путай ID с username.

## Supabase SQL

После загрузки нового архива в GitHub выполни в Supabase SQL Editor свежий файл:

```text
supabase_schema.sql
```

Потом отдельно выполни:

```sql
NOTIFY pgrst, 'reload schema';
```

## Проверка

### Admin dashboard

```text
https://eralash-combat1.vercel.app/api/admin?secret=ТВОЙ_ADMIN_API_SECRET
```

Должен быть JSON:

```json
{
  "ok": true,
  "admin": true
}
```

### Promo code

В игре нажми **🎟️ Promo** и введи:

```text
WELCOME100
```

### Anti-cheat

```text
https://eralash-combat1.vercel.app/api/anti-cheat?secret=ТВОЙ_ADMIN_API_SECRET
```

## Доступ из Telegram Mini App

1. Добавь `ADMIN_TELEGRAM_IDS`.
2. Сделай Vercel Redeploy.
3. Открой игру из своего Telegram-бота.
4. Нажми **⚙️ Admin**.

## Admin POST действия

Все POST-запросы требуют `X-Admin-Secret` или Telegram `initData`.

### Выдать coins / XP

```json
{
  "action": "grant",
  "telegramId": "123456789",
  "user": { "id": "123456789", "first_name": "Player" },
  "grant": { "coins": 500, "xp": 100 }
}
```

### Забанить игрока

```json
{
  "action": "ban",
  "telegramId": "123456789",
  "reason": "Suspicious result spam"
}
```

### Разбанить

```json
{
  "action": "unban",
  "telegramId": "123456789"
}
```

### Создать промокод

```json
{
  "action": "createPromo",
  "code": "LAUNCH500",
  "title": "Launch Bonus",
  "rewardCoins": 500,
  "rewardXp": 100,
  "maxUses": 100
}
```

### Включить/выключить товар

```json
{
  "action": "toggleShopItem",
  "itemId": "skin_obsidian_ronin",
  "active": false
}
```
