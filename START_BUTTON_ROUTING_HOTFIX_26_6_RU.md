# Start Button Routing Hotfix 26.6

## Что исправлено

- Исправлена ситуация, когда на главном экране кнопка **НАЧАТЬ БОЙ** визуально нажималась, но ничего не происходило.
- Добавлен жёсткий rescue-layer для painted CTA:
  - прямой binding на `realStartZone`;
  - document-level coordinate routing;
  - поддержка `pointerdown`, `click`, `touchend`;
  - расширенная зона попадания вокруг кнопки;
  - verification fallback после клика.
- Логика не зависит жёстко от старого `gameState === "menu"`, а проверяет реальную видимость меню и открытые overlay.
- Сохранены 26.5 combat pose scale / block readability fixes.
- Сохранены approved fullscreen arena backgrounds.

## Проверка

1. Открыть главный экран.
2. Нажать **НАЧАТЬ БОЙ**.
3. Должен открыться Character Select / дальнейший fight flow.
4. Проверить на desktop и после Ctrl+F5.

## Commit

```bash
git add .
git commit -m "fix: restore main start button routing 26.6"
git push
```

## Summary

Fixed Start Button Routing 26.6 by adding a hardened rescue layer for the painted main menu START FIGHT CTA with direct DOM binding, enlarged coordinate hit area, pointer/click/touch support, verification fallback, and preserved 26.5 combat pose readability.
