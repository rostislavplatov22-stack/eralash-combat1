# Attack Animation Test 26.3

## Что сделано

- Вырезаны approved pose frames в PNG/WebP sprites.
- Добавлен первый настоящий attack animation test: anticipation → contact → recovery.
- Raven получил real pose-frame test для Quick Fang / Shadow Lunge.
- Iron Warden получил real pose-frame test для Thunder Ram / Judgment Breaker.
- Новый renderer 26.3 подменяет старые sprite-sheet атаки только во время attack-state.
- Idle/walk/block/hit fallback сохранены.
- Approved fullscreen arenas 25.3 и combat bounds сохранены.

## Коммит

```bash
git add .
git commit -m "feat: add Attack Animation Test 26.3"
git push
```

## Summary

Added Attack Animation Test 26.3 with cleaned PNG/WebP pose cutouts, real anticipation-contact-recovery attack frames for Raven and Iron Warden, attack-state renderer integration, and preserved fullscreen approved arenas.
```
