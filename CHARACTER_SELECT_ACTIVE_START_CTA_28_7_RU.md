# 28.7 Character Select Active Start CTA Hotfix

## Причина
В 28.6 кнопка Start Fight визуально присутствовала, но могла быть неактивной из-за старого inline `z-index: 180 !important` на Character Select и слоёв, которые перехватывали input.

## Исправлено
- Character Select поднимается inline `z-index` выше старых overlay/canvas слоёв.
- Arena Select тоже поднимается выше старых слоёв.
- Start Fight принудительно активируется: `disabled=false`, `pointer-events:auto`, высокий z-index.
- Добавлены pointerdown / pointerup / touchend / click обработчики прямо на кнопку.
- Добавлен geometry fallback: клик в зоне кнопки запускает выбранного бойца даже если event target пришёл не с кнопки.
- Выбранный fighter жёстко фиксируется перед стартом.
- Ghlum runtime lock 28.5 сохранён.
- Character Select viewport polish 28.4 сохранён.

## Проверка
- JS syntax check проходит.
