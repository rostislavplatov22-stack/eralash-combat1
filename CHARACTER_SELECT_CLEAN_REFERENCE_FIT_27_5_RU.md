# 27.5 Clean Approved Reference Fit Hotfix

Исправлена ошибка 27.4: поверх approved reference-арта оставались затемняющие overlay/DOM-слои, из-за чего экран выглядел сломанным, тёмным и дешёвым.

## Что исправлено
- Убраны декоративные затемняющие overlay поверх reference-арта.
- Character Select теперь показывает approved reference как чистую цельную поверхность.
- Добавлен asset `assets/character-select-approved-reference-clean-27-5.png`.
- Все старые DOM-карточки/панели сделаны полностью невидимыми.
- Сохранены invisible click zones:
  - выбор Raven
  - выбор Iron Warden
  - AI Difficulty
  - Start Fight
  - Back
  - Close
- Сохранён combat flow 27.0 и все стабильные фиксы 26.x.

## Коммит
`fix: clean approved character select reference fit 27.5`
