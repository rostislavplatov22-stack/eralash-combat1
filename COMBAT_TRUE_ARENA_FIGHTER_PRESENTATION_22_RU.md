# Combat True Arena Set & Fighter Presentation 22.0

## Цель

Версия 22.0 делает не маленький косметический патч, а крупный production-апгрейд сцены и презентации бойцов.

До этого арены в основном отличались mood-эффектами и цветовой обработкой. Теперь каждая арена получает собственный визуальный stage plate: архитектуру, читаемую землю, глубину, свет и боевое настроение.

## Что добавлено

- True Arena Set 22.0.
- Black Citadel оставлена как real-art gothic courtyard.
- Infernal Bridge получил отдельную procedural-сцену: furnace gates, molten seams, bridge floor, ember depth.
- Moon Ritual получил отдельную procedural-сцену: giant moon, ritual stones, magic circle, lunar backlight.
- Frozen Throne получил отдельную procedural-сцену: ice palace columns, throne silhouette, cracked frozen floor, pale rim light.
- Добавлен понятный stage floor для каждой арены.
- Добавлен combat focus oval, чтобы персонажи читались лучше.
- Добавлены stage-specific particles с mobile-safe density.
- Обновлены Arena Select cards и preview: арены теперь визуально отличаются до боя.
- Улучшен VS screen: портреты бойцов, роль и signature move.
- Усилен Fighter Presentation в Character Select: крупнее силуэты, чище подсветка, сильнее разница Raven / Iron Warden.
- Сохранены Arena Flow 17.0, Combat Impact 18.0, AI & Combo 19.0, Physics 20.1 и Combat Clarity 21.0.

## Почему это значимо

Это улучшение закрывает слабое место предыдущих версий: арены больше не выглядят как один и тот же фон с разными фильтрами. Игрок видит разные сцены и получает более коммерческое ощущение контента.

## Проверка

- Start Fight открывает Character Select.
- Character Select открывает Arena Select.
- Каждая arena card имеет свой визуальный стиль.
- Infernal Bridge / Moon Ritual / Frozen Throne запускают реально разные stage plates.
- Black Citadel сохраняет real-art look.
- VS screen показывает портреты.
- Бой запускается.
- HUD и мобильные кнопки не перекрываются.
- npm run build проходит.
