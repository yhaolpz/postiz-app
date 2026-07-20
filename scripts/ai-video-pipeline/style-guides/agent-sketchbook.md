# Tiny Agent 白板火柴人风格档案

## 用途

这份文档是后续 AI Agent 科普短视频的 active 风格基准。当前最终选择为 `A - 白板火柴人风`，不是之前的 `C - 手账涂鸦风`。后续生成脚本、图片、语音和合成视频时，都按这份文档对齐。

核心目标是稳定个人 IP：固定“中国程序员火柴人”人物、固定 `Tiny Agent` AI 机器人、固定白板简笔画画面、固定底部大字幕框和短视频讲解节奏。观众应该能从中性纸灰底、粗黑线、少量蓝/红语义点缀、左侧程序员、右侧 AI 小机器人和 `Tiny Agent` 标题里快速识别这个系列。

## 样片和图片锚点

- 风格名：`A - 白板火柴人 / Whiteboard Stick Figure`
- 系列展示名：`Tiny Agent`
- 样片主题：`What Makes an AI Agent Different?`
- 本地样片：`/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/agent-style-samples/style-a-whiteboard.mp4`
- 样片规格：`1080x1920`，`30 fps`，`24.0s`，`h264` 视频，`aac` 单声道音频
- 关键预览图：
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/agent-style-samples/previews-final-style-a-whiteboard/2s.jpg`
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/agent-style-samples/previews-final-style-a-whiteboard/7s.jpg`
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/agent-style-samples/previews-final-style-a-whiteboard/13s.jpg`
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/agent-style-samples/previews-final-style-a-whiteboard/20s.jpg`
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/agent-style-samples/previews-final-style-a-whiteboard/contact.jpg`
- 第一条成片角色锚点：`/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/2026-07-06-tiny-agent-postiz-private-v6/video.mp4`
- 第一条成片关键帧：
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/2026-07-06-tiny-agent-postiz-private-v6/keyframes/keyframe-01.png`
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/2026-07-06-tiny-agent-postiz-private-v6/keyframes/keyframe-02.png`
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/2026-07-06-tiny-agent-postiz-private-v6/keyframes/keyframe-03.png`
  - `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/2026-07-06-tiny-agent-postiz-private-v6/keyframes/keyframe-04.png`

后续视频以这条样片、第一条成片和这些预览图作为构图、人物比例、字幕框、留白、线条粗细、颜色克制度和节奏的基准。

## 固定原则

- 以后默认选择 `A - 白板火柴人风`。
- 固定两个人物资产：`中国程序员火柴人` + `Tiny Agent`。
- 固定配色方案 `C - 中性纸灰`：画布和中性填充使用 `#ECECEA`，搭配粗黑线、简笔画和白板讲解的整体风格。这里的 `C` 是配色编号，与历史风格方案 `C - 手账涂鸦风` 无关。
- 面向海外 TikTok 和 YouTube Shorts，视频内使用英文语音和英文字幕。
- 视频画面里不要出现中文。
- 每条视频只讲一个非常小的知识点。
- 视觉比喻必须让非工程背景用户一眼理解。
- 不做手账纸张底色、PPT 课件风、复杂 UI 截图、写实真人、3D 机器人或大面积彩色漫画。

## 角色与跨平台构图锚点

7 月 6 日第一条成片继续作为人物外形参考；从 2026-07-11 起，YouTube Shorts、TikTok 和 Facebook Reels 共用 `cross-platform-balanced` 构图。当前验收样片是 `/Users/bytedance/Documents/postiz-app/var/ai-video-pipeline/runs/2026-07-11-cross-platform-balanced-preview-v2/video.mp4`。

