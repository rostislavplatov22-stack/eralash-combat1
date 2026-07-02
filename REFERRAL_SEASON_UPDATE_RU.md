# EraLash Combat — Referral + Share + Tournament Season Ready

Этот пакет добавляет рост и удержание внутри Telegram Mini App:

- реферальные ссылки;
- бонус за приглашение;
- кнопки Share / Invite;
- сезонный турнирный рейтинг;
- начисление season points после боя;
- новые команды бота `/invite` и `/season`;
- новые API `/api/referral` и `/api/season`.

## Новые API

```text
GET  /api/referral
POST /api/referral
GET  /api/season
```

## Что появится в Mini App

В блоке Premium Economy появятся кнопки:

```text
🤝 Invite
🏆 Season
```

На экране результата появится кнопка:

```text
📤 Share
```

## Как работает referral

Игрок открывает Invite, получает ссылку и отправляет другу.

Награды:

```text
Пригласивший: +50 XP, +100 coins
Новый игрок: +25 XP, +50 coins
```

Самореферал блокируется. Один новый игрок может быть привязан только к одному пригласившему.

## Как работает сезон

После каждого боя `/api/result` дополнительно начисляет season points.

Примерная логика:

```text
Победа: 100+ points
Поражение: 25 points
Бонус за раунды
Бонус за быструю победу
Бонус за clean win
```

## Что сделать после деплоя

1. Выполнить свежий `supabase_schema.sql` в Supabase SQL Editor.
2. Выполнить:

```sql
notify pgrst, 'reload schema';
```

3. Сделать Commit / Push.
4. Дождаться Vercel Ready.
5. Проверить:

```text
https://eralash-combat1.vercel.app/api/referral
https://eralash-combat1.vercel.app/api/season
```

## Опциональная переменная

Чтобы referral-ссылка была красивой вида `https://t.me/your_bot?start=ref_123`, добавь в Vercel:

```text
BOT_USERNAME=имя_бота_без_@
```

Без этой переменной система всё равно работает, но ссылка будет использовать web app URL.
