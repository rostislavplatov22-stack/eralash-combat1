# EraLash Combat — Premium Fighter Base Restore Hotfix 26.7

## Причина

После 26.6 запуск боя восстановлен, но в бою Iron Warden снова выглядел как тёмный грубый cutout: sprite-sheet idle/block слои были хуже, чем premium full-body fighter art.

## Что исправлено

- Отключены грубые sprite-sheet тела для idle / walk / block / non-attack states.
- Attack-pose renderer сохранён только для реальных attack states.
- Iron Warden возвращён к cleaner premium full-body presentation вне атак.
- Raven сохраняет clean attack pose frames.
- Start Button Routing 26.6 сохранён.
- Approved fullscreen arenas сохранены.
- Cache-bust обновлён до v=267.

## Commit

```bash
git add .
git commit -m "fix: restore premium fighter base bodies 26.7"
git push
```

## Summary

Restored premium fighter base presentation in 26.7 by disabling rough generated idle/block sprite-sheet bodies, keeping real attack-pose frames only for attack states, returning Iron Warden to cleaner full-body art outside attacks, preserving Start Button Routing 26.6, and keeping approved fullscreen arenas.
