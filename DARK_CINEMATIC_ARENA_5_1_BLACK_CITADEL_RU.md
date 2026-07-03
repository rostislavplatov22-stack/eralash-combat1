# Dark Cinematic Arena 5.1 — Black Citadel Courtyard

Интегрирована новая арена боя в стиле **Black Citadel Courtyard**.

## Что изменено

- Добавлен реальный arena-art asset: `assets/arena-black-citadel-courtyard.png`.
- Экран боя теперь рисует painted dark citadel background вместо простой canvas-сцены.
- Убрано ощущение debug-grid / тестовой карты.
- Добавлены живые слои поверх арта:
  - дым у пола;
  - ember particles;
  - мягкий moon / fortress backlight;
  - wet obsidian reflections;
  - subtle combat sigil;
  - cinematic vignette / letterbox depth.
- HUD, бой, API, Supabase и Telegram-интеграция не менялись.

## Проверка после деплоя

1. Открыть главное меню.
2. Нажать `Начать бой`.
3. Проверить `VS intro`.
4. Проверить новую арену в бою.
5. Проверить победу / поражение / restart.

Supabase SQL выполнять не нужно.
