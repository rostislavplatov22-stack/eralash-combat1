# True Arena Set & Fighter Presentation 22.2 — Premium Arena Art Rebuild

## Почему сделан hotfix

Версия 22.1 улучшила читаемость, но экран выбора арен всё ещё выглядел недостаточно premium: Infernal Bridge, Moon Ritual и Frozen Throne воспринимались как геометрические/градиентные заглушки, а не как дорогие боевые сцены.

## Что исправлено

- Созданы отдельные premium stage-art preview assets:
  - `assets/arena-infernal-bridge-premium.webp`
  - `assets/arena-moon-ritual-premium.webp`
  - `assets/arena-frozen-throne-premium.webp`
- Infernal Bridge получил читаемую сцену с furnace gate, bridge deck, lava seams и ember depth.
- Moon Ritual получил большую луну, ritual stones, magic circle и холодный мистический двор.
- Frozen Throne получил ледяные колонны, throne silhouette, cracked ice floor и pale rim light.
- Arena Select больше не выглядит как набор blur/gradient placeholders.
- Selected Arena preview теперь использует те же premium stage-art assets.
- Карточки получили более дорогую glass-плашку, улучшенный контраст, border glow и hover.
- Заголовок и shell выборки арен визуально усилены под premium presentation.
- Сохранены Arena Flow 17.0, Combat Impact 18.0, AI & Combo 19.0, Physics 20.1 и Combat Clarity 21.0.

## Проверка

- `npm run build` проходит.
- JS syntax check проходит.
- Start Fight flow сохранён.
- Arena Select scroll-safe.
