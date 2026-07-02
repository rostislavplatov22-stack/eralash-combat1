# EraLash Combat — Dark Arena

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
