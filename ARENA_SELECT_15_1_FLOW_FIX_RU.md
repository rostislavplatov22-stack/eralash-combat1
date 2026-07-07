# Arena Select 15.1 — Flow Lock Fix

Исправление реального игрового flow:

1. Любой Start теперь открывает Character Select.
2. После выбора персонажа открывается Arena Select.
3. Только после выбора арены запускается бой.
4. Real Art clickmap больше не запускает newMatch напрямую.
5. Telegram MainButton больше не запускает newMatch напрямую.
6. Main Start bubble listener защищён от старого прямого запуска боя.
7. Добавлена видимая метка FLOW 15.1.

Правильная цепочка:
Main Menu → Character Select → Arena Select → Fight.
