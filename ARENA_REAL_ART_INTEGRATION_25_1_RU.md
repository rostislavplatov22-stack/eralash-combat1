# Arena Real Art Integration 25.1

## Цель

Версия 25.0 добавила 4 арены, но визуально они выглядели недостаточно дорого. В 25.1 новые арены заменены на утверждённые пользователем real key art изображения.

## Approved arenas

- Storm Sanctuary — тёмный штормовой храм / floating storm sanctuary.
- Sunken Temple — затопленный древний храм с рунами и статуями.
- Iron Foundry — индустриальная кузня с печами, цепями и лавовым светом.
- Crimson Garden — тёмный готический сад с красным туманом и лепестками.

## Технические изменения

- Созданы WebP 1920×1080 для in-fight background.
- Созданы лёгкие WebP thumbnails 640×360 для Arena Select rail.
- Обновлены CSS background-image для hero-preview, rail и cinematic intro.
- Обновлены JS preload paths для arenaCinematicArt24.
- Добавлен body class `arena-real-art-25-1`.
- Убрана отрисовка названия арены поверх fight background.
- Сохранён Start Fight flow: Character Select → Arena Select → Cinematic Match Locked → Cinematic Duel Intro → Fight.

## Проверка

- Все 8 арен остаются доступными.
- 4 новые approved арены показываются в Arena Select.
- 4 новые approved арены показываются в бою.
- `npm run build` проходит.
