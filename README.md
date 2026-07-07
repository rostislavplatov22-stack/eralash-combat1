# EraLash Combat — Arena Fullscreen Combat Space Hotfix 25.3

25.3 fixes fullscreen arena coverage and expands fight movement bounds so approved art fills the screen and fighters can retreat to the real map edges.

## QA
- `npm run build` passes
- JS syntax check passes

# EraLash Combat — Arena Approved Art Hotfix 25.2

25.2 fixes the bad in-fight arena presentation seen after 25.1: approved arena art is now forced as the canvas stage plate, old procedural fallback geometry is suppressed, new cache-busted WebP assets are used, stale localStorage arena ids are normalized, and the debug panel is hidden from premium presentation.

## Included approved real-art arenas
- Storm Sanctuary
- Sunken Temple
- Iron Foundry
- Crimson Garden

## QA
- `npm run build` passes
- JS syntax check passes


# EraLash Combat — Arena Real Art Integration 25.1

## Что изменено

- Заменены слабые 25.0 stage plates на утверждённые реальные изображения арен.
- Storm Sanctuary, Sunken Temple, Iron Foundry и Crimson Garden теперь используют approved key art.
- Добавлены WebP fight-background assets 1920×1080 с HUD-safe затемнением.
- Добавлены отдельные лёгкие thumbnails для Arena Select rail.
- Arena Select, Cinematic Duel Intro и fight background подключены к новым approved assets.
- Убрана надпись названия арены поверх боевого фона, чтобы сцена выглядела чище.
- Сохранены 8 арен, luxury flow 23.0, fighter identity 24.0 и combat systems 18–21.

## Проверка

- `npm run build` должен проходить без ошибок.
- В Arena Select выбрать: Storm Sanctuary, Sunken Temple, Iron Foundry, Crimson Garden.
- После Start Fight каждая из 4 арен должна отображаться в Cinematic Duel Intro и в бою.
- HUD должен читаться на верхней части изображения.
- Центр арены должен оставаться свободным для бойцов.

---

# EraLash Combat — Cinematic Art & Fighter Identity Upgrade 24.0

## Что добавлено

- Реальные cinematic stage-art ассеты для всех арен в Arena Select и в самом бою.
- Новый premium fighter identity pass: Raven как assassin, Iron Warden как tank.
- Новые portrait/key-art ассеты для бойцов.
- Новый Cinematic Duel Intro 24.0 перед началом боя.
- Улучшенный Arena Reveal / VS presentation.
- Arena Select 23.0 сохранён, но визуально усилен 24.0-артом.
- Сохранены Combat Clarity 21.0, Physics 20.1, AI & Combo 19.0, Combat Impact 18.0 и Arena Flow 17.0.

## Проверка

- `npm run build` должен проходить без ошибок.
- Start Fight должен пройти цепочку: Character Select → Arena Select → Cinematic Match Locked → Cinematic Duel Intro → Fight.
- Все четыре арены должны выглядеть разными и в Arena Select, и в самом бою.
- На мобильном экране кнопка Start Fight должна оставаться доступной.


---

# EraLash Combat — True Arena Set & Fighter Presentation 22.2

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


---

# EraLash Combat — True Arena Set & Fighter Presentation 22.1

Hotfix: Arena Select cards now show readable arena stage plates instead of blurred placeholders. Start Fight flow preserved.

# EraLash Combat — True Arena Set & Fighter Presentation 22.1

Версия 22.0 добавляет реально разные арены, stage floor, parallax depth и улучшенную презентацию бойцов на Character Select / VS screen.

# EraLash Combat — Combat Clarity, Animation & Camera 21.0

Рабочая версия 21.0 с readable combat poses, contact-point hit FX, cinematic duel camera, stage clarity cleanup и compact HUD timing.

# EraLash Combat — Premium Character Select 14.0

# CHARACTER SELECT 14.0 — Premium Character Select

## Что добавлено

