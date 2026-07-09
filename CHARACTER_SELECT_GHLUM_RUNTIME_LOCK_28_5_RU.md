# 28.5 Character Select Ghlum Runtime Lock Hotfix

## Цель
Исправить критический баг: Ghlum выбирался в Character Select визуально, но в бою запускался старый персонаж.

## Причина
`/api/content` мог возвращать устаревший список бойцов без Ghlum. После этого `contentFighter()` искал `ghlum` в server-content, не находил его и падал в fallback на Raven.

Дополнительно `resetRoundPositions()` перезаписывал параметры игрока Raven/Warden-настройками после `makeFighter()`, из-за чего новый персонаж терял уникальный combat runtime.

## Исправлено
- Добавлен merge DEFAULT fighters + backend fighters.
- Ghlum больше не пропадает, даже если backend ещё не обновлён.
- `contentFighter()` теперь ищет выбранного бойца в merged roster.
- `startSelectedCharacterMatch()` жёстко фиксирует выбранного бойца перед Arena Select.
- `startSelectedArenaMatch()` повторно фиксирует выбранного бойца перед `newMatch()`.
- `resetRoundPositions()` больше не перезаписывает Ghlum на старые Raven/Warden параметры.
- Ghlum сохраняет свой combat runtime:
  - sprite / art
  - HP
  - collision
  - low-profile capsule
  - speed / accel / jump
  - poison identity

## Сохранено
- 28.4 Character Select layout.
- 28.0 Ghlum combat / poison.
- 27.0 Hit Reaction / Stagger / KO.
- 26.10 Combat Readability.
- Start Fight flow.
