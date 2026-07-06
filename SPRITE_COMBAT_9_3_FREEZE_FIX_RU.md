# EraLash Combat — Sprite Combat 9.3 Freeze Fix

Исправление зависания после Sprite Combat 9.2.

## Что исправлено

- Убран setTimeout из updateHUD, который создавался каждый кадр и мог забивать браузер очередью задач.
- Delayed HP bar теперь обновляется только когда HP реально меняется.
- Добавлен safety guard для hitStop / slowMo / cameraZoom / roundFreeze.
- Добавлен try/catch вокруг основного game loop, чтобы единичная ошибка рендера не останавливала игру.
- Добавлен сброс input при blur / visibilitychange / pointercancel, чтобы персонаж не зависал в движении.
- Добавлена метка `SPRITE COMBAT 9.3`.

## Проверка

1. Начать бой.
2. Увидеть метку `SPRITE COMBAT 9.3`.
3. Проверить движение.
4. Нажать L/H/SP/ULT рядом с врагом.
5. Проверить, что игра не зависает после удара.
6. Проверить, что HP уменьшается.
