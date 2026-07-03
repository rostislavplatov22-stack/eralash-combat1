# Dark Cinematic Real Art V4

Это пакет, который максимально приближает главное меню к выбранному референсу.

Что изменено:
- добавлен настоящий art-reference layer `assets/dark-cinematic-menu-reference.png`;
- desktop/laptop главное меню теперь строится как full-screen painted lobby;
- функциональные кнопки оставлены как прозрачные click zones поверх арта;
- мобильная версия сохраняет старую адаптивную разметку, чтобы Telegram Mini App не ломался;
- backend, Supabase, Stars, Admin, Analytics, Missions, Boss Rush не менялись.

Важно:
- Перед копированием в проект удалить старую папку `api`, как обычно.
- Supabase SQL выполнять не нужно.
- Если нужен ещё более высокий уровень, следующий шаг — разрезать арт на отдельные ассеты: background, fighter, side panels, CTA button, icons.
