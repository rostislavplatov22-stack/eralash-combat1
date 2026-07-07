# Arena Flow 17.0 — Premium Arena Mood System

Версия 17.0 усиливает Arena Select не новой логикой запуска, а дорогим stage-feel внутри боя.

## Что добавлено

- Уникальный Arena Mood для каждой арены:
  - Black Citadel — золотой moon backlight, дым, искры.
  - Infernal Bridge — красный furnace light, heat haze, aggressive ember rain.
  - Moon Ritual — синий lunar bloom, ritual fog, чистые силуэты.
  - Frozen Throne — pale haze, snow dust, icy edge light.
- Arena Intro 17.0 перед боем:
  - название выбранной арены;
  - короткая cinematic-фраза;
  - цвет и свечение берутся из выбранной арены.
- Stage Mood badge во время боя:
  - показывает активную арену;
  - показывает lighting + atmosphere;
  - не мешает HUD и тач-кнопкам.
- Canvas FX для боя:
  - back light layer;
  - floor mood grade;
  - foreground fog;
  - ambient particles;
  - arena-specific color grading.
- Mobile-safe режим:
  - меньше частиц на телефонах;
  - меньше fog layers на слабых устройствах;
  - нет тяжёлых blur в игровом цикле.
- Flow 16.3 сохранён:
  - Start Fight работает;
  - Character Select открывается поверх меню;
  - Arena Select открывается поверх меню;
  - выбранная арена передаётся в бой.

## Проверка

- JS syntax check: пройден.
- npm run build: пройден.
- dist обновлён.

## Коммит

```bash
git add .
git commit -m "feat: add Arena Flow 17.0 mood system"
git push
```
