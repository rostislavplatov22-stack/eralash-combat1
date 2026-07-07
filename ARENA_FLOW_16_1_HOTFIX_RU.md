# Arena Flow 16.1 Hotfix — Start Fight Active

## Что исправлено

В версии 16.0 real-art clickmap работал как глобальный capture-listener и мог перехватывать клики поверх Character Select / Arena Select. Из-за этого кнопка **Start Fight / Начать бой** визуально была видна, но нажатие не доходило до настоящего обработчика.

## Исправление

- Clickmap больше не перехватывает клики внутри:
  - Character Select;
  - Arena Select;
  - Arena Locked cinematic;
  - Result screen;
  - Pause overlay;
  - modal panels.
- Clickmap больше не блокирует настоящие DOM-кнопки меню.
- Кнопка **Начать бой** снова открывает Character Select.
- Кнопка **Start Fight** в Character Select переводит игрока в Arena Select.
- Кнопка **Start Fight** в Arena Select запускает cinematic reveal и бой.

## Проверка

1. Открыть главное меню.
2. Нажать **Начать бой**.
3. На Character Select нажать **Start Fight**.
4. На Arena Select нажать **Start Fight**.
5. Должен появиться Arena Locked cinematic, затем VS-screen и бой.