- 画布固定为 `1080x1920`，所有固定层以 `x=540` 为中心，左右视觉边距一致。
- 主画面区域固定为 `y=300-1110`，生成图先去除外围底色边，再等比适配到最大 `820x780`；程序员、Tiny Agent 和关键道具合计 bbox 宽度不得低于画布的 `68%`，推荐约 `75%`。
- 普通内容镜头顶部保留 `Tiny Agent` 系列名和内容标题；内容标题优先压缩为不超过约 `28` 个英文字符，较长时最多换成两行。标题有效 bbox 必须始终位于 `x=80-1000, y=0-300`，不能贴边、裁字或让观众无法判断是否完整。
- CTA 镜头不显示当集内容标题，顶部只使用关注引导 `Follow Tiny Agent`；固定 CTA 句子在下方完整呈现。
- 底部字幕框固定为 `x=80-1000, y=1130-1430`，左右各留 `80px`；字幕以 `x=540` 居中，字号 `50px`、行距 `62px`，最多两行。
- `y>1430` 不放字幕、人物脸、关键道具或结论文字，留给平台账号、描述、进度条和操作控件；可以保留中性纸灰底或不影响理解的非关键背景。
- 留白方式：标题、主画面和字幕框连续排布，不能为追求保守安全区把整套内容缩到画布左上或留下明显不平衡的右侧空白。
- 程序员位置：通常在左半区，完整或近完整全身，头部、头发、眼镜和手势清楚可辨。
- Tiny Agent 位置：通常在右半区，头部和脸屏要大而清楚，工具腰包、天线和耳罩必须可辨。
- 道具位置：工具卡、日志、剪贴板、警告符号等放在两者之间或周围，用来承载概念，不要把角色挤到角落。
- 禁止恢复旧版 `x=450` 左偏构图，或把主画面压缩到画布宽度的约 `50%-57%`。

## 强制生成流程

Tiny Agent 系列的主画面必须由图片生成模型生成关键帧，再由合成脚本配音、加时长、加转场并输出视频。

- 每条默认生成 `8-10` 张图片关键帧，通常为 `9` 张，并以上面的样片和预览图作为 reference；每个语义镜头一张，关键帧通过风格检查后，才能合成视频。
- Codex 日更自动化默认优先使用 Codex image generation 生成关键帧，保存到 `var/ai-video-pipeline/provided-keyframes/<date>-<slug>/`，再通过 `--keyframes-dir` 交给合成脚本；这一路径比直接让本地 runner 调图片 API 更容易在生成后人工/自动检查人物和机器人比例。
- 禁止使用 Canvas、SVG、HTML、纯代码绘图或程序化线框来“自己画”中国程序员、Tiny Agent、聊天气泡、工具动作、白板主画面或最终关键帧。
- Canvas / ffmpeg / 脚本只允许用于后处理：缩放、裁切、拼接、轻微 pan/zoom、音频合成、字幕时间轴、格式转码和发布投递。
- 如果图片生成模型、参考图读取、授权或关键帧生成不可用，必须停止并报告阻塞原因；不能降级为 Canvas 自绘、占位图或普通图表风。
- 每次合成前必须先抽帧检查：人物应接近参考图的完整手绘角色，而不是简单火柴线；机器人应有中性纸灰圆头、黑脸屏、蓝眼睛、耳罩、天线和工具腰包；底部字幕框应接近参考图的厚描边手绘质感。
- 任何一帧看起来像代码画出来的矢量图、PPT 图表、通用流程图、线框占位图，都判定为失败，必须重新用图片生成模型出图。

### 图层和运镜强制规则

最终视频必须按样片流程分层合成：

