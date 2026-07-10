ERALASH COMBAT — TRUE MOTION 33.0

ПОЧЕМУ БОЙЦЫ ДВИГАЛИСЬ КАК КАРТИНКИ
В версии 26.7 в основном index.html было установлено USE_SPRITE_FIGHTERS = false.
Физика и координаты работали, но idle/walk/block/hit sprite sheets были отключены,
поэтому premium full-body PNG просто перемещались по экрану.

ЧТО МЕНЯЕТ 33.0
1. Возвращает USE_SPRITE_FIGHTERS = true в реальном игровом коде.
2. Встраивает True Motion bridge прямо в drawSpriteSheetFighter().
3. Добавляет отдельный animation state machine для Ghlum, Iron Warden и Raven.
4. Шаги синхронизированы с фактически пройденным расстоянием — ноги больше не скользят.
5. Атаки разделены на startup / active / recovery с нелинейной сменой кадров.
6. Контактный кадр удерживается во время hit-stop.
7. Получение урона принудительно включает hit reaction, отдачу тела и recovery.
8. Реализованы block, jump, landing, KO и idle breathing.
9. Добавлены visual root motion, lean, squash/stretch, contact shadow и attack trail.
10. Удаляются старые глобальные drawImage-перехватчики 31.2/31.3.

УСТАНОВКА
1. Распакуй архив.
2. Загрузи ВСЕ файлы в корень репозитория с заменой.
3. Обязательно загрузи скрытую папку .github, assets/ghlum33,
   true-motion-33.js, apply-true-motion-33.mjs и vercel.json.
4. Сделай commit.
5. Дождись auto-commit [auto-apply 33.0] и нового Vercel deployment.
6. Открой самый новый deployment и нажми Ctrl+Shift+R.