- Premium Character Select перед стартом боя.
- Выбор бойца Raven / Iron Warden.
- Противник автоматически становится противоположным бойцом.
- Премиальная VS-preview панель.
- Отображение роли, special и ultimate.
- Статы бойцов: power / speed / defense.
- Выбор сложности AI: Easy / Normal / Hard.
- Сохранение выбранного бойца в localStorage.
- HUD и VS-intro используют выбранные имена.
- Sprite rendering стал content-aware: если игрок выбирает Iron Warden, он использует Warden sprite bank.
- Physics layer стал content-aware: Warden остаётся тяжёлым даже если выбран игроком.
- Все системы 13.0 сохранены: Ultimate, Finisher, AI Combos, Combat Physics, Combat Feel, Pause и Round Manager.

## Как проверить

1. Открыть игру.
2. Нажать «Начать бой».
3. Должен открыться экран выбора персонажа.
4. Выбрать Raven или Iron Warden.
5. Выбрать сложность AI.
6. Нажать Start Fight.
7. В бою должны отображаться выбранные имена.
8. Бой, урон, AI, комбо, Ultimate и Finisher должны работать как раньше.

## Commit

Add Premium Character Select 14.0


---

# EraLash Combat — Ultimate / Finisher 13.0

# Ultimate / Finisher 13.0 — EraLash Combat

Добавлено:
- Raven: RIFT EXECUTION.
- Iron Warden: TITAN JUDGEMENT.
- Энергия накапливается от ударов, блока и получения урона.
- Кнопка ULT визуально загорается при 100 энергии.
- Ultimate запускает cinematic frame, затемнение, shake, slow motion, вспышки и impact lines.
- Если ultimate добивает или цель была на низком HP, запускается Finisher.
- AI получил ограниченное использование ultimate без спама.
- Сохранены Combat Feel 10.0, Physics 11.0, AI + Combos 12.0, пауза и завершение раундов.

Проверка:
1. Набей 100 энергии.
2. Подойди к врагу.
3. Нажми ULT.
4. На низком HP врага должен появиться FINISHER / RIFT EXECUTION.


---

# EraLash Combat — Sprite Combat 9.3 Freeze Fix

# EraLash Combat — Premium Fighters 6.1 Physics Fix

Добавлен physics layer для больших premium-персонажей: движение, дистанция, hitbox/hurtbox, AI spacing, attack lunge и dust.

# EraLash Combat — Premium Fighters 6.0

Добавлены новые full-body персонажи Shadow Raven и Iron Warden. Старые фигурки заменены на premium character art.

# EraLash Combat — Dark Cinematic Real Art V4 FIXED

Исправлена проблема пустого экрана: арт встроен в index.html и assets копируются в dist.

# EraLash Combat — Dark Cinematic Variant 1

Выбран и внедрён визуальный вариант 1: Dark Cinematic.

# EraLash Combat — Visual 4.0 Cinematic Overhaul — Dark Arena
## Mobile Polish 1.8

Исправлены прокрутка меню в Telegram на телефоне, скрыта системная MainButton, усилен визуал боя и добавлен компактный HUD для мобильного экрана.



Premium browser / Telegram Mini App-ready fighting game.

## Что внутри

- `index.html` — игра одним файлом: Canvas, HUD, меню, управление, AI, раунды, эффекты.
- `package.json` — Vite-сборка для Vercel.
- `vercel.json` — production-friendly настройки.
- `.gitignore` — чистый GitHub-репозиторий без мусора.

## Локальный запуск

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy через GitHub + Vercel

1. Создай новый репозиторий на GitHub.
2. Загрузи все файлы из архива в корень репозитория.
3. Открой Vercel → Add New → Project.
4. Выбери GitHub-репозиторий.
5. Framework Preset: Vite.
6. Build Command: `npm run build`.
7. Output Directory: `dist`.
8. Нажми Deploy.

## Telegram Mini App

Игра уже вызывает `window.Telegram?.WebApp.ready()` и `expand()`, если запускается внутри Telegram WebView.
Для production Telegram Mini App нужен HTTPS URL из Vercel и кнопка Web App в Telegram-боте.


## Telegram Mini App integration

В этой версии добавлены:

- `/api/bot` — webhook для Telegram-бота;
- `/api/result` — приём результата боя;
- `/api/leaderboard` — demo leaderboard;
- `/api/set-webhook` — быстрая установка webhook;
- Telegram WebApp init в `index.html`;
- отправка результата боя через `Telegram.WebApp.sendData()` и `fetch('/api/result')`;
- `.env.example`;
- подробная инструкция `TELEGRAM_BOT_SETUP_RU.md`.

