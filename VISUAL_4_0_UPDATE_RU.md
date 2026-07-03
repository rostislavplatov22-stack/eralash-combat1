# EraLash Combat — Visual 4.0 Cinematic Overhaul

Большое premium-обновление визуала без изменения backend-архитектуры.

## Что улучшено

- Новая 2.5D cinematic arena:
  - многослойный фон;
  - архитектурные силуэты;
  - runic combat seal;
  - перспективный пол;
  - туман, искры, spotlight-зоны;
  - foreground particles;
  - premium vignette.

- Новый rendering бойцов:
  - сильный силуэт;
  - броня, наплечники, шлем;
  - glowing visor;
  - плащ / energy ribbons;
  - premium nameplate;
  - усиленные dodge afterimages;
  - улучшенный block shield;
  - cinematic special / ultimate aura.

- Premium combat FX:
  - более плотные slash trails;
  - усиленные hit sparks;
  - glow / shock visual;
  - более дорогие floating damage texts;
  - cinematic letterbox во время ultimate.

- HUD / UI polish:
  - более дорогие HP bars;
  - улучшенный timer;
  - premium fighter cards;
  - кнопки управления с glass / glow стилем;
  - усиленный hero menu;
  - Visual 4.0 badge.

## Что не менялось

- Vercel Hobby single-function architecture.
- Supabase schema.
- Telegram Bot/WebApp.
- Shop, Stars, inventory, missions, achievements, boss rush, analytics, liveops, admin, referral, season.

## Деплой

1. Удалить старую папку `api` в репозитории.
2. Скопировать все файлы архива.
3. Commit:
   `Add Visual 4.0 cinematic overhaul`
4. Push origin.
5. Дождаться Ready в Vercel.

Supabase SQL выполнять не нужно.
