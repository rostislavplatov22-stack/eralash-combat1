# CHARACTER SELECT 14.0 — Premium Character Select

## Что добавлено

- Premium Character Select перед стартом боя.
- Выбор бойца Raven / Iron Warden.
- Противник автоматически становится противоположным бойцом.
- Премиальная VS-preview панель.
- Отображение роли, special и ultimate.
- Статы бойцов: power / speed / defense.
- Выбор сложности AI: Easy / Normal / Hard.
- Сохранение выбранного бойца в localStorage.
- HUD и VS-intro используют выбранные имена.
- Sprite rendering стал content-aware: если игрок выбирает Iron Warden, он использует Warden sprite bank.
- Physics layer стал content-aware: Warden остаётся тяжёлым даже если выбран игроком.
- Все системы 13.0 сохранены: Ultimate, Finisher, AI Combos, Combat Physics, Combat Feel, Pause и Round Manager.

## Как проверить

1. Открыть игру.
2. Нажать «Начать бой».
3. Должен открыться экран выбора персонажа.
4. Выбрать Raven или Iron Warden.
5. Выбрать сложность AI.
6. Нажать Start Fight.
7. В бою должны отображаться выбранные имена.
8. Бой, урон, AI, комбо, Ultimate и Finisher должны работать как раньше.

## Commit

Add Premium Character Select 14.0
