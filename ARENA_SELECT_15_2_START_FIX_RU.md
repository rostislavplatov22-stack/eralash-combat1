# Arena Select 15.2 — Start Fix

Патч исправляет проблему: после нажатия «Начать бой» ничего не происходит.

## Причина

В 15.1 старый cinematic clickmap и start handlers могли не доходить до Character Select. Часть логики зависела от `gameState === 'menu'` и координат hotzone.

## Исправление

- добавлен независимый `forceOpenCharacterSelect15_2`;
- убрана хрупкая зависимость от gameState для открытия выбора персонажа;
- добавлена видимая premium-кнопка поверх меню;
- добавлены click / pointer / touch handlers;
- добавлен document-level delegate;
- сохранён flow: Character Select → Arena Select → Fight.
