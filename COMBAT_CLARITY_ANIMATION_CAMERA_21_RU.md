# Combat Clarity, Animation & Camera Rework 21.0

Версия 21.0 — крупный premium-rework боевой читаемости, анимационного поведения персонажей и камеры.

## Главная цель

Сделать бой понятнее и дороже:
- удар читается не только эффектом, но и позой персонажа;
- контакт появляется в точке попадания;
- камера держит красивый duel framing;
- фон поддерживает бойцов, а не мешает им;
- HUD показывает важное только в нужный момент.

## Что добавлено

### Combat Clarity System 21.0
- отдельные readable-позы для startup / active / recovery;
- визуальное усиление LIGHT / HEAVY / SPECIAL / ULTIMATE;
- отдельная block readability pose;
- отдельная hit reaction readability pose;
- recovery/body-language подсказки после сильных действий.

### Contact FX System 21.0
- точка контакта рассчитывается по attacker / defender / direction;
- spark, slice и contact core теперь появляются в зоне попадания;
- BLOCK / COUNTER / HEAVY / SPECIAL / ULTIMATE имеют разные визуальные веса;
- damage/contact callout привязан к реальному моменту удара.

### Camera Director 21.0
- duel framing держит бойцов в красивом кадре;
- небольшой zoom при близком бою;
- micro camera punch на heavy / special / ultimate;
- ultimate focus не ломает фон;
- mobile-safe camera ограничивает резкие движения.

### Stage Clarity Rework 21.0
- затемнена шумная архитектура вокруг зоны боя;
- добавлен мягкий световой овал на боевой зоне;
- нижний foreground больше не съедает ноги;
- бойцы стали главной точкой внимания.

### Combat HUD Cleanup 21.0
- Stage Mood badge больше не висит весь бой;
- AI / Combo Trainer панели появляются только при значимых событиях;
- Physics HUD не мешает обычной игре;
- Combat Clarity overlay показывает только важные hit/contact моменты.

## Сохранено из предыдущих версий

- Arena Flow 17.0;
- Combat Impact 18.0;
- Tactical AI & Combo 19.0;
- Combat Physics & Character Visual 20.1;
- Start Fight flow 16.3;
- mobile controls;
- Vercel/static deployment.

## Проверка

- `npm run build` проходит;
- JS syntax check проходит;
- бой запускается;
- персонажи остаются читаемыми;
- удары видны в момент контакта;
- камера не ломает Black Citadel stage framing;
- HUD стал чище.
