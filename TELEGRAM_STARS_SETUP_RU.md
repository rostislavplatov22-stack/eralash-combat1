# Telegram Stars Payments — инструкция

Эта версия добавляет полноценную обработку покупок за Telegram Stars.

## Что работает

- Mini App создаёт invoice через `/api/stars-invoice`.
- В Telegram WebApp открывается `openInvoice`.
- Бот получает `pre_checkout_query`.
- Backend проверяет payload, валюту `XTR`, сумму и Telegram user id.
- После оплаты бот получает `successful_payment`.
- Backend записывает покупку в таблицу `purchases`.
- Предмет добавляется в `inventory`.
- Повторная доставка защищена уникальным индексом по `telegram_charge_id`.

## Что нужно сделать после загрузки архива

1. Залить файлы в GitHub Desktop.
2. Commit → Push.
3. В Supabase выполнить обновлённый `supabase_schema.sql`.
4. В Vercel дождаться нового деплоя Ready.
5. Проверить `/api/shop`.
6. В Telegram открыть бота → `/shop`.
7. Нажать кнопку товара за Stars.

## Важно

Для Telegram Stars используется валюта `XTR`.
Для Stars invoice `provider_token` не нужен и не должен передаваться.

## Проверка

После покупки открой:

```text
https://eralash-combat1.vercel.app/api/inventory
```

Inventory требует Telegram initData, поэтому проще проверять прямо в Mini App: открыть магазин после оплаты. Купленный предмет должен стать `Owned`.

В Supabase можно проверить таблицы:

- `purchases`
- `inventory`
- `shop_items`

