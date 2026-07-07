# Fighter Motion & Combat Presence 26.0

Версия 26.0 усиливает именно бойцов, а не арены.

## Что сделано

- Добавлен новый fighter-motion renderer 26.0 поверх sprite combat.
- Усилены idle / walk / backstep / attack / block / hit визуальные состояния.
- Добавлены глубокие contact shadows под ногами, stance ring и мокрое floor reflection.
- Raven получил более читаемые assassin weapon trails и afterimage motion.
- Iron Warden получил тяжёлый shield core, armor brace и blue impact presence.
- Победитель в roundEnd получает aura-presence, побеждённый — readable defeated lean.
- Debug overlay скрыт в бою.
- Approved fullscreen arenas 25.3 сохранены без изменений.
- Combat bounds и fullscreen background из 25.3 сохранены.
- JS syntax check и npm run build проходят.

## Цель

Убрать ощущение, что персонажи — статичные PNG-стикеры на фоне, и дать им:
- вес;
- контакт с полом;
- читаемое движение;
- разную боевую идентичность;
- более дорогую combat presence.
