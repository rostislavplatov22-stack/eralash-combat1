# EraLash Combat — Content System Update

Этот пакет добавляет backend-контентную систему для персонажей, арен, способностей и live-баланса.

## Новые публичные API

```text
/api/content
/api/fighters
/api/arenas
/api/abilities
```

Все они работают через один файл `api/[route].js`, поэтому проект остаётся совместимым с лимитом Vercel Hobby на количество Serverless Functions.

## Новые таблицы Supabase

```text
fighters
arenas
abilities
content_balance
```

Файл `supabase_schema.sql` уже содержит полный SQL. Выполни его в Supabase SQL Editor после деплоя.

## Что появилось в Mini App

В меню игры появилась кнопка:

```text
🧬 Контент
```

Через неё игрок может выбрать бойца, AI-противника и арену из Supabase. Выбор сохраняется в `localStorage` и применяется со следующего раунда.

## Admin API

Через `/api/admin` теперь доступны действия:

```json
{ "action": "upsertFighter", "fighter": { ... } }
{ "action": "upsertArena", "arena": { ... } }
{ "action": "upsertAbility", "ability": { ... } }
{ "action": "setFighterActive", "id": "raven", "active": true }
{ "action": "setArenaActive", "id": "obsidian_ring", "active": true }
{ "action": "setLiveBalance", "balance": { "activeFighterId": "raven", "enemyFighterId": "iron_warden", "activeArenaId": "obsidian_ring" } }
{ "action": "syncContent" }
```

## Проверка

После деплоя открой:

```text
https://eralash-combat1.vercel.app/api/content
https://eralash-combat1.vercel.app/api/fighters
https://eralash-combat1.vercel.app/api/arenas
https://eralash-combat1.vercel.app/api/abilities
```

Правильный ответ должен содержать:

```json
{
  "ok": true,
  "storage": "supabase-postgres"
}
```

Если API отвечает ошибкой про таблицу, выполни `supabase_schema.sql` в Supabase и потом:

```sql
notify pgrst, 'reload schema';
```
