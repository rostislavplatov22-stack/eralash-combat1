# EraLash Combat — Sprite Combat 9.1 Visible Fix

Этот патч исправляет проблему, когда после Sprite Combat 9.0 на экране боя были видны только nameplate-таблички, а сами бойцы исчезали.

## Причина

Внутри `index.html` оставался более поздний блок `FIGHTER RIG 8.0`, который повторно объявлял `drawPremiumFighterArt()` и перекрывал новый sprite-sheet renderer. Из-за этого новые sprite sheets не становились финальным renderer слоем.

## Исправлено

- финальный renderer теперь сначала вызывает `drawSpriteSheetFighter(f)`;
- старый Fighter Rig используется только как fallback;
- sprite sheets repack: кадры автоматически обрезаны по alpha/bbox и собраны заново с ровной нижней линией ног;
- добавлен cache-busting для `assets/sprites/*.png`;
- увеличен читаемый размер бойцов;
- усилен contrast/brightness/drop shadow, чтобы бойцы не терялись на тёмной арене;
- при старте боя выводится маркер `SPRITE COMBAT 9.1`.

## Проверка

После деплоя нажать `Начать бой`. Должно быть видно:
- Shadow Raven;
- Iron Warden;
- анимации idle/walk/light/heavy/block;
- маркер `SPRITE COMBAT 9.1`.

Supabase SQL не нужен.
