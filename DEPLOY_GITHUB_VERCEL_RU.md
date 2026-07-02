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
