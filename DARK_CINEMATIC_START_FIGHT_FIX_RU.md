# Dark Cinematic Start Fight Fix

Исправлено: кнопка «Начать бой» запускала логику боя, но painted lobby оставался поверх canvas из-за CSS `display:flex!important` на `#menu`.

Что изменено:
- `body.is-fighting #menu { display:none!important }`
- `newMatch()` теперь принудительно скрывает меню через `style.setProperty(..., 'important')`
- возврат в меню корректно снимает `is-fighting`
- исправлен `Weekly Top` clickmap на правильную функцию `loadWeekly()`

Supabase SQL не нужен.
