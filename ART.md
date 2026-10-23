# 美术与声音记录

使用内置 image_gen 工具。最终游戏内资产：`public/assets/arena.png`（1586 × 992）和 `public/assets/sprites.png`（1536 × 1024，带 alpha）。原始生成文件保留在 Codex generated_images 中，项目资产已复制到游戏目录。精灵通过 `src/assets.ts` 的明确矩形取帧，保留源图比例。

## 视觉基准

Full primary screen concept for RESONANT / 共鸣深井, 16:9 premium indie cooperative roguelite. Dark engraved aquamarine forest ruins, charcoal, muted pale mint typography, warm amber and teal guardians connected by a luminous tether, ominous magenta enemies. Ancient stone dais, luminous herbs and carved pillars. Thin DOM HUD, bottom skill and resonance controls. Title and two restrained menu buttons on left, guardians on right. Hand-painted engraved texture, readable negative space. Code-native interface.

## 场景生成提示词

Production game environment background for RESONANT two-player top-down roguelite. 16:10 image. Orthographic directly overhead camera, huge oval ancient temple stone platform filling 90% of image, dark teal black bottomless chasm around edge. Playable floor x 7–93%, y 14–86%, flat unobstructed stones, shallow circular sun/moon engraving. Ruined pillars, white flowers, turquoise ferns and candles only in outer 8%. Dark charcoal teal, hand-painted ink engraving, sparse golden floor engravings, low contrast center. No characters, creatures, text, HUD or buttons.

## 精灵生成提示词

Production 2D game sprite atlas, transparent background, 4 columns by 2 rows, 1536x1024. Isolated full body overhead dark fantasy sprites, generous margins. Row 1: amber hooded sword guardian, turquoise hooded moon staff guardian, purple thorn melee wisp with pink eye, purple crystal staff cultist. Row 2: heavy purple thorn brute, sleek magenta wolf dasher, crowned stone golem with amber crystal heart and antlers, cyan-gold healing crystal flower. Consistent hand-painted engraved game style. No scenery, floor, text or interface.

## 声音

Web Audio 本地合成，包含低频环境音、施法、受击、冲刺、击杀、救援与通关音序。界面右上角可静音。
