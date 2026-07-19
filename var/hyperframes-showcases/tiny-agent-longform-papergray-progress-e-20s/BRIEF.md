---
workflow: general-video
flow: automation
storyboard: no
message: "验证中性纸灰主题与顶部章节进度在 Tiny Agent 横屏长视频中的真实观感"
destination: local-preview
aspect: 1920x1080
language: zh-CN
length: 20s
---

## Intent

从已确认的 Tiny Agent 横屏长视频基线中复用前言内容、中文旁白和角色资产，生成一条独立的 20 秒样片，用于判断统一中性纸灰主题和顶部章节进度是否更干净。

## Assets

- `../building-effective-agents-longform-zh-CN/assets/audio/narration.zh.normalized.mp3` — 复用前言旁白的前 18.458 秒。
- `../building-effective-agents-longform-zh-CN/assets/pack/sprites/` — 复用工程师、Tiny Agent 和语义道具资产。

## Customizations

- 配色采用 `C - 中性纸灰`：基础画布与所有中性填充固定为 `#ECECEA`，主墨色为 `#111413`。
- 章节导航沿用正式长视频的八段总览与时长比例，贴住画面最底部并占满视频宽度；章节文字以 20px 黑色小字号嵌入 52px 高的分段条内，当前章节加粗。已播放区域使用 `#C9CBC5` 满高填充，未播放区域使用浅灰 `#DDE0DA`，确保章节分割清楚可见。
- 角色和道具中的原白色像素转换为中性纸灰，保留蓝、黄、红的语义点缀。

## Notes

- 保留 16:9、1920×1080、30fps 和既有中文旁白节奏。
- 只生成本地样片，不修改正式长视频工程。
- 不增加背景音乐或装饰音效。
