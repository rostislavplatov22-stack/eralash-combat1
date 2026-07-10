ERALASH COMBAT — GHLUM RUNTIME LOCK 29.0

ЧТО ИСПРАВЛЯЕТ
- Ghlum больше не заменяется Raven при переходе Выбор бойца -> Арена -> Бой.
- Выбранный fighterId записывается в один канонический ключ.
- Выбор повторно фиксируется перед Arena Select, Arena Reveal, newMatch и каждым раундом.
- После makeFighter выполняется проверка: создан ли именно выбранный боец.
- Старые overlay/click-обработчики больше не могут незаметно вернуть Raven.
- Создаётся резервная копия исходного index.html.

КАК ПРИМЕНИТЬ
1. Распакуйте содержимое этого архива В КОРЕНЬ текущего проекта EraLash Combat.
   Рядом должны находиться index.html, package.json и папка assets.
2. Запустите APPLY_FIX.bat.
3. Дождитесь надписи «GHLUM RUNTIME LOCK 29.0 УСПЕШНО ПРИМЕНЁН».
4. Загрузите всю папку проекта на Netlify/Vercel как обычно.
5. После публикации откройте игру с Ctrl+Shift+R.

ВАЖНО ПОСЛЕ ПУБЛИКАЦИИ
В браузере нажмите F12 -> Application -> Storage -> Clear site data,
затем Ctrl+Shift+R. Это удалит старый кэш предыдущей сборки.

ОТКАТ
Запустите RESTORE_BACKUP.bat.

СОЗДАННЫЕ ФАЙЛЫ ПОСЛЕ ПАТЧА
- index.before-ghlum-runtime-lock-29.0.html
- GHLUM_RUNTIME_LOCK_29_0_APPLIED.json
