ERALASH COMBAT — HARD COMBAT REPLACEMENT 31.1

ЭТО НЕ СТАРЫЙ РУЧНОЙ ПАТЧ.
После загрузки файлов исправление применяется автоматически:
- во время Vercel build через vercel.json;
- либо GitHub Actions изменит настоящий игровой index.html и сделает auto-commit.

ЧТО ИСПРАВЛЕНО
1. Ghlum жёстко перехватывается до любого Raven sprite bank/fallback.
2. Ghlum получает отдельные idle, walk, block, hit, attack, special, jump и KO листы.
3. Старый HUD перекрывается и отключается, даже если часть интерфейса рисовалась внутри canvas.
4. Добавлен новый premium HUD с портретами, gothic timer, life/energy bars и round pips.
5. Добавлены крупные круглые боевые кнопки, как на утверждённом референсе.
6. ROUND/FIGHT заменён на чистый cinematic banner без огромной дешёвой коробки.
7. Бойцы разведены по сторонам и увеличены.

КАК ЗАГРУЗИТЬ
1. Распакуй архив.
2. Загрузи ВСЕ файлы и папки из архива в корень репозитория с заменой старых.
3. Особенно важно загрузить скрытую папку .github, vercel.json, apply-hard-combat-31-1.mjs и assets/ghlum311.
4. Сделай commit с текстом из COMMIT_MESSAGE.txt.
5. Подожди новый Vercel deployment. Ничего вручную запускать не требуется.
6. После Ready открой НОВЫЙ deployment и нажми Ctrl+Shift+R.

Локально при необходимости можно запустить APPLY_FIX.bat.
