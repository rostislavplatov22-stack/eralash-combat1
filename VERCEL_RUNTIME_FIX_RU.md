# Vercel Runtime Fix

Исправление ошибки:

```text
Error: Function Runtimes must have a valid version
```

Причина: в `vercel.json` был указан устаревший/неподходящий блок:

```json
"functions": {
  "api/*.js": {
    "runtime": "nodejs20.x"
  }
}
```

Для Vercel Serverless Functions в папке `/api` этот блок не нужен. Vercel сам распознаёт файлы `api/*.js`.
Версия Node задана в `package.json`:

```json
"engines": {
  "node": "20.x"
}
```
