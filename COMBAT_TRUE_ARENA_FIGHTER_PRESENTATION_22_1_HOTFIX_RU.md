# Combat True Arena Fighter Presentation 22.1 — Arena Card Visual Hotfix

## Причина hotfix

В версии 22.0 арены в бою стали отличаться, но на экране Arena Select часть карточек выглядела как размытый цветовой placeholder. Это снижало ощущение premium-качества и не показывало игроку, чем реально отличается арена.

## Что исправлено

- Infernal Bridge получил читаемый preview: furnace gates, bridge deck, lava seams, ember depth.
- Moon Ritual получил читаемый preview: giant moon, ritual stones, magic circle, cold courtyard floor.
- Frozen Throne получил читаемый preview: ice palace columns, throne silhouette, cracked frozen floor.
- Black Citadel сохранил real-art preview, но стал читаемее в карточке.
- Selected Arena preview теперь повторяет визуальную сцену выбранной арены, а не показывает мягкие пятна.
- Текст на карточках вынесен на glass-плашку, чтобы не теряться на фоне.
- Модальное окно Arena Select стало scroll-safe на ноутбуках и мобильных экранах.
- Кнопка Start Fight не должна уходить за нижнюю часть окна.
- Сохранены Arena Flow 17.0, Combat Impact 18.0, AI & Combo 19.0, Physics 20.1, Combat Clarity 21.0 и True Arena Set 22.0.

## Проверка

- Открыть Character Select.
- Нажать Start Fight.
- На Arena Select проверить 4 карточки арен.
- Выбрать Infernal Bridge, Moon Ritual, Frozen Throne.
- Проверить, что правый preview меняется и выглядит как сцена, а не как blur-placeholder.
- Нажать Start Fight.
- Проверить, что бой запускается.
