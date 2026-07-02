# Vercel Node.js 24 Fix

Исправление для ошибки Vercel:

`Error: Node.js version 20.x is deprecated. Please set "engines": { "node": "24.x" }`

В `package.json` уже установлено:

```json
"engines": {
  "node": "24.x"
}
```

После загрузки файлов в GitHub нужно сделать Commit → Push, затем дождаться нового деплоя Vercel.
