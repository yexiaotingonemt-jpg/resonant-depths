# 美术来源与制作记录

## 正式角色与怪物动画

当前使用 **FLARE: Empyrean Campaign** 正式发布的角色与怪物美术，而非单张概念立绘。

- 原始项目：[flareteam/flare-game](https://github.com/flareteam/flare-game)
- 固定版本：`af6eee6d339ac98011864bfe89da837fe7769c28`
- 作者：Clint Bellanger 及 Flare 美术贡献者。各文件、模型和纹理的详细作者保留在 [完整原始致谢](public/licenses/flare/CREDITS.txt)。
- 许可：**Creative Commons Attribution-ShareAlike 3.0 Unported（CC BY-SA 3.0）**。保留 [原始完整许可证](public/licenses/flare/LICENSE.txt)。图像的合成和重打包衍生文件也按同一许可提供。

玩家 1 使用分层板甲、头部和长剑；玩家 2 使用分层法师长袍、兜帽和法杖。敌人采用僵尸、骷髅法师、牛头人、蚁狮、骷髅骑士和高阶骷髅法师。

8 个角色族共 1,912 个动画单元，每个动作保留 **W、NW、N、NE、E、SE、S、SW 八个真实视角**。包含待机、跑步、挥击、施法、受击和倒地；跑步每方向至少 8 帧。没有用旋转一张正面图片代替转向。

### 技术加工

`scripts/import-flare-art.py` 从固定版本下载源图及原始帧偏移，按作者提供的方向图层顺序合成人物，并进行透明裁切与图集打包。整套角色使用同一缩放和脚底锚点，避免换方向时抖动或大小变化。没有重新生成或逐帧重画原作品。

运行时使用逐像素核对过的无损 WebP 图集，减少首次下载量；动画帧、色彩与透明通道均保留。

发布文件位于 `public/assets/flare/`，`manifest.json` 记录完整源路径、固定版本 URL 和 SHA-256。原始下载缓存保存在游戏目录之外的 `../scratch/resonant-flare-source/`。运行 `python scripts/import-flare-art.py` 可重建，需要 Pillow。游戏构建和游玩无需 Python。

## 场景

`public/assets/arena.png` 是本项目使用内置 Image Gen 制作的 1586 × 992 场景。俯视古代神殿石台、深青色深渊、日月刻纹、外围植物与烛火；场景中央保留平坦、低对比的战斗区域，不含角色或界面。旧的静态角色概念图已退出运行时。

## 声音

Web Audio 本地合成，包括环境音、施法、受击、冲刺、击杀和救援音效。右上角可静音。