- 图片生成模型只负责主画面关键帧，也就是人物、Tiny Agent、工具、日志、图标和视觉比喻。
- 普通镜头的顶部系列名/内容标题、CTA 镜头的关注引导和底部字幕框都属于后期固定叠加层，不允许烘焙进参与运镜的主画面层。
- 慢放大运镜只作用于主画面层；标题、底部字幕框和字幕文字必须全程固定位置、固定大小，不能跟着放大、漂移或裁切。
- 每个关键帧段独立从 `1.000x` 开始，线性或平滑放大到 `1.035x-1.045x`；切到下一张关键帧时重新从 `1.000x` 开始。
- 主画面层进入 zoom 前必须先裁掉生成图外围底色边，再等比适配到 `820x780` 主画面框；每段做 `1.035x-1.045x` 的轻微放大，段尾仍须落在 `y=300-1110` 主画面区域内。
- 默认每段持续 `5-7s`，`30fps`；放大必须足够轻，只提供“镜头慢慢靠近”的感觉，不能产生推脸、裁掉人物、裁掉机器人天线、裁掉工具腰包或裁掉画面信息的问题。
- 每个关键帧段必须先确定一个固定光学中心或中心轴，通常取主画面有效内容 bbox 的中心；同一段内所有帧都复用这个锚点，不能逐帧重算中心。
- 运镜实现优先使用逐帧固定锚点的仿射缩放或等价方案：每段从 `1.000x` 到 `1.035x-1.045x`，围绕同一个 `(anchorX, anchorY)` 放大，再叠加标题和字幕层。
- 场景切换时允许使用极短的主画面层中性纸灰底淡出/淡入来遮住段尾放大到段首复位的突变；只处理人物、机器人和道具层，不混合标题、字幕框和字幕文字。
- 当固定 CTA 旁白开始时，必须立刻硬切到独立 CTA 镜头，不使用淡出/淡入，不得让前一个知识点画面延续到 CTA 句子里。
- 如果使用 ffmpeg `zoompan`、裁切表达式或其它滤镜后出现横向/纵向微抖、中心漂移或取整跳动，判定为不合格；必须改为预渲染帧或固定锚点仿射变换后再编码。
- 禁止对整张已包含标题/字幕的最终画面做整体 zoom；这会导致标题和字幕框一起变大，是不合格成片。

## 固定人物

### 中国程序员火柴人

这个人物代表创作者个人 IP，外形要稳定：

- 中国男性程序员，年龄感约 25-35 岁。
- 火柴人 / 简笔画比例，圆头或略圆脸。
- 黑色短发，发型可以有轻微凌乱的程序员感。
- 头发参考第一条成片：较厚、尖刺状、手绘 marker 黑发，能看到几组乱翘发束和黑色笔触层次。
- 黑色圆形或圆角矩形眼镜，镜片较大，眼睛是简化椭圆点，不要无眼镜或换成墨镜。
- 脸部参考第一条成片：圆脸或略圆脸、小耳朵、小鼻子、轻微微笑，整体友好。
- 简单中性纸灰 T 恤或黑色 hoodie；第一优先是中性纸灰短袖 T 恤、黑色鞋子，不要复杂服装。
- 线条以粗黑 marker 为主，身体结构极简。
- 表情友好、聪明、轻松，有一点幽默感。
- 通常在画面左侧，负责指向概念、对比对象、日志、工具或 Tiny Agent。
- 手部必须简化，优先使用指向手、点赞手、圆形手套，不画复杂手指。
- 可以半身或全身，但必须自然裁切，不能像缺腿、缺胳膊。
- 默认保持第一条成片的“全身大角色”比例，不要变成只到腰部的小讲师，也不要缩成远景小人。

禁止把这个人物变成写实真人、日漫角色、西方办公室员工、无脸讲师、复杂漫画人物或每天变化的新 presenter。

### Tiny Agent

`Tiny Agent` 是固定 AI 形象，也是这个系列的核心记忆点。

- 友好 AI 机器人，始终比程序员更像“执行者/工具人”。
- 中性纸灰圆头或圆角头盔，头部要大，占机器人视觉体量的大部分。
- 黑色圆角矩形脸屏，脸屏必须明显，不要变成白脸或普通眼睛。
- 两个蓝色椭圆眼睛，脸屏上有简单蓝色微笑。
- 头顶一根小天线，顶部有蓝色圆点。
- 两侧有圆形耳罩 / 耳机式结构，通常是中性纸灰外壳、黑色描边，可有蓝色细节。
- 身体圆润、小巧，线条粗黑，中性纸灰主体，中性纸灰手脚简化成圆形或手套形。
- 默认佩戴棕色工具腰包，腰包里有红色扳手、蓝色笔或工具；可手持放大镜、剪贴板、文件卡片。
- 语义上代表行动、工具调用、检查结果、写草稿、反馈循环。
- 表情可以可爱，但不要幼稚；它是可靠搭档，不是玩具吉祥物。
- 默认保持第一条成片的大头、黑脸屏、蓝眼、天线、耳罩、棕色工具腰包组合；动作可变，外形不要每天重设计。

禁止做成金属质感 3D 机器人、复杂机甲、动物形象、恐怖机器人、赛博朋克机器人或每天更换外形的新 mascot。

## 画面风格

### 基础质感

