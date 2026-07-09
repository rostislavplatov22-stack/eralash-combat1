# 28.6 — Character Select Start Fight Routing Hotfix

Исправлена критическая проблема, при которой кнопка **Start Fight** в Character Select могла визуально нажиматься, но не запускала переход дальше.

## Что исправлено

- Добавлен жёсткий routing для `#csStartFightBtn`.
- Start Fight теперь слушает `pointerdown`, `touchend` и `click`.
- Добавлен capture-level обработчик, чтобы старые overlay-слои не перехватывали клик.
- Добавлен координатный fallback по нижней зоне command panel.
- Выбранный fighter перед стартом повторно фиксируется в:
  - `contentState.fighterId`
  - `contentBundle.balance.activeFighterId`
  - `localStorage`
- Ghlum больше не теряется при переходе к Arena Select.
- Если Arena Select не открылся, есть direct fallback в бой.
- Сохранены 28.5 Ghlum Runtime Lock, 28.4 viewport polish и 28.0 Ghlum combat.

## Acceptance

- Выбор Raven / Iron Warden / Ghlum работает.
- Кнопка Start Fight реагирует на desktop и mobile.
- После выбора Ghlum Start Fight ведёт дальше с Ghlum как выбранным бойцом.
- Старые reference/canvas/overlay слои не могут блокировать кнопку.
