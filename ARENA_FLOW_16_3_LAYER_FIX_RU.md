# Arena Flow 16.3 — Layer Fix / Start Fight Hotfix

## Исправлено

Кнопка **НАЧАТЬ БОЙ** могла выглядеть неактивной, потому что Character Select / Arena Select открывались, но оставались **под главным Real Art меню**.

Причина:
- Real Art меню имело `z-index: 60`;
- Character Select был `z-index: 52`;
- Arena Select был `z-index: 53`;
- поэтому обработчик клика мог сработать, но пользователь видел всё тот же главный экран.

## Что сделано

- Character Select поднят до premium overlay-layer `z-index: 180`.
- Arena Select поднят до `z-index: 181`.
- Arena Reveal поднят до `z-index: 182`.
- При открытом выборе персонажа/арены главное меню больше не перехватывает клики.
- Добавлен `Start Flow Layer Guard 16.3`.
- Big painted button **НАЧАТЬ БОЙ** теперь имеет координатный fallback по зоне клика.
- Start Fight в Character Select принудительно открывает Arena Select.
- Start Fight в Arena Select принудительно запускает бой.
- Добавлен emergency API:
  - `window.eralashStartFight()`
  - `window.eralashOpenArenaSelect()`
  - `window.eralashDirectFight()`

## Проверка

1. Открыть главную страницу.
2. Нажать **НАЧАТЬ БОЙ**.
3. Должен появиться Character Select поверх меню.
4. Нажать **Start Fight**.
5. Должен появиться Arena Select.
6. Нажать **Start Fight**.
7. Должен появиться cinematic reveal и затем сам бой.