- 竖屏 `9:16`。
- 背景固定为 `#ECECEA` 中性纸灰，轻微纸面/白板质感可以保留，但不要明显手账纸。
- 粗黑 marker 线条，边缘略带手绘感。
- 色彩极少，只保留蓝色高光和少量红色提示。
- 顶部固定或半固定出现 `Tiny Agent`，字体粗、黑、干净。
- 中上部留出大量中性纸灰留白，主体画面集中在中部。
- 主体角色不能缩成小图标；主画面 bbox 宽度低于画布的 `68%` 或高度低于主画面区域的 `52%` 时视为主体过小，推荐宽度约 `75%`。
- 底部使用大号圆角字幕框，黑色描边，框内同样使用 `#ECECEA` 中性纸灰，配粗体英文字幕。
- 画面要像白板上快速画出的清楚图解，轻松、易懂、低干扰。

### 颜色规则

颜色只服务理解：

- 基础中性色：`#ECECEA` 中性纸灰，统一用于画布、卡片/面板、字幕框、程序员浅色衣服、Tiny Agent 外壳与手脚、无语义道具主体。
- 主墨色：`#111413`，用于粗线、标题、字幕和主要信息。
- 蓝色：Tiny Agent 眼睛、按钮、高亮线、工具细节、正确路径。
- 红色：错误行、警告、小叉号、失败点。
- 灰色：轻微阴影或地面接触阴影。
- 不再使用纯白 `#FFFFFF` 或近白色为卡片、字幕框、角色和道具另建一套中性层级；层次优先依靠黑色描边、留白和间距，必要阴影保持低对比。

不要使用大面积彩色填充、渐变背景、复杂纹理、霓虹色或高饱和漫画色。

### 构图规则

每条视频只做 `2-3` 个视觉段落：

1. 开头对比：程序员指向一个简单对象或对比。
2. 机制展示：Tiny Agent 使用工具、读文件、检查结果或执行步骤。
3. 收尾公式：底部字幕给一句清楚 takeaway。

底部字幕框是风格的一部分，不要改成普通浮层字幕。字幕框要足够大，文字居中，粗体，最多两行。

## 图片生成 Prompt

每个关键帧先使用这个基础 prompt，再追加该集的具体画面描述。

```text
Vertical 9:16 whiteboard stick figure explainer, neutral paper-gray background
(#ECECEA),
thick black marker line art, simple hand-drawn shapes, fixed title text
"Tiny Agent" at the top, use the canonical first-video character proportions:
the engineer, Tiny Agent, and core props fill about 75-90% of the main art
width, never miniature icon scale. One recurring Chinese software engineer
stick figure on the left: large full-body whiteboard character, spiky short
black marker hair, black round glasses, oval eyes, small nose and smile, simple
neutral paper-gray T-shirt, black shoes, friendly pointing or thumbs-up pose.
One recurring friendly AI robot named Tiny Agent on the right: large neutral
paper-gray rounded head and body, black rounded face screen, two blue oval eyes,
small blue smile, single
antenna with blue dot, round ear covers, neutral paper-gray limbs, brown tool belt with red
and blue tools, small tool props or clipboard. Sparse blue highlights and tiny
red warning marks only, clear visual metaphor, top and bottom safe areas mostly
blank for overlays, simple and funny but not childish, no Chinese text, no
photorealism, no anime, no 3D, no clutter, no dense UI, no distorted hands, no
missing limbs, no tiny characters.
```

如果图片模型支持 negative prompt，使用下面这段：

```text
Chinese characters, dense text, notebook paper, warm paper texture, PPT slide,
photorealistic person, anime style, glossy 3D robot, cinematic lighting,
complex UI screenshot, crowded background, gradient background, colorful comic
rendering, distorted hands, extra fingers, missing limbs, cropped head,
unreadable labels, overlapping subtitles, random logos, watermark, tiny
characters, miniature engineer, miniature robot, excessive empty space.
```

## 脚本风格

### 时长和节奏

