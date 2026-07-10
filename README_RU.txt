ERALASH COMBAT — GHLUM FULL MOTION 30.0

ЭТО УЖЕ НЕ FIX КАРТИНКИ
В сборку добавлен отдельный боевой sprite bank для Ghlum.
Raven больше не используется как анимация или визуальный fallback Ghlum.

ВНЕДРЁННЫЕ АНИМАЦИИ
- Idle: 6 кадров.
- Block / Hit reaction: 6 кадров.
- Light / Heavy claw attack: 6 кадров.
- Toxic special attack: 6 кадров.
- Jump: 6 кадров.
- Knockdown / KO: 6 кадров.

ЧТО ДЕЛАЕТ УСТАНОВЩИК
- Копирует прозрачные игровые PNG в assets/ghlum30.
- Создаёт отдельный ghlumSpriteSheets30.
- Привязывает состояния боя к нужным анимациям.
- Включает sprite rendering для Ghlum даже при старом глобальном fallback.
- Сохраняет Raven и Iron Warden без изменений.
- Создаёт резервную копию index.html.

КАК ПРИМЕНИТЬ
1. Распакуй папку архива в корень проекта рядом с index.html.
2. Запусти APPLY_FIX.bat.
3. Дождись сообщения GHLUM FULL MOTION 30.0 УСПЕШНО ВНЕДРЁН.
4. Загрузи весь проект на Vercel или Netlify.
5. Нажми Ctrl+Shift+R.
6. Если старая версия осталась: F12 > Application > Storage > Clear site data.

РЕЗЕРВНАЯ КОПИЯ
index.before-ghlum-full-motion-30.0.html

ПАПКА НОВЫХ АССЕТОВ
assets/ghlum30
