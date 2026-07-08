# 27.4 Approved Prestige Character Select

## Причина
27.1–27.3 не дали настоящего premium-скачка: экран оставался DOM-композицией из блоков и карточек, поэтому выглядел дешевле утверждённого референса.

## Решение
27.4 переводит Character Select на approved cinematic reference art как production visual base.

## Что сделано
- Добавлен `assets/character-select-prestige-reference-27-4.webp`.
- Character Select теперь использует утверждённую cinematic hero-selection сцену как полноэкранный визуальный слой.
- Старые дешёвые карточки, огромные DOM-имена и технические панели больше не рисуются поверх сцены.
- Сохранены интерактивные зоны:
  - выбор Raven;
  - выбор Iron Warden;
  - portrait rail;
  - AI Difficulty;
  - Start Fight;
  - Back;
  - Close.
- Визуал теперь совпадает с approved premium reference по композиции: крупные герои, VS, правая command panel, gold CTA.
- Combat flow 27.0 сохранён.
- Start Fight routing сохранён.

## Commit
`fix: replace character select with approved prestige reference 27.4`
