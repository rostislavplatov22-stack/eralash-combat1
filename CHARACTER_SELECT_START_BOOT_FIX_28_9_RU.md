# 28.9 Character Select Start Boot Critical Fix

## Исправлено
- Устранён критический boot-crash JavaScript: `normalizeSelectedFighter28_5()` обращался к `CHARACTER_SELECT_META` до инициализации.
- Из-за этого весь runtime останавливался, а кнопка `НАЧАТЬ БОЙ` оставалась визуальной, но неактивной.
- Добавлена настоящая активная CTA-кнопка поверх главной кнопки Command Deck.
- Main Start теперь открывает Character Select через прямой hard bridge.
- Ghlum runtime lock сохранён.
- Character Select 28.4 / 28.5 логика сохранена.