- 来源驱动长版为默认发布格式：目标 `50-60s`，准出范围 `45-65s`。
- 英文旁白：约 `115-145` 个英文词；中文旁白按当前语速建议约 `190-240` 个汉字，最终以 TTS 实际时长为准。
- 英文短视频固定使用 `edge-tts` 的 `en-US-AnaNeural`，并显式传入 `--rate '+30%'`；不得回退到旧 `+20%` 或其它英文声音。
- 每集使用 `8-10` 个语义镜头，默认 `9` 个；镜头仍保留唯一 `Subtitle blocks` 作为语义审核稿，但成片字幕不再整段静态展示。
- 旧 `20-30s / 3-4` 镜头格式只作为历史微短版兼容，不再作为新内容默认值。
- 屏幕上除顶部 `Tiny Agent` 和底部字幕外，尽量少放文字。
- 每个关键帧段必须有对应 `Subtitle blocks`，用于审核镜头和旁白是否语义一致；runner 必须读取 `edge-tts` 生成的 VTT，渲染与实际语音时间戳同步的短语级实时字幕。
- 实时字幕每次最多两行，字幕框位置和大小保持固定，只替换当前正在说的短语；不能提前泄露后文，也不能把同一个公式或 on-screen text 重复用于所有段落。
- 切镜跟随旁白语义：出现新对象、新动作、新对比、例子、边界或结论时换图；图片和实时字幕必须只解释当前正在说的内容。

### 叙事结构

来源驱动长版固定使用这个结构：

1. Hook：前 3-4 秒提出具体问题或反常识判断。
2. Source claim：说明权威来源给出的原始判断。
3. Mechanism：用 2-3 个镜头解释为什么。
4. Example：用一个明确标注为示例的普通场景落地。
5. Boundary：说明什么时候不适用，避免过度概括。
6. Tiny Rule：给一个可以复述的判断公式。
7. CTA：英文结尾永久固定为两句，旁白必须逐字念出“Follow Tiny Agent. Tiny Agent helps you get better at using AI.”，不得省略第一句，也不得在第二句后追加内容；中文审核含义永久固定为“关注 Tiny Agent，成为更擅长使用 AI 的人！”。当“Follow Tiny Agent”开始发音的第一帧，必须立刻硬切到独立 CTA 页：隐藏当集内容标题，顶部显示 `Follow Tiny Agent`，主画面只保留一个大幅笑脸 Tiny Agent 关注引导图，下方始终完整显示 `Tiny Agent helps you get better at using AI.`。

CTA 不讲内容来源、原始出处、制作方法、更新频率或下一集预告。权威来源继续用于选题、事实核验和视频描述，但不进入固定结尾两句。

避免教程腔、脱离来源的复杂定义、框架清单和没有边界的绝对结论。

### 样片脚本

英文旁白：

```text
Most people think an AI agent is just a smarter chatbot. But a chatbot only
answers. An agent can take steps. It can read a file, call a tool, check the
result, and decide what to do next. Tiny example: a chatbot tells you how to
fix a bug. An agent opens the log, finds the error, and drafts the fix. Simple
rule: model plus tools plus feedback equals agent.
```

中文审核含义：

```text
很多人以为 AI Agent 只是更聪明的聊天机器人。但聊天机器人只会回答。
Agent 可以采取步骤。它可以读文件、调用工具、检查结果，然后决定下一步。
一个很小的例子：聊天机器人会告诉你怎么修 bug；Agent 会打开日志，
找到错误，并起草修复方案。简单规则：模型 + 工具 + 反馈 = Agent。
```

样片字幕块：

```text
A chatbot answers.
An agent takes steps.

It reads, calls tools,
and checks the result.

Example: it opens logs
and finds the error.

Agent = model
+ tools + feedback.
```

关键画面：

- 2s：程序员在左侧指向聊天气泡，右侧 Tiny Agent 带工具向前跑；底部字幕是“chatbot answers / agent takes steps”。
- 7s：程序员和 Tiny Agent 一起看文件、工具和小面板；Tiny Agent 手持放大镜或指向工具。
- 13s：程序员点赞，Tiny Agent 指向错误日志并在纸上起草修复。
- 20s：保留程序员 + Tiny Agent + 日志/修复草稿，底部给公式。

## 语音设定

当前可复刻基线：

- TTS：`edge-tts`
- Voice：`en-US-AnaNeural`
- Rate：`+30%`
- Language：English
- 口吻：清楚、轻松、像短视频讲解，不要企业培训感

