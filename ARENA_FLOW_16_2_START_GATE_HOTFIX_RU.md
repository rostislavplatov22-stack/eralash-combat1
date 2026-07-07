# Arena Flow 16.2 — Start Gate Hotfix

Исправление для ситуации, когда на real-art главном экране визуальная кнопка **«НАЧАТЬ БОЙ»** не открывала бой/выбор бойца после деплоя.

## Что исправлено

- Добавлен hard start-gate bridge на уровне `document` capture.
- Клик по визуальной зоне **«НАЧАТЬ БОЙ»** теперь открывает Character Select даже если invisible clickmap/painted UI перехватили событие.
- Кнопка `#startBtn` и зона `#realStartZone` дополнительно защищены от потери события.
- Кнопка **Start Fight** в Character Select теперь принудительно открывает Arena Select.
- Кнопка **Start Fight** в Arena Select теперь принудительно запускает cinematic reveal и `newMatch()`.
- Добавлен safety net: если callback cinematic overlay не сработал, бой запускается автоматически.
- Восстановление состояния, если предыдущий баг оставил `gameState='fight'`, но меню визуально осталось на экране.

## Проверка

1. Открыть главную страницу.
2. Нажать центральную кнопку **НАЧАТЬ БОЙ**.
3. Должен открыться Character Select.
4. Нажать **Start Fight**.
5. Должен открыться Arena Select.
6. Нажать **Start Fight**.
7. Должен появиться Arena Locked cinematic, затем реальный экран боя.
8. Проверить на desktop и mobile preview.

## Версия

`16.2.0`
