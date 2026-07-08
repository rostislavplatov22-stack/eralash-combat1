# Attack Pose Renderer Hotfix 26.4

Исправляет плохой результат 26.3, где pose frames выглядели как огромные вставленные JPEG-постеры с фоном и неправильным масштабом.

## Что исправлено

- Сделаны новые cleaned transparent pose sprites в `assets/poses26_4/`.
- PNG/WebP ассеты получили alpha-mask и crop по персонажу.
- Убран эффект большой прямоугольной картинки поверх арены.
- Нормализован размер attack pose через `fighterVisualHeight()`.
- Iron Warden больше не раздувается в гигантский постер.
- Raven attack frames больше не тянут за собой большой серый холст.
- Убран второй двигающийся nameplate у attack frames.
- Approved fullscreen arenas 25.3 сохранены.
- Attack animation test сохранён: Anticipation → Contact → Recovery.

## Проверка

- `npm run build`
- JS syntax check