中文版本默认使用 `zh-CN-YunxiaNeural`；语速根据脚本密度调整，不沿用英文的固定 `+30%`。

语音验收：

- 如果有破音、削波、明显损坏，直接重生成。
- 如果过慢、过严肃、太像老师讲课，也要换。
- 句子必须短，让底部字幕有足够阅读时间。
- 未来如果接入更自然的免费或低成本 TTS，只替换 provider / voice，不改变这套语气目标。

## 发布文案

- 英文标题要简单明了，优先使用一个直接对比或一个明确结论，通常不超过约 `28` 个字符；避免堆叠 `Explained`、`Simply`、年份或来源名。
- 介绍只写 `1-2` 个短句，第一句直接讲清知识点；需要署名时只保留纯文字格式，例如 `Source: Anthropic, Building effective agents.`。
- YouTube、TikTok 和 Facebook 的公开介绍都不得包含 `http://`、`https://`、Markdown 链接或 IndieSeek 跟踪链接；来源 URL 只保留在内部计划和证据文件。
- Hashtags 单独放在介绍末尾，不加入额外品牌口号、制作过程或外站 CTA。

推荐格式：

```text
Title: Workflow vs Agent

The difference between a workflow and an agent is not whether it uses an LLM.
It is who controls the execution path. Source: Anthropic, Building effective agents.

#AIAgents #AIWorkflow #Anthropic #Automation #TinyAgent
```

## 合成参数

默认视频参数：

```text
aspect_ratio=9:16
resolution=1080x1920
fps=30
duration=45-65s
target_duration=50-60s
video_codec=h264
audio_codec=aac
audio_channels=mono
motion=soft pan/zoom only
motion_scope=main art layer only; static title/subtitle box; VTT-timed caption text
motion_zoom_per_segment=1.000x -> 1.035x-1.045x
keyframes=8-10
keyframe_source=image-generation-only
subtitle_style=bottom large rounded #ECECEA box, #111413 outline, bold English text
subtitle_timing=edge-tts VTT phrase cues
title_style=top centered "Tiny Agent"
layout_center_x=540
layout_side_margin=80
title_baseline_y=240
main_art_region=80,300,1000,1110
main_art_max_size=820x780
subtitle_box=80,1130,1000,1430
subtitle_font_size=50
subtitle_line_height=62
critical_content_bottom=1430
```

默认流水线命令模板：

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file var/ai-video-pipeline/publish-plans/YYYY-MM-DD-source-led.en.md \
  --date YYYY-MM-DD \
  --tts edge-tts \
  --voice en-US-AnaNeural \
  --rate '+30%' \
  --caption-mode realtime \
  --platform all \
  --skip-missing-platforms \
  --visibility private \
  --media-mode serve \
  --wait \
  --output-dir var/ai-video-pipeline/runs/YYYY-MM-DD-tiny-agent
