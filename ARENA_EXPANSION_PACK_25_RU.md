# Arena Expansion Pack 25.0 — RU

## Цель

Расширить игру до полноценного premium arena roster: теперь доступно 8 арен, а новые сцены работают не только в Arena Select, но и в бою, cinematic intro и stage mood.

## Новые арены

### Storm Sanctuary
- Храм над штормовой линией.
- Молнии, мокрый каменный пол, синие rim light-акценты.
- В бою: wind haze, lightning mood, холодные электрические частицы.

### Sunken Temple
- Древний затопленный храм.
- Полузатопленные плиты, руны, статуи, teal/gold mist.
- В бою: water shimmer, rune glow, мягкий туман.

### Iron Foundry
- Тяжёлая индустриальная кузня.
- Железные платформы, печи, цепи, искры и дым.
- В бою: sparks, furnace glow, heat bloom.

### Crimson Garden
- Тёмный лунный сад.
- Каменная дуэльная площадка, красные лепестки, деревья и crimson haze.
- В бою: falling petals, moon bloom, чистая силуэтная читаемость.

## Что изменено

- Arena Select 23.0 расширен до 8 арен.
- Добавлены новые cinematic stage-art assets в `assets/`.
- Новые арены подключены в `ARENA_SELECT_META`.
- Новые арены подключены в `DEFAULT_CONTENT.arenas`.
- Новые арены загружаются через `loadArenaCinematic24`.
- Новые stage-art используются в самом бою через существующий cinematic stage renderer.
- Добавлены CSS-классы для hero preview, rail thumbnail и cinematic intro.
- Mobile layout сохранён: rail становится горизонтальным carousel.
- Start Fight flow сохранён.
- Сохранены системы 17.0 / 18.0 / 19.0 / 20.1 / 21.0 / 23.0 / 24.0.

## Проверка

- `npm run build` должен проходить.
- JS syntax check должен проходить.
- В Arena Select должно быть 8 арен.
- Каждая новая арена должна запускаться в бою.
- Intro line и mood должны соответствовать выбранной арене.
- Персонажи должны читаться на каждом новом фоне.
