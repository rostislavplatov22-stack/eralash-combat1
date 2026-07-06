# EraLash Combat — Premium Fighters 6.0

Интеграция новых full-body персонажей в боевой экран.

## Что добавлено

- `assets/fighter-shadow-raven.png` — новый Shadow Raven с красным визором.
- `assets/fighter-iron-warden.png` — новый Iron Warden с синим визором и щитом.
- Старые procedural/stickman бойцы теперь используются только как fallback, если ассеты не загрузились.
- Добавлены тени под персонажами.
- Добавлена цветная aura-подсветка для читаемости на тёмной арене.
- Добавлены premium nameplates.
- Сохранены hit flash, slash trails, block shield и attack VFX.
- Расширена combat-zone на exact Black Citadel arena.
- Стартовые позиции бойцов разнесены шире, чтобы большие персонажи не накладывались.

## Важно

Supabase SQL не нужен. Telegram, API, Stars, админка и база данных не менялись.

## Проверка после деплоя

1. Открыть игру.
2. Нажать “Начать бой”.
3. Проверить, что вместо простых фигурок появились новые персонажи:
   - Shadow Raven — красный.
   - Iron Warden — синий.
4. Проверить:
   - движение;
   - удары L/H/SP/ULT;
   - блок;
   - победу/поражение.