```

平台可见性备注：

- YouTube 的 private 是私密上传；公开发布需要单独确认合规和可见性。
- TikTok sandbox 或 API fallback 可能只能发成 self-only / private，取决于 API 权限。
- Facebook Reels 的 `private` 测试路径会走草稿式发布。

## 质检清单

接受一条生成视频前，必须检查：

- 风格是 A 白板火柴人，不是 C 手账涂鸦。
- 主画面关键帧来自图片生成模型，不是 Canvas / SVG / HTML / 纯代码自绘。
- 已使用样片和预览图作为视觉 reference，并抽帧确认人物与机器人接近参考图。
- 已使用 7 月 6 日第一条成片关键帧作为人物外形 reference，并使用 2026-07-11 `cross-platform-balanced-preview-v2` 作为构图 reference。
- 最终画布为 `1080x1920`；标题、主画面和字幕均以 `x=540` 居中，左右边距对称，不允许恢复右侧过度留白的左偏布局。
- 程序员、Tiny Agent 和关键道具合计主画面 bbox 宽度不低于画布的 `68%`、高度不低于主画面区域的 `52%`；推荐宽度约 `75%`。
- 普通内容标题最多两行且 bbox 必须落在 `x=80-1000, y=0-300`；主画面内容在 `y=300-1110`；字幕框边界为 `x=80-1000, y=1130-1430`。标题贴边/裁切、字幕框、字幕文字或关键内容越界时不得发布。
- `y>1430` 不得出现字幕、人物脸、关键道具或结论文字。
- 主画面层、顶部标题层、底部字幕层已分离；标题和字幕没有被烘焙进参与运镜的图层。
- 每个关键帧段都有独立、连续、轻微的慢放大：段首约 `1.000x`，段尾约 `1.035x-1.045x`。
- 每个关键帧段使用固定光学中心或中心轴；连续播放时只应有稳定靠近感，不能出现左右/上下抖动、中心来回跳或画面漂移。
- 抽查同一段的连续帧：主画面 bbox 中心变化必须平滑，不能交替反向跳动；如肉眼能看到抖动，直接判定失败并重渲染。
- 最终成片必须通过脚本准出检查：`1080x1920`、`30fps`、`45-65s`、有音频流、视频时长不能比音频长出静音尾巴、标题安全边距、标题/字幕框首尾 bbox 固定、实时字幕通过 VTT 时间轴检查、CTA 镜头与固定 CTA 的 VTT 起点对齐、主画面连续帧中心步长不超过阈值。
- 如果准出检查失败，不能继续投递 Postiz；必须先修正字幕、音频时长或运镜实现并重新生成。
- art layer 在段首有安全边距；段尾放大后人物、机器人和关键道具仍完整可见。
- 顶部标题和底部字幕框在同一段的首帧、中帧、尾帧保持固定位置和固定大小，不参与 zoom。
- 抽查每段首帧和尾帧：人物、Tiny Agent 天线、工具腰包、字幕框边缘、关键图标都没有被裁掉。
- 抽查每段首帧和尾帧：人物和机器人不能缩成小图标，脸、眼镜、蓝眼睛、黑脸屏、耳罩、天线和工具腰包必须可辨。
- 顶部展示名是 `Tiny Agent`。
- 中国程序员在外形上稳定：短黑发、黑眼镜、火柴人/简笔画比例。
- Tiny Agent 稳定：中性纸灰圆头、黑脸屏、蓝眼睛、小天线、耳罩结构。
- 画布、卡片、字幕框、角色浅色部分和无语义道具主体统一为 `#ECECEA` 中性纸灰；没有纯白或近白的独立填充层。
- 背景是中性纸灰底，粗黑线为主，只有少量蓝色和红色语义点缀。
- 底部有大号圆角字幕框，英文实时字幕清楚、居中、不超过两行；单条字幕显示不得短于 `0.55s`，不得出现孤立闪词。
- 视频主体没有中文文字。
- 没有缺胳膊、缺腿、手部畸形、脸部崩坏、随机多出的肢体。
- 静音观看也能大概看懂这个知识点。
- 音频清楚、不破、不明显机械；实时字幕来自同一次 `edge-tts` 生成的 VTT，和旁白短语同步。
- 只讲一个小点，不展开成一整堂课。
- 最终视频是 `9:16`、`1080x1920`、`45-65s`，默认目标 `50-60s`。

## 做 / 不做

| 做 | 不做 |
| --- | --- |
| 用图片生成模型生成关键帧后再合成视频 | 用 Canvas / SVG / HTML / 纯代码自己画主画面 |
| 只让主画面层做轻微慢放大 | 对带标题和字幕的整张最终画面做整体 zoom |
| 标题和字幕作为固定后期层 | 让标题或字幕框跟随镜头变大、漂移 |
| 按第一条成片保持角色和主体占比 | 为了避开字幕区把主角整体缩小成小图标 |
| 固定 A 白板火柴人风 | 回到 C 手账涂鸦风 |
| 保持 `Tiny Agent` 顶部标题 | 每条视频换系列名 |
| 左侧中国程序员 + 右侧 Tiny Agent | 每天重设计人物和机器人 |
| 中性纸灰底、粗黑线、少量蓝/红语义点缀 | 纯白分层、大面积彩色漫画或渐变背景 |
| 底部大字幕框 | 普通小字幕浮层 |
| 每集只用一个小例子 | 一条视频解释完整框架 |
| 用动作展示 Agent 能做事 | 只做抽象概念讲解 |