Для деплоя на Vercel:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Переменные окружения:

```text
BOT_TOKEN
PUBLIC_APP_URL
TELEGRAM_WEBHOOK_SECRET
SETUP_SECRET
```


## Production DB Update — Supabase/Postgres

Версия `1.2.0` добавляет реальное сохранение прогресса через Supabase/Postgres:

- `/api/result` сохраняет бой в `battles` и обновляет профиль в `users`;
- `/api/profile` отдаёт сохранённый профиль игрока по Telegram `initData`;
- `/api/leaderboard` отдаёт настоящий leaderboard;
- бот показывает реальные `/profile` и `/leaderboard`;
- если Supabase не настроен, проект автоматически работает в `memory-preview` режиме.

Файлы:

```text
api/_db.js
api/_store.js
api/profile.js
supabase_schema.sql
SUPABASE_SETUP_RU.md
```

Настройка базы описана в `SUPABASE_SETUP_RU.md`.


## Premium Economy Update

Добавлены:

- `/api/shop` — каталог и покупка за coins;
- `/api/inventory` — инвентарь игрока;
- `/api/daily-reward` — ежедневная награда;
- `/api/weekly-leaderboard` — недельный рейтинг;
- `/api/stars-invoice` — Telegram Stars invoice link;
- `/api/admin` — безопасная админ-синхронизация каталога по `ADMIN_TELEGRAM_IDS`.

Перед деплоем выполни SQL из `supabase_schema.sql` в Supabase.


## Telegram Stars Payments Update

В этой версии добавлена полноценная обработка Stars:

- `/api/stars-invoice` создаёт invoice link.
- `/api/bot` подтверждает `pre_checkout_query`.
- `/api/bot` обрабатывает `successful_payment`.
- Покупка записывается в `purchases`.
- Предмет добавляется в `inventory`.
- В боте команда `/shop` показывает кнопки прямой покупки за Stars.

После обновления обязательно выполнить свежий `supabase_schema.sql` в Supabase SQL Editor.


## Admin Panel + Promo + Anti-cheat

Эта версия добавляет production-инструменты:

- Admin dashboard;
- Shop Manager API;
- Players Manager API;
- Promo Codes;
- Anti-cheat result validation;
- Admin audit logs;
- Ban / unban;
- Grant coins / XP;
- Reset player progress.

Новые API:

```text
/api/admin
/api/promo
/api/anti-cheat
```

Новые Vercel переменные:

```text
ADMIN_TELEGRAM_IDS
ADMIN_API_SECRET
```

После деплоя выполни свежий `supabase_schema.sql` в Supabase SQL Editor.


## Content System

Добавлены API `/api/content`, `/api/fighters`, `/api/arenas`, `/api/abilities`, таблицы `fighters`, `arenas`, `abilities`, `content_balance`, выбор бойца/арены в Mini App и admin-actions для live-баланса.


## Referral + Season Update

Добавлены referral, share victory, сезонный рейтинг и начисление season points после боя. Подробности: `REFERRAL_SEASON_UPDATE_RU.md`.


## Release 1.0 Ready

Добавлены `/api/health`, `/api/status`, `/api/qa`, `/api/client-error`, onboarding, launch checklist, error logs и команда Telegram `/status`.

Подробнее: `RELEASE_1_0_UPDATE_RU.md`.


## Analytics + LiveOps + Feedback Ready

Добавлены `/api/launch`, `/api/news`, `/api/founder-bonus`, команды `/about`, `/rules`, `/news`, `/launch`, Founder Drop и launch-кнопки внутри Mini App.


## Analytics + LiveOps

Добавлены `/api/analytics`, `/api/feedback`, `/api/liveops`, события игроков, feedback форма и LiveOps конфиг.


## Combat 2.0 Premium Fight Feel

Добавлены dodge, ultimate, combo counter, cinematic zoom, afterimages, улучшенный AI и усиленные hit sparks/slash trails. Управление: `Q/Space` — dodge, `O` — ultimate, мобильные кнопки `DGE` и `ULT`.


## Missions + Achievements + Boss Rush

Добавлены `/api/missions`, `/api/achievements`, `/api/boss`, Supabase-таблицы миссий/достижений/боссов и новые UI-кнопки в Mini App.


