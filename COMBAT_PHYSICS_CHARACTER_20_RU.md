# Combat Physics & Character Visual 20.0 — RU

Версия 20.0 усиливает физику боя, читаемость персонажей и premium-внешний вид бойцов без поломки уже стабильного flow 19.0.

## Что добавлено

- Body Weight System 20.0: у бойцов появился разный вес, сопротивление pushback и ощущение массы.
- Ground Friction Tuning: персонажи меньше скользят по арене и лучше “стоят ногами” на земле.
- Improved Collision Separation: бойцы больше не должны визуально залезать друг в друга при сближении.
- Weight-Based Knockback: тяжёлый Iron Warden отлетает меньше, Raven быстрее реагирует и легче смещается.
- Attacker Recoil: после сильного удара атакующий получает короткую отдачу, удар ощущается физически.
- Contact Shadows 20.0: под бойцами усилена тень контакта с полом.
- Fighter Rim Light 20.0: контурный свет отделяет персонажей от тёмного фона.
- Idle Breathing Animation: персонажи получили более живую стойку и дыхание.
- Damage Glints: при попаданиях на персонажах появляется короткий визуальный damage flash.
- Role Identity: Iron Warden читается как TANK, Raven как ASSASSIN.
- Arena Depth Layer 20.0: добавлены мягкий depth grading, floor fog и световая линия пола.
- Physics HUD Beat: при тяжёлых столкновениях появляется premium-индикатор физического события.
- Mobile-safe tuning: эффекты добавлены без тяжёлого blur и без чрезмерного количества частиц.

## Баланс персонажей

### Iron Warden

- Более тяжёлый.
- Меньше отлетает от ударов.
- Медленнее разгоняется и поворачивается.
- Сильнее ощущается как защитный танк.
- Получил более широкую стойку и сильную тень контакта.

### Raven

- Быстрее реагирует на движение.
- Лучше читается как agile assassin.
- Легче отлетает от тяжёлых ударов.
- Получил более живое дыхание и агрессивный rim light.

## Физика ударов

- Light стал быстрее и чище как starter.
- Heavy стал тяжелее, с большим pushback и recoil.
- Special получил больше веса и hitstun.
- Ultimate получил усиленный body break knockback и hit stop.

## Проверка

- Меню открывается.
- Character Select открывается.
- Arena Select открывается.
- VS / Arena Intro работает.
- Fight запускается.
- Mobile buttons работают.
- AI атакует и блокирует.
- Combo HUD 19.0 сохранён.
- Combat Impact 18.0 сохранён.
- Arena Mood 17.0 сохранён.
- `npm run build` должен проходить без ошибок.

## Коммит

```bash
git add .
git commit -m "feat: add Combat Physics and Character Visual 20.0"
git push
```
