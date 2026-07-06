# Agent Sketchbook 风格档案

## 用途

这份文档是 `Agent Sketchbook` 系列的风格基准，用来保证后续 AI Agent 科普短视频不跑偏。后续生成脚本、图片、语音和合成视频时，默认都按这份文档复刻。

核心目标是稳定个人 IP：固定“中国程序员”人物、固定 `Tiny Agent` AI 形象、固定手账涂鸦画面风格、固定短视频节奏。观众应该能从人物、机器人、纸张质感、黑色线稿、少量高亮色和简单视觉比喻里快速识别这个系列。

## 样片锚点

- 风格名：`C - 手账涂鸦 / 个人 IP`
- 系列名：`Agent Sketchbook`
- 样片主题：`What Makes an AI Agent Different?`
- 本地样片：`/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/facebook-reel-draft-test-20260706-offset/video.mp4`
- Facebook Reels 测试草稿 URL：`https://www.facebook.com/reel/2447748505651888`
- 视频规格：`1080x1920`，`30 fps`，`20.0s`，`h264` 视频，`aac` 单声道音频

后续视频以这条样片作为构图、节奏、字幕密度、人物占比、图解占比和留白比例的参考基准。

## 固定原则

- 固定两个人物资产：`中国程序员` + `Tiny Agent`。
- 固定手账、笔记本、简笔画、黑色线稿的整体画风。
- 面向海外 TikTok 和 YouTube Shorts，视频内使用英文语音和英文字幕。
- 视频画面里不要出现中文，除非未来明确需要一个很小的作者签名。
- 每条视频只讲一个非常小的知识点。
- 视觉比喻必须让非工程背景用户一眼理解。
- 不做高仿真电影画面、3D 机器人、复杂 UI 截图、PPT 课件风。

## 固定人物

### 中国程序员

这个人物代表创作者个人 IP，外形要稳定：

- 中国男性程序员，年龄感约 25-35 岁。
- 短黑发，黑色矩形眼镜。
- 简单 hoodie 或纯色 T 恤，干净、日常、不商务。
- 表情友好、冷静、有一点幽默感，不像正经老师上课。
- 黑色墨线简笔画，身体结构简单，用少量 marker 高亮。
- 通常在画面左侧、下侧或侧边，负责指引观众、指向图解、和 Tiny Agent 互动。
- 手部用简化线条或手套形状，避免复杂手指导致畸形。
- 身体要完整；如果裁切，必须是自然的半身或肩部裁切，不能像缺腿、缺胳膊。

禁止把这个人物变成写实真人、日漫主角、西方办公室员工、无脸讲师或通用 presenter。

### Tiny Agent

`Tiny Agent` 是固定 AI 形象，负责把“Agent 会行动、用工具、检查结果、循环推进”可视化。

- 小型友好机器人，永远比程序员小。
- 圆角方形脑袋，或者简单胶囊身体。
- 点状眼睛，一个小天线或状态灯。
- 只用少量 teal / yellow 高亮。
- 可以拿一个小道具：扳手、剪贴板、适配器、背包、收据、工具卡片。
- 表情可以可爱，但不要幼稚；它是有用的搭档，不是玩具吉祥物。
- 语义上代表行动、工具调用、检查进度、循环执行。

禁止做成金属质感 3D 机器人、复杂机甲、恐怖机器人、动物形象或每天换造型的新 mascot。

## 画面风格

### 基础质感

- 竖屏 `9:16`。
- 暖白色 / 米白色纸张质感。
- 黑色手绘墨线。
- 少量 teal 和 yellow marker 高亮。
- 轻微点阵、网格或笔记本边距。
- 简单箭头、框、循环线、便利贴、小标签。
- 给英文字幕预留大块干净留白。
- 画面要像人手画的手账，亲切、轻松，但不要幼稚。

### 颜色规则

颜色是辅助理解，不是装饰：

- 主色：暖白纸张 + 黑色线稿。
- 高亮 1：teal，用于关键概念、正确路径、重点对象。
- 高亮 2：yellow，用于强调、聚光、动势。
- 红色只用于小范围错误、警告、叉号。

不要为了“更丰富”而大面积上色。彩色如果不够精美，会抢走内容焦点，让画面变乱。

### 构图规则

每条视频只做 `2-3` 个视觉段落：

1. 开头对比或问题。
2. 一个简单比喻或机制。
3. 一个清楚的 takeaway。

字幕区域要稳定，优先放在下方或中间安全区。字幕不能压住人物脸、Tiny Agent、关键道具或主图解。

## 图片生成 Prompt

每个关键帧先使用这个基础 prompt，再追加该集的具体画面描述。

```text
Vertical 9:16 notebook sketchbook illustration, warm off-white paper texture,
hand-drawn black ink lines, sparse teal and yellow marker highlights, clean
margin notes, simple arrows and diagrams, one Chinese software engineer doodle
with short black hair, black rectangular glasses, simple hoodie, and a small
friendly robot named Tiny Agent with a rounded-square head and tiny antenna,
clear empty space for English subtitles, charming but not childish, simple
visual metaphor, no Chinese text, no photorealism, no anime, no distorted hands,
no missing limbs, no dense UI, no clutter.
```

