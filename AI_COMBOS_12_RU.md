# AI + Combos 12.0 — EraLash Combat

Этот патч усиливает бой не визуально, а по игровой логике.

## Что добавлено

- Smart AI для Iron Warden.
- Дистанции боя: close / mid / far.
- AI теперь держит дистанцию, отступает, атакует и блокирует по ситуации.
- Punish logic: AI наказывает промахи игрока.
- Anti-spam cooldown: AI не должен постоянно нажимать одну атаку.
- AI combo follow-up после успешного попадания.
- Combo chains для игрока:
  - LIGHT → LIGHT → HEAVY = RAVEN BASIC CHAIN
  - LIGHT → HEAVY → SPECIAL = RIFT BREAKER
  - HEAVY → SPECIAL = PUNISH LINK
  - LIGHT → LIGHT → SPECIAL = DASH RIFT
- Combo bonus damage.
- Увеличенный input buffer для мобильных комбо.
- Debug метка: AI + COMBOS 12.0.

## Проверка

1. Запусти бой.
2. В debug-блоке должна быть надпись AI + COMBOS 12.0.
3. Проверь комбо LIGHT → LIGHT → HEAVY.
4. Промахнись heavy рядом с врагом — Iron Warden должен попытаться наказать.
5. Атакуй врага — он должен иногда блокировать, а не только стоять.
6. Дай врагу попасть light — он может продолжить серию.
