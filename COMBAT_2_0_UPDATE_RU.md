# EraLash Combat — Combat 2.0 Premium Fight Feel

Этот пакет усиливает сам бой после того, как инфраструктура игры уже готова: Telegram Bot, Mini App, Vercel, Supabase, Stars, Admin, LiveOps и Analytics.

## Что добавлено

- Dodge / рывок-уклонение:
  - клавиатура: Q или Space;
  - мобильная кнопка: DGE;
  - короткая неуязвимость;
  - afterimage trail;
  - cooldown, чтобы игрок не спамил рывок.

- Ultimate attack:
  - клавиатура: O;
  - мобильная кнопка: ULT;
  - требует 100 энергии;
  - cinematic zoom;
  - letterbox эффект;
  - усиленный hit stop;
  - мощный knockback;
  - отдельный WebAudio-удар;
  - haptic feedback.

- Combo counter:
  - появляется после 2+ попаданий;
  - сбрасывается, если игрок долго не попадает;
  - помогает игроку чувствовать прогресс серии.

- Fight feel:
  - больше slash trails;
  - усилены hit sparks;
  - special / ultimate визуально отличаются;
  - исправлен расчёт HP через maxHp;
  - AI может dodge / block / special / ultimate;
  - персонажи получили dodge glow и более дорогой боевой силуэт.

## Управление

Desktop:

```text
A / D — движение
W — прыжок
Q / Space — dodge
J — light attack
K — heavy attack
L — special
O — ultimate
I — block
```

Mobile:

```text
слева: движение, jump, DGE
справа: L, H, BLK, SP, ULT
```

## Деплой

1. Удали старую папку `api`.
2. Скопируй файлы из архива в репозиторий.
3. Commit:
   `Add Combat 2.0 premium fight feel`
4. Push origin.
5. Vercel дождаться Ready.

## Supabase

Новых таблиц не требуется. Этот пакет меняет combat/UI, а не структуру базы.
