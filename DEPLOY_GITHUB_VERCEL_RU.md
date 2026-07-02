# Деплой EraLash Combat через GitHub и Vercel

## Вариант для новичка — через браузер

### 1. GitHub

1. Открой github.com.
2. Нажми `+` в правом верхнем углу.
3. Нажми `New repository`.
4. Название: `eralash-combat`.
5. Выбери `Public` или `Private`.
6. Нажми `Create repository`.
7. Нажми `uploading an existing file`.
8. Перетащи файлы из архива:
   - index.html
   - package.json
   - vercel.json
   - README.md
   - DEPLOY_GITHUB_VERCEL_RU.md
   - .gitignore
9. Нажми `Commit changes`.

### 2. Vercel

1. Открой vercel.com.
2. Нажми `Add New...` → `Project`.
3. Подключи GitHub, если Vercel попросит.
4. Выбери репозиторий `eralash-combat`.
5. Настройки:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Нажми `Deploy`.
7. После деплоя открой `Visit`.
8. В `Settings → Deployment Protection` выключи `Require Log In`, если ссылка просит вход.

## Обновления

Когда хочешь обновить игру:
1. Заменяешь файлы в GitHub.
2. Нажимаешь `Commit changes`.
3. Vercel сам создаёт новый deployment.


## Дополнительно для Admin Panel

В Vercel → Settings → Environment Variables добавь:

```text
ADMIN_TELEGRAM_IDS=твой_telegram_id
ADMIN_API_SECRET=длинный_admin_secret
```

После добавления переменных сделай:

```text
Deployments → Redeploy
```

Проверка:

```text
https://eralash-combat1.vercel.app/api/admin?secret=ТВОЙ_ADMIN_API_SECRET
https://eralash-combat1.vercel.app/api/anti-cheat?secret=ТВОЙ_ADMIN_API_SECRET
```

В Supabase обязательно выполни свежий `supabase_schema.sql`.


## После обновления Content System

1. В Supabase SQL Editor выполни свежий `supabase_schema.sql`.
2. Выполни `notify pgrst, 'reload schema';`.
3. Проверь `/api/content`, `/api/fighters`, `/api/arenas`, `/api/abilities`.
4. В Mini App нажми `🧬 Контент` и выбери бойца/арену.

Смотри также `CONTENT_SYSTEM_UPDATE_RU.md`.


## После Referral + Season update

После загрузки архива обязательно выполни свежий `supabase_schema.sql` в Supabase SQL Editor и затем `notify pgrst, 'reload schema';`. Проверь `/api/referral` и `/api/season`.
