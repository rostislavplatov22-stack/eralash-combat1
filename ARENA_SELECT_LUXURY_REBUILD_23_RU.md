# Arena Select Luxury Rebuild 23.0

Версия 23.0 — это не hotfix карточек, а полный redesign экрана выбора арены.

## Главная цель

Убрать ощущение дешёвого каталога 2×2 и заменить его дорогим cinematic stage-selection экраном:

- один большой hero-preview выбранной арены;
- compact vertical arena rail справа;
- меньше текста и таблиц;
- сильнее stage identity;
- Start Fight всегда в зоне действия;
- mobile-safe layout.

## Что изменено

### 1. Новый layout

Старая сетка карточек удалена. Теперь экран построен вокруг одной выбранной арены:

- большой widescreen hero preview;
- rail выбора арен справа;
- компактный match summary;
- отдельный action блок Back / Start Fight.

### 2. Luxury stage art

Добавлены новые premium WebP assets:

- `arena-luxury-black-citadel.webp`
- `arena-luxury-infernal-bridge.webp`
- `arena-luxury-moon-ritual.webp`
- `arena-luxury-frozen-throne.webp`

Каждый preview теперь выглядит как отдельное боевое пространство, а не как цветовая заглушка.

### 3. Premium UI cleanup

Убраны:

- равные 2×2 карточки;
- длинные описания в карточках;
- технические строки в selected panel;
- перегруженные таблицы;
- ощущение модалки-каталога.

Добавлены:

- cinematic shell;
- refined title hierarchy;
- stage rail;
- luxury Start Fight button;
- atmospheric hero preview;
- controlled ambient motion.

### 4. Mobile layout

На узких экранах:

- hero preview остаётся главным;
- arena rail превращается в horizontal scroll;
- кнопки остаются доступными;
- текст уменьшен без потери читаемости.

## Сохранённые системы

Сохранены и не сломаны:

- Arena Flow 17.0;
- Combat Impact 18.0;
- AI & Combo 19.0;
- Physics & Character Visual 20.1;
- Combat Clarity, Animation & Camera 21.0;
- True Arena Set 22.0 / 22.2 combat stage logic.

## Проверка

- `npm run build` должен проходить без ошибок.
- Arena Select должен открываться после Character Select.
- Выбор каждой арены должен менять большой hero preview.
- Start Fight должен запускать VS / fight flow.
- На телефоне Start Fight не должен уходить за нижний край.
