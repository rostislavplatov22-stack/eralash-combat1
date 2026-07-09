# 28.2 Clean Functional Fighter Select Hotfix

## Цель
Исправить перегруженный и нерабочий выбор Ghlum из 28.0/28.1.

## Что исправлено
- Убран перегруженный нижний portrait rail поверх approved reference.
- Убраны fake locked slots и конфликтующие overlay-карточки.
- Character Select больше не пытается одновременно быть статичным reference screen и интерактивной сеткой.
- Добавлен реальный чистый выбор из трёх бойцов:
  - Raven
  - Iron Warden
  - Ghlum
- Добавлена полноценная карточка Ghlum в основной roster.
- Raven / Iron Warden / Ghlum теперь имеют реальные кликабельные карточки.
- Правая панель обновляется динамически: selected fighter vs opponent.
- Start Fight показывает выбранного бойца и запускает выбранного персонажа.
- Сохранена боёвка 28.0: Ghlum, poison, low-profile tuning.
- Добавлены недостающие базовые assets, чтобы ZIP был самодостаточнее.

## Проверки
- JS syntax check проходит.
- Все asset references в index.html найдены в assets.