## Visual 3.0

Добавлен premium art direction: новая кинематографичная арена, улучшенные бойцы, свет, туман, руны, slash trails и улучшенный mobile readability.


## Visual 4.0

Добавлен большой cinematic visual overhaul: 2.5D арена, premium HUD, улучшенные бойцы, slash trails, ultimate aura, foreground particles и меню с top-tier presentation.


## Visual 4.2

Добавлен cinematic combat framing fix: крупнее бойцы, центрирование камеры, исправление mirrored nameplate, усиление stage focus.


## Visual 4.2 AAA Presentation Rebuild

Добавлен широкий premium hero-screen, cinematic showcase и Command Deck вместо дешёвой узкой панели.


## Dark Cinematic Reference V3

Fullscreen lobby rebuild: крупный hero-art, левое меню, правые reward widgets, меньше ощущения веб-панели.


## Dark Cinematic Real Art V4

Главное меню получает painted reference layer и прозрачные кликабельные зоны поверх него.


## Dark Cinematic V4.1 Active Buttons

Кнопки painted main menu теперь активны: Start Fight, left menu, right cards, bottom icons. Для разделов открывается premium modal panel поверх арт-экрана.


## Dark Cinematic Clickmap Fix

Добавлена fail-safe click-map система для активных кнопок painted-меню.


## Dark Cinematic Arena 5.1

Добавлена новая боевая арена Black Citadel Courtyard с real art asset, дымом, embers, soft light, premium vignette и без debug-grid ощущения.


## Exact Black Citadel Arena

Добавлена версия с точной пользовательской ареной `assets/arena-black-citadel-courtyard.png` и режимом `EXACT_BLACK_CITADEL_ARENA = true`.


## Exact Arena Framing Fix

Фикс убирает красный левый прямоугольник и закрепляет exact Black Citadel арт на фоне боя.


## Exact Arena Stage Fit Fix 5.2

Исправлена посадка точной Black Citadel арены: 16:9 stage plate, центрирование, ограничение combat zone и отключение движения фона камерой.


## Combat Physics 7.0

Добавлена новая физика боя: movement acceleration, body collision, input buffer, combo cancel, hitstun/knockdown, guard stamina, AI spacing и stage bounds для exact Black Citadel arena.


## Fighter Rig 8.0

Добавлена заметная физика и псевдо-анимация персонажей: spacing, collision, lunge, hit recoil, slash arcs, afterimages, block shield.


## Sprite Combat 9.1 Visible Fix
Исправлен renderer спрайтов: бойцы снова видимы, старый Fighter Rig больше не перекрывает sprite-sheet rendering.


## Sprite Combat 9.2

Исправлен урон и hitbox/active frames для sprite sheet бойцов.


## Sprite Combat 9.4

Fixed round completion at 0 HP and added in-game pause menu.


## Combat Feel 10.0

Добавлены hit sparks, shockwaves, damage numbers, KO burst, усиленный hit stop, camera shake и premium feedback боя.


## Combat Physics 11.0

Добавлены footwork-физика, attack facing lock, counter hit, clash, wall impact, whiff recovery и более стабильная collision-система.


## AI + Combos 12.0

Добавлен умный AI, дистанции боя, punish logic, combo chains и bonus damage. Debug-метка: AI + COMBOS 12.0.


## Arena Select 15.0

Добавлен премиальный экран выбора арены после выбора персонажа. Состояние арены сохраняется, а фон/свет/частицы меняются в бою.


## Arena Select Luxury Rebuild 23.0

Полный redesign выбора арены: вместо дешёвой сетки 2×2 добавлен cinematic hero-preview выбранной арены, compact arena rail, premium stage key art, чистая типографика, reduced UI noise и mobile-safe action flow.


---

## Arena Expansion Pack 25.0

Добавлено 4 новые premium-арены:

- Storm Sanctuary
- Sunken Temple
- Iron Foundry
- Crimson Garden

Теперь arena roster расширен до 8 сцен. Новые арены подключены к Arena Select, cinematic intro, in-fight stage art и arena mood FX. Версия сохраняет Luxury Arena Select 23.0 и Cinematic Art / Fighter Identity 24.0.
