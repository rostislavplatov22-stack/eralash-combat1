# EraLash Combat — 26.9 Fighter Facing Lock Hotfix

## Что исправлено

- Исправлен визуальный разворот Raven: боец больше не должен стоять спиной / отвернувшись от противника.
- Разделены gameplay direction и native art direction.
- Raven full-body art теперь принудительно зеркалится в правильную сторону относительно оппонента.
- Iron Warden сохраняет правильное направление и premium full-body presentation.
- Backstep / walk больше не должны визуально разворачивать бойца спиной к дуэли.
- 26.8 scale / grounding / idle presence сохранены.
- 26.7 premium fighter base restore сохранён.
- 26.6 Start Button Routing сохранён.
- Approved fullscreen arenas сохранены.

## Техническая причина

Визуальный `ctx.scale(dir)` использовал направление бойца напрямую.
Но full-body Raven art имеет противоположную native orientation относительно игрового направления.
Из-за этого в idle / movement Raven мог выглядеть отвернувшимся.

В 26.9 добавлен отдельный `artDir`:

```js
const artDir = fighterIsWarden(f) ? dir : -dir;
```

Gameplay/hitbox direction остаётся прежним, меняется только зеркалирование full-body art.

## Проверка

- Raven стоит слева и смотрит на Iron Warden.
- Iron Warden стоит справа и смотрит на Raven.
- При отступлении боец не разворачивается спиной.
- Attack-pose renderer не сломан.
- HUD и arena flow работают.
