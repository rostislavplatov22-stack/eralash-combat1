# Arena Approved Art Hotfix 25.2

## Что исправлено

25.1 всё ещё мог показывать дешёвый процедурный canvas fallback в бою, если real-art stage plate не успевал загрузиться или браузер держал старые ассеты в кеше. Из-за этого на fight screen появлялись абстрактные силуэты/плашки вместо approved-арены.

## Исправления 25.2

- Approved art теперь используется как главный canvas stage plate.
- Новый набор ассетов получил cache-busted имена `25-2`.
- Старый процедурный fallback больше не рисует дешёвые здания/формы.
- Убрана надпись названия арены поверх боевого фона.
- Stale localStorage arena id нормализуется, чтобы старые названия/режимы не ломали stage.
- Debug panel скрыт из premium-подачи.
- Добавлены HUD-safe WebP-версии approved images.
- Arena Select thumbnails и hero preview переведены на новые 25-2 ассеты.

## Проверка

- `npm run build` проходит.
- JS syntax check проходит.
