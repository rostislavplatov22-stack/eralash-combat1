# Fix: Vercel npm ETIMEDOUT / Vite package download

Причина ошибки была в `package-lock.json`: в нём остались ссылки на внутренний npm-registry, недоступный для Vercel.

Исправление:
- `package-lock.json` удалён;
- Vite dependency убрана;
- build больше не скачивает пакеты;
- `npm run build` просто копирует `index.html` в `dist/index.html`;
- папка `api` продолжает работать как Vercel Serverless Functions;
- Node version установлен как `24.x`.

Настройки Vercel:
- Framework Preset: Other или Vite можно оставить, если Build Command и Output Directory указаны вручную;
- Build Command: `npm run build`
- Output Directory: `dist`
