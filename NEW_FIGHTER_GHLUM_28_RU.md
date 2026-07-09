# 28.0 — New Fighter: Ghlum — Cave Devourer

Добавлен третий боец Ghlum — низкопрофильный пещерный хищник с ядовитым стилем боя.

## Что добавлено
- Новый fighter asset: `assets/fighter-ghlum-28.webp`
- Новый portrait asset: `assets/fighter-portrait-ghlum-28.webp`
- Ghlum добавлен в ростер Character Select
- Ghlum доступен как playable fighter через portrait rail
- Добавлена конфигурация бойца в `DEFAULT_CONTENT`
- Добавлена meta-информация для Character Select / VS
- Добавлены параметры:
  - HP 85
  - PWR 70
  - SPD 96
  - DEF 48
- Добавлена low-profile физика:
  - ниже Raven
  - уже collision capsule
  - быстрее ускорение
  - слабее защита
- Добавлен poison mechanic:
  - Heavy / Special / Ultimate могут навесить poison
  - Poison наносит лёгкий dot-урон
  - добавлены зелёные toxic feedback и floating text
- Базовый combat render поддерживает Ghlum как отдельный premium full-body fighter.

## Сохранено
- 27.5 clean approved reference Character Select
- 27.0 Hit Reaction / Stagger / KO
- 26.10 Combat Readability
- 26.9 Fighter Facing Lock
- Start Fight flow
