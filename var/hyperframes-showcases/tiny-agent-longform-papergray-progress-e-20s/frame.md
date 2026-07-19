---
colors:
  paper: "#ECECEA"
  ink: "#111413"
  muted: "#717570"
  line: "#C9CBC5"
  progress_remaining: "#DDE0DA"
  blue: "#117ABD"
  yellow: "#D8AA28"
  red: "#C95145"
typography:
  primary: "Tiny Agent CJK"
  display_weight: 900
  body_weight: 700
spacing:
  edge: 72
  title_lane_bottom: 190
components:
  progress: "full-width segmented chapter overview"
  caption_radius: 22
  caption_border: 3
  depth: "flat paper, no shadow"
---

## Overview

统一的中性纸灰白板主题。画布、卡片、字幕框、工程师浅色衣服、Tiny Agent 外壳与无语义道具主体使用同一纸灰基色；层级依靠黑色描边、网格、间距和语义色，不依靠白色卡片叠层。

## The Frame

- 画布固定为 `1920×1080`、`16:9`。
- 最底部放占满宽度的八段章节总览，每段保留真实章节时长比例；章节文字嵌入 52px 高的分段条内，字号固定为 20px，明显小于内容文字。进度以满高色块推进，文字始终置于色块上层。
- 字幕框位于章节导航上方的独立区域，填充与画布同色，仅使用黑色描边建立边界。
- 网格保持低对比，只提供纸面秩序感。

## Color Semantics

- `#ECECEA`：所有中性表面。
- `#111413`：标题、正文、轮廓和全部章节文字。
- `#C9CBC5`：章节已播放区域。
- `#DDE0DA`：章节未播放区域。
- `#117ABD`：Tiny Agent 品牌和正向结构语义。
- `#D8AA28`：判断与提醒。
- `#C95145`：错误、风险、否定。

## Avoid

- 纯白或近白卡片、字幕框、角色外壳。
- 蓝色章节进度或装饰性蓝色导航。
- 渐变背景、阴影堆叠和无语义彩色填充。