如果图片模型支持 negative prompt，使用下面这段：

```text
Chinese characters, dense text, photorealistic person, glossy 3D robot, anime
style, cinematic lighting, complex UI screenshot, crowded background, distorted
hands, extra fingers, missing limbs, cropped head, unreadable labels, overlapping
subtitles, random logos, watermark.
```

## 脚本风格

### 时长和节奏

- 目标时长：`20-30s`。
- 前期默认：`20s`。
- 英文旁白：约 `45-70` 个英文词。
- 字幕块：`3-5` 组，每组一眼能读完。
- 屏幕概念文字：通常只保留一行，最多 `5-7` 个词。

### 叙事结构

固定使用这个结构：

1. Hook：前 1-2 秒给一个强对比。
2. Explanation：用一个普通人能懂的比喻解释。
3. Example：给一个很小、很具体的动作或画面。
4. Takeaway：用一句有用但不说教的话收尾。

避免教程腔、长定义、框架清单、连续多层技术解释。

### 样片脚本

英文旁白：

```text
A chatbot gives you an answer. An AI agent gets a goal, opens the right tools,
checks what happened, then decides the next step. That loop is the difference.
If it cannot act or verify, it is probably just a chatbot wearing an agent hat.
```

中文审核含义：

```text
聊天机器人只是给你一个回答。AI Agent 会拿到一个目标，打开合适的工具，
检查发生了什么，然后决定下一步怎么做。区别就在这个循环。如果它不能行动，
也不能验证结果，那它大概率只是戴着 Agent 帽子的聊天机器人。
```

屏幕文字：

```text
Goal -> Tool -> Check -> Next step
```

关键画面：

- 程序员指向两个框：`Chatbot: answer` 和 `Agent: action loop`。
- Tiny Agent 拿起小扳手，同时检查剪贴板。
- Tiny Agent 周围有一个简单循环图，用一处 yellow 高亮强调 loop。

## 语音设定

当前可复刻基线：

- TTS：`edge-tts`
- Voice：`en-US-BrianNeural`
- Rate：`+8%`
- Language：English
- 口吻：清楚、友好、略微轻松，不要正式讲课感

语音验收：

- 如果有破音、削波、明显损坏，直接重生成。
- 如果过慢、过严肃、太像企业培训，也要换。
- 句子必须短，让字幕和画面有呼吸空间。
- 未来如果接入更自然的免费或低成本 TTS，只替换 provider / voice，不改变这套语气目标。

## 合成参数

默认视频参数：

```text
aspect_ratio=9:16
resolution=1080x1920
fps=30
duration=20-30s
target_duration=20s
video_codec=h264
audio_codec=aac
audio_channels=mono
motion=soft pan/zoom only
keyframes=2-3
subtitle_style=large readable English captions with safe margins
```

默认流水线命令模板：

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file scripts/ai-video-pipeline/content-plans/2026-07-agent-sketchbook.md \
  --date YYYY-MM-DD \
  --tts edge-tts \
  --voice en-US-BrianNeural \
  --rate '+8%' \
  --platform all \
  --skip-missing-platforms \
  --visibility private \
  --media-mode serve \
  --wait \
  --output-dir var/ai-video-pipeline/runs/YYYY-MM-DD-agent-sketchbook
```

平台可见性备注：

- YouTube 的 private 是私密上传；公开发布需要单独确认合规和可见性。
- TikTok sandbox 或 API fallback 可能只能发成 self-only / private，取决于 API 权限。
- Facebook Reels 的 `private` 测试路径会走草稿式发布。

## 质检清单

接受一条生成视频前，必须检查：

- 中国程序员和本档案描述一致，没有变成新人物。
- Tiny Agent 仍然是固定小机器人搭档，没有变成新 mascot。
- 画面是暖色手账涂鸦，不是 PPT、日漫、3D 或教程课件。
- 视频主体没有中文文字。
- 没有缺胳膊、缺腿、手部畸形、脸部崩坏、随机多出的肢体。
- 字幕没有压住人物、Tiny Agent 或关键图解。
- 静音观看也能大概看懂这个知识点。
- 音频清楚、不破、不明显机械，和字幕节奏一致。
- 只讲一个小点，不展开成一整堂课。
- 最终视频是 `9:16`、`1080x1920`、`20-30s`。

## 做 / 不做

| 做 | 不做 |
| --- | --- |
| 每集只用一个小比喻 | 一条视频解释完整框架 |
| 固定程序员和 Tiny Agent | 每天重设计人物 |
| 黑色线稿 + 少量 teal/yellow | 用弱质量彩色填满画面 |
| 给字幕留干净空间 | 把字幕压在人脸、手和道具上 |
| 轻松、有用、清楚 | 说教、像课堂、像教程 |
| 用简单道具和图解 | 放密集截图或复杂 UI 面板 |
