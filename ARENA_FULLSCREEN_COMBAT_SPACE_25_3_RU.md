# EraLash Combat — Arena Fullscreen Combat Space Hotfix 25.3

25.3 fixes the issue shown in the deployment screenshot: approved arena art was visible, but it behaved like a centered stage plate with side dead zones, and fighter movement was still clamped to the old narrow central combat area.

## Исправлено

- Approved arena art теперь рисуется как full-screen cover background во всём fight viewport.
- Убран 16:9 postcard/letterbox stage rect в бою.
- Расширены combat bounds почти до краёв видимой карты.
- Уменьшен лишний wall padding для больших fighter-art персонажей.
- Персонажи теперь могут отступать значительно дальше влево/вправо.
- Start positions стали шире, чтобы арена ощущалась больше.
- Добавлены cache-busted 25-3 approved WebP ассеты.
- Debug/callout больше не показывает старый Sprite Combat текст.
- npm run build passes.
- JS syntax check passes.

## QA focus

Проверить в бою:
1. Фон занимает весь экран без тёмных боковых пустот.
2. Raven может отступить далеко влево.
3. Iron Warden может отступить далеко вправо.
4. HUD читается на фоне.
5. Hit FX и персонажи остаются видимыми.
