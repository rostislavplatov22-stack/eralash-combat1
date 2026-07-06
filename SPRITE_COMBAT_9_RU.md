# Sprite Combat 9.0 — Real Sheet Animations

Патч заменяет статичные PNG-персонажи в бою на загруженные sprite sheets.

## Что добавлено

- Raven idle / walk / light / heavy / block sheets.
- Iron Warden idle / walk / light / block sheets.
- Новый рендерер `drawSpriteSheetFighter`.
- Выбор анимации по состоянию бойца: idle, walk, attack, block, hit.
- Кадры атаки синхронизированы с `stateT` и timing атаки.
- Старый full-body PNG остался fallback, но в бою первым используется sprite sheet.
- Метка проверки версии: `SPRITE COMBAT 9.0`.

## Важно

Некоторые sprite sheets были с шахматным фоном, поэтому фон очищен программно.
Для идеальной версии всё равно лучше экспортировать настоящие PNG с прозрачностью из генератора.
