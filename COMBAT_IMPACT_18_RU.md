# Combat Impact 18.0 — Premium Hit Feedback Update

Версия 18.0 усиливает ощущение боя после стабильного Arena Flow 17.0.

## Что добавлено

- Premium Combat Impact HUD: короткий cinematic-бейдж при сильных попаданиях.
- Усиленный hit stop для heavy / special / ultimate.
- Более выразительный camera punch и micro slow motion на сильных ударах.
- Дополнительные impact sparks, shockwave rings, dust и hit rays.
- Block Impact feedback: отдельная визуальная реакция блока и guard chip.
- Counter Hit feedback: отдельный callout и более читаемые damage numbers.
- Mobile-safe FX: количество лучей, пыли и вспышек автоматически режется на телефонах и слабых устройствах.
- Боевой overlay не ломает Arena Flow 16.3 / 17.0: Character Select, Arena Select, VS, Arena Intro и Fight работают как раньше.

## Технические изменения

- Добавлен слой `.impact-beat18`.
- Добавлены функции:
  - `lowPowerCombat18()`
  - `pulseImpactClass18()`
  - `showImpactBeat18()`
  - `spawnCombatImpact18()`
- Усилен `spawnHitSpark()` с поддержкой ultimate impact.
- `applyHit()` теперь вызывает Combat Impact 18.0 после основного premium impact.
- Добавлен `combatImpact18T` для экранного radial impact glow.
- Версия package обновлена до `18.0.0`.

## QA checklist

Проверить:

1. Главное меню открывает Character Select.
2. Character Select ведёт в Arena Select.
3. Arena Select запускает VS / Arena Intro / Fight.
4. Light удар даёт быстрый spark без перегруза.
5. Heavy удар даёт заметный freeze, shake и impact badge.
6. Special удар даёт сильный slow/punch feedback.
7. Block показывает BLOCK IMPACT.
8. Counter hit показывает COUNTER HIT.
9. Restart не дублирует UI.
10. На телефоне бой не просаживается из-за частиц.

## Коммит

```bash
git add .
git commit -m "feat: add Combat Impact 18.0 hit feedback"
git push
```
