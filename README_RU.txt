ERALASH COMBAT — GHLUM RENDERER TAKEOVER 31.2

Исправляет именно то, что видно на последнем видео:
- HUD пишет GHLUM, но canvas рисует Raven;
- старые ROUND / VS / FIGHT слои накладываются поверх нового интерфейса.

ЧТО ДЕЛАЕТ 31.2
1. Во время боя постоянно фиксирует identity игрока как ghlum.
2. После загрузки игры повторно перехватывает все известные fighter render functions.
3. Дополнительно перехватывает canvas drawImage и заменяет изображения Raven на нужный кадр Ghlum.
4. Подключает idle, walk, block, hit, attack, special, jump и KO.
5. Подавляет старые canvas-тексты ROUND / FIGHT / VS.
6. Скрывает старые центральные VS/intro DOM-панели.
7. Показывает чистое короткое ROUND → FIGHT интро.

УСТАНОВКА
1. Распакуй архив.
2. Загрузи ВСЕ файлы в корень репозитория с заменой.
3. Обязательно загрузи скрытую папку .github, assets/ghlum312, vercel.json,
   apply-hard-combat-31-2.mjs и hard-combat-31-2-runtime.js.
4. Сделай commit.
5. Дождись нового deployment и открой именно его.
6. Нажми Ctrl+Shift+R.
