# 28.8 Main Menu Start Force Hotfix

Исправлен главный старт с Command Deck: клики по большой painted-кнопке «НАЧАТЬ БОЙ» теперь перехватываются на уровне window capture до старых overlay/document handlers.

## Исправлено
- stale gameState больше не блокирует старт, когда главное меню уже видно;
- старые result/fight/arena overlay классы очищаются перед открытием Character Select;
- Start Zone и startBtn принудительно активны;
- добавлен viewport/geometry fallback по зоне большой кнопки;
- Character Select форсируется visible, если старый flow молча не открыл его;
- Ghlum runtime selection из 28.5 сохранён;
- Character Select Start routing 28.7 сохранён.
