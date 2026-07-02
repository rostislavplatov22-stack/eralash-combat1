# Vercel Hobby Functions Fix

В Vercel Hobby есть лимит на количество Serverless Functions в одном деплое. Предыдущая версия создавала слишком много функций в папке `api`.

## Что исправлено

- Все публичные API-адреса сохранены:
  - `/api/bot`
  - `/api/result`
  - `/api/leaderboard`
  - `/api/set-webhook`
  - `/api/profile`
  - `/api/shop`
  - `/api/inventory`
  - `/api/daily-reward`
  - `/api/weekly-leaderboard`
  - `/api/stars-invoice`
  - `/api/admin`
  - `/api/promo`
  - `/api/anti-cheat`
- Вместо множества Vercel Functions теперь используется один dispatcher:
  - `api/[route].js`
- Внутренняя логика перенесена в:
  - `lib/`
  - `lib/handlers/`

## Что делать

1. Заменить файлы в GitHub Desktop.
2. Commit.
3. Push origin.
4. Дождаться нового деплоя Vercel.
5. Проверить `/api/shop`, `/api/admin`, `/api/leaderboard`.

