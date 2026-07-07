# Arena Flow 16.0 — Character → Arena → Cinematic VS

Добавлено поверх Arena Select 15.0:

- защищённый premium-flow: старт боя теперь ведёт через Character Select → Arena Select, а не напрямую в `newMatch()`;
- исправлен обход выбора арены через real-art clickmap и Telegram MainButton;
- cinematic `Arena Locked` overlay между выбором арены и VS-screen;
- match summary на Arena Select: выбранный боец, AI-противник и сложность;
- arena-specific round callout: Round 1 показывает выбранную арену, а не общий текст;
- сохранена вся боёвка: Sprite Combat, AI Combos, Ultimate/Finisher, Round Manager, Pause и mobile controls;
- версия пакета обновлена до 16.0.0.

Проверка:

1. Открыть игру.
2. Нажать главный Start/активную зону на real-art меню.
3. Должен открыться Character Select.
4. Выбрать бойца и сложность.
5. Нажать Start Fight.
6. Должен открыться Arena Select.
7. Выбрать арену.
8. Нажать Start Fight.
9. Должен появиться cinematic overlay `Arena Locked`, затем VS-screen, затем бой.
10. В Round callout и VS-screen должна отображаться выбранная арена.
11. Restart/Rematch сохраняет выбранные fighter/arena state.

Commit:

`Arena Flow 16.0 — protect full match start flow and add cinematic arena lock`
