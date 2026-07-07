# Combat AI & Combo 19.0 — Premium tactical AI and combo system

Версия 19.0 усиливает саму боёвку после Combat Impact 18.0: противник теперь принимает более осмысленные решения, комбо читаются лучше, блок нельзя держать бесконечно, а игрок получает понятную обратную связь по цепочкам ударов.

## Что добавлено

- Tactical AI Mind 19.0:
  - AI оценивает дистанцию, угрозу атаки, whiff recovery, HP lead, stamina и наличие энергии.
  - Easy / Normal / Hard теперь отличаются реакцией, блоком, агрессией, punish-дисциплиной и частотой combo plan.
  - AI умеет делать reset на дистанцию при низкой stamina.
  - AI использует whiff punish, если игрок промахнулся heavy / special.
  - AI давит guard break, если игрок слишком долго стоит в блоке.

- Planned combo routes:
  - LIGHT → LIGHT → HEAVY = Raven Basic Chain.
  - LIGHT → HEAVY → SPECIAL = Rift Breaker.
  - HEAVY → SPECIAL = Punish Link.
  - LIGHT → LIGHT → SPECIAL = Dash Rift.
  - LIGHT → LIGHT → HEAVY → SPECIAL = Execution String.
  - Дополнительные pressure routes для heavy-персонажа.

- Guard Break 19.0:
  - Долгий блок теперь тратит stamina.
  - При нулевой stamina включается guard break, hitstun, shockwave и punish window.
  - Block pressure отображается через floating feedback.

- Combo Trainer 19.0:
  - Подсказка chain window после LIGHT → LIGHT.
  - Отдельный on-canvas overlay для подтверждённых combo routes.
  - Combo HUD показывает chain name, damage и best combo.

- Баланс и UX:
  - Улучшены combo bonus values.
  - Ultimate получил cooldown check.
  - AI plan HUD не ломает мобильный экран.
  - Mobile-safe: без тяжёлых DOM-перерисовок, overlay рисуется на canvas.

## Проверено

- Меню запускается.
- Character Select работает.
- Arena Select работает.
- Arena Flow 17.0 сохранён.
- Combat Impact 18.0 сохранён.
- Бой запускается.
- AI двигается, блокирует, атакует и использует combo plan.
- Guard break не ломает round state.
- npm run build проходит.
- JS syntax check проходит.

## Коммит

```bash
git add .
git commit -m "feat: add Combat AI and Combo 19.0"
git push
```
