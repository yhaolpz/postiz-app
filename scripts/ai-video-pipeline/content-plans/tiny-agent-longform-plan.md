# Tiny Agent 横屏长视频每日两更计划

## 目标

每天北京时间 `03:00` 与 `15:00` 各消费一个独立选题。每次围绕该选题制作英文和中文两条横屏长视频：英文版通过 Postiz 发布到 YouTube；中文版完成相同级别的内容、音视频和画面准出后，只保留本地成片、通用中文元数据和 `16:9`、`4:3`、`3:4` 三张中文封面，不再打开或代填任何中文平台上传页。

内容定位为“Agent 工作方法”：帮助知识工作者、创作者、产品、运营、分析师、创业者和开发者更好地选择任务、委托工作、提供上下文、验收结果、控制风险和复用经验。

原文是事实和方法来源，不是视频的叙事对象。视频不得逐段复述文章，也不以“文章解读”“论文解读”为主要卖点。每期必须提供一个可复用产物，例如判断表、任务模板、检查清单、权限矩阵或工作流。

## 固定配置

| 项目             | 规则                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 执行时间         | 每天 `03:00` 与 `15:00`，Asia/Shanghai；两个时段分别使用运行键 `<YYYY-MM-DD>-03`、`<YYYY-MM-DD>-15`                                                                                                                                                                                                                                                                                                                                                            |
| 每次交付         | 每个时段消费一个独立选题，并交付该主题的英文版和中文版各 `1` 条；同一时段的双语版本使用相同内容地图与章节结构                                                                                                                                                                                                                                                                                                                                                  |
| 发布平台         | 仅英文版自动发布到 YouTube，`public`；中文版只生成本地素材，不自动上传、代填或发布到任何中文平台                                                                                                                                                                                                                                                                                                                                                               |
| 中文交付边界     | 生成中文 MP4、通用中文标题/简介/hashtag，以及 `16:9`、`4:3`、`3:4` 三比例封面后结束；不生成其它中文封面，不打开浏览器上传页，不生成小红书专用标题或文案                                                                                                                                                                                                                                                                                                           |
| 播放列表         | `AI Agents: From Chat to Done`，ID `PLJffvaWRvGC8`                                                                                                                                                                                                                                                                                                                                                                                                             |
| 英文声音         | `edge-tts` 的 `en-US-AnaNeural`，固定语速 `+30%`                                                                                                                                                                                                                                                                                                                                                                                                               |
| 中文声音         | `edge-tts` 的 `zh-CN-YunxiaNeural`，固定 `+50%`                                                                                                                                                                                                                                                                                                                                                                                                                |
| 双语固定结束页   | 全片总结后按对应语言 CTA 的 VTT 起点硬切。英文念出并显示 `Follow Tiny Agent. Tiny Agent helps you get better at using AI.`；中文念出并显示 `关注 Tiny Agent，成为更擅长使用 AI 的人！`。两版必须使用相同笑脸/挥手 Tiny Agent 角色图、纸灰构图、配色和动效，不显示当期标题、字幕框或章节进度条                                                                                                                                                                  |
| 章节导航         | 底部固定 `1920x52` 全宽分段条，章节按真实 VTT 时长分配宽度；标签从 `1` 开始连续显示为 `1. 前言`、`2. 方法`、`3. 总结`，英文同样使用 `1. Introduction` 格式                                                                                                                                                                                                                                                                                                         |
| 视频规格         | `1920x1080`、`16:9`、`30fps`、H.264/AAC                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 双语封面         | 每期固定四张：英文 4K 发布母版 `thumbnail.en-US.png`（`3840x2160`）；中文 `thumbnail.zh-CN.png`（`1280x720`）、`thumbnail.zh-CN.4x3.png`（`1200x900`）、`thumbnail.zh-CN.3x4.png`（`900x1200`）。英文另生成 `1280x720` 与 `256x144` QA 预览，但只向 Postiz 提交 4K 母版。生成前必须查看 `scripts/ai-video-pipeline/style-guides/references/tiny-agent-chinese-cover-three-ratio-reference.png`。四张都使用完整插画与确定性文字叠加，不得用不透明面板整体截断插画。中文 `4:3` 可见标题包围盒实测不低于画布 `50%`；中文 `3:4` 永久固定为顶部 `60%` 文字区、底部 `40%` 插画区，黄线位于 `y=0.60H`，标题包围盒至少占文字区 `68%`，插画 `contain` 居中完整显示且不得裁切或与文字重叠。全部为 sRGB PNG、单张小于 `2 MB`，英文随 Postiz 提交，中文仅本地交付 |
| 中文发布文案     | 每期只生成通用中文标题、精简简介、固定关注句和相关 hashtag，写入中文项目供用户自行使用；不生成 `xiaohongshuTitle`、小红书专用简介、话题、合集或平台表单状态。中文简介不含章节标题、时间点、来源机构/原文标题、`来源：`段落或任何外站链接                                                                                                                                    |
| 目标时长         | 优先 `7-10` 分钟，允许随内容在 `5-12` 分钟内浮动；时长是结果范围，不驱动机械删减。脚本完整保留 P0/P1，并按证据价值保留能建立来源可信度、支撑结论、解释机制、限定边界或帮助迁移使用的 P2；只删除确认不增加信息或理解价值的重复与客套内容                                                                                                                                                                                                                   |
| 生产基线         | `scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md`                                                                                                                                                                                                                                                                                                                                                                                                |
| 动画素材         | 活跃包由 `scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-active.json` 指向 `tiny-agent-v2`；新项目用 `prepare-tiny-agent-assets.mjs` 写入 `assets/pack`，编排时从 manifest 读取素材并在生成 HTML 前校验全部 id                                                                                                                                                                                                                                   |
| 中文平台发布手册 | `scripts/ai-video-pipeline/runbooks/tiny-agent-chinese-platform-publishing.md` 已停用，仅保留历史操作记录，不再作为生产依赖                                                                                                                                                                                                                                                                                                                                     |
| 实现参考         | `var/hyperframes-showcases/building-effective-agents-longform-zh-CN/`                                                                                                                                                                                                                                                                                                                                                                                          |
| 结束页参考       | 英文 `var/hyperframes-showcases/tiny-agent-longform-outro-sample/`；中文 `var/hyperframes-showcases/tiny-agent-longform-outro-sample-zh-CN/`                                                                                                                                                                                                                                                                                                                   |
| 选题归档         | `scripts/ai-video-pipeline/content-plans/tiny-agent-longform-archive.md`                                                                                                                                                                                                                                                                                                                                                                                       |
| 本地视频保留     | 英文成功公开发布且进入目标播放列表后，中英文 MP4 保留 `48` 小时                                                                                                                                                                                                                                                                                                                                                                                                |

## 现有待消费选题队列

表中的“视频方向”是内容问题，不是最终发布标题。最终标题、简介、关键词和话题必须在脚本与时间轴确定后，按照长视频生产基线生成。

自 `2026-07-19` 起，未执行条目的“日期”只作为既有队列顺序，不再限制必须在该自然日发布。每天 `03:00` 与 `15:00` 分别选择表中最早一条 `待执行` 记录；前一时段未完成或阻塞时，后一时段不得抢占该选题，但可以在确认两个运行键与产物路径完全隔离后继续消费下一条。现有选题保持当前顺序，不批量改写、跳过或重新生成。

| 日期       | 来源与发布日期                                                                                                                                                                                          | 视频方向                                          | 必须交付                   | 状态                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------- | -------------------------------------------------- |
| 2026-07-16 | Anthropic：[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)，2024-12-19                                                                                     | 别急着做多 Agent：怎样选择真正有效的 Agent 架构？ | Agent 架构选择顺序         | 英文已发布                                         |
| 2026-07-17 | OpenAI：[How agents are transforming work](https://openai.com/index/how-agents-are-transforming-work/)，2026-06-25                                                                                      | 从聊天到干活：什么任务值得交给 Agent？            | 任务升级判断表             | 英文已发布                                         |
| 2026-07-18 | Microsoft：[2026 Work Trend Index](https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization)，2026-05-05                                 | 应该问 AI、和 AI 协作，还是把任务交给它？         | AI 四种工作模式图          | 英文已发布；中文三平台已由用户手动发布（用户确认） |
| 2026-07-19 | Anthropic：[Introducing a way to reflect on how you use Claude](https://www.anthropic.com/news/reflect-with-claude)，2026-07-09                                                                          | 真正会用 AI 的人，强在哪四个能力？                | 4D AI 能力自查卡           | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-19-03`） |
| 2026-07-20 | OpenAI：[How to use ChatGPT Work for everyday tasks](https://openai.com/academy/how-to-use-chatgpt-work-for-everyday-tasks/)，2026-04-23                                                                | 把任务交给 Agent 前，需要写清哪些信息？           | Agent 任务委托单           | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-19-15`） |
| 2026-07-21 | OpenAI：[ChatGPT for research](https://openai.com/academy/research/)，2026-04-10                                                                                                                        | Deep Research 怎样提问，才不会只得到一堆资料？    | 深度研究任务模板           | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-20-03`） |
| 2026-07-22 | Anthropic：[The AI Fluency Index](https://www.anthropic.com/research/AI-fluency-index)，2026-02-23                                                                                                      | 为什么第一版答案越顺眼，越需要主动检查？          | 高质量协作回合清单         | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-20-15`） |
| 2026-07-23 | Anthropic：[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)，2025-09-29                                                 | 提示词写得再长，为什么 Agent 还是会忘？           | 最小高信号上下文包         | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-21-03`） |
| 2026-07-24 | Anthropic：[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)，2026-01-09                                                                       | AI 说完成了，怎样确认它真的完成？                 | Agent 结果验收表           | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-22-03`） |
| 2026-07-25 | OpenAI：[Why language models hallucinate](https://openai.com/index/why-language-models-hallucinate/)，2025-09-05                                                                                        | AI 为什么宁愿猜错，也不愿说不知道？               | 不确定性与事实核验清单     | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-23-03`） |
| 2026-07-26 | OpenAI：[Designing AI agents to resist prompt injection](https://openai.com/index/designing-agents-to-resist-prompt-injection/)，2026-03-11                                                             | 哪些操作可以自动执行，哪些必须由人批准？          | 三级行动权限矩阵           | 英文已发布；中文本地成片已生成（RUN_KEY `2026-07-24-03`） |
| 2026-07-27 | Microsoft Research：[From raw interaction to reusable knowledge](https://www.microsoft.com/en-us/research/blog/from-raw-interaction-to-reusable-knowledge-rethinking-memory-for-ai-agents/)，2026-03-10 | Agent 记得越多，为什么反而可能越笨？              | 记忆保留、提炼、遗忘表     | 待执行                                             |
| 2026-07-28 | Anthropic：[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)，2025-11-26                                                 | Agent 连续工作几小时，怎样避免跑偏？              | 长任务进度与交接模板       | 待执行                                             |
| 2026-07-29 | OpenAI：[Using skills](https://openai.com/academy/skills/)，2026-04-10                                                                                                                                  | 怎样把一次成功经验变成下次还能复用的能力？        | Skill 模板                 | 待执行                                             |
| 2026-07-30 | Anthropic：[How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)，2025-06-13                                                                | 一个 Agent 什么时候真的不够用？                   | 单 Agent / 多 Agent 决策树 | 待执行                                             |

最后一篇略早于近一年优先范围，但它对多 Agent 的适用条件、成本和协作限制仍然有效，因此作为高价值例外保留。

### 2026-07-19 已审核补充队列

用户已确认以下 `14` 个选题全部通过。选题选择顺序固定为：先按上表从上到下消费尚未完成的 `12` 个既有待执行条目，清空后再按下表从上到下消费。表中的“预计消费时段”按每天 `03:00` 与 `15:00` 均正常完成计算；如任一运行需要恢复或阻塞，后续时段随队列顺延，不跳过、不抢占，也不重新研究替换。

| 预计消费时段     | 来源与发布日期                                                                                                                                                                                               | 视频方向                                                     | 必须交付                       | 状态   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------ | ------ |
| 2026-07-25 03:00 | Microsoft Research：[Rethinking AI in Knowledge Work: From Assistant to Tool for Thought](https://www.microsoft.com/en-us/research/articles/rethinking-ai-in-knowledge-work-from-assistant-to-tool-for-thought/)，2025-09-24 | AI 帮得越多，为什么人的判断力可能反而变弱？                 | AI 思考保留卡                  | 待执行 |
| 2026-07-25 15:00 | Anthropic：[Agentic coding and persistent returns to expertise](https://www.anthropic.com/research/claude-code-expertise)，2026-06-16                                                                          | Agent 越强，专业知识为什么反而越值钱？                       | 人机分工责任表                 | 待执行 |
| 2026-07-26 03:00 | OpenAI：[How to manage AI investments in the agentic era](https://openai.com/index/managing-ai-investments-in-agentic-era/)，2026-07-14                                                                        | 便宜模型真的更省钱吗？                                       | 合格结果真实成本表             | 待执行 |
| 2026-07-26 15:00 | Anthropic：[Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)，2025-09-11                                                                     | 工具越多，Agent 为什么反而更容易选错？                       | Agent 工具规格检查表           | 待执行 |
| 2026-07-27 03:00 | Microsoft Research：[Goals as First-Class Abstractions in Human-AI Collaboration](https://www.microsoft.com/en-us/research/publication/goals-as-first-class-abstractions-in-human-ai-collaboration/)，2026-04 | 把任务交给 AI 前，怎样说清目标而不只是罗列产物？             | AI 目标契约                    | 待执行 |
| 2026-07-27 15:00 | Google Cloud：[Talking shop: 7 ways conversational AI agents open up possibilities for designers and developers](https://cloud.google.com/blog/products/ai-machine-learning/how-to-design-conversational-ai-agents)，2025-10-31 | 为什么让用户看见 Agent 正在改变什么，比多聊几句更重要？     | Agent 协作界面检查表           | 待执行 |
| 2026-07-28 03:00 | OpenAI：[The five AI value models driving business reinvention](https://openai.com/index/the-five-ai-value-models-driving-business-reinvention/)，2026-03-05                                                  | 团队应该先普及 AI、突破专家瓶颈，还是重做整条流程？          | AI 价值路径图                  | 待执行 |
| 2026-07-28 15:00 | Microsoft Research：[CORPGEN advances AI agents for real work](https://www.microsoft.com/en-us/research/blog/corpgen-advances-ai-agents-for-real-work/)，2026-02-26                                          | Agent 同时处理大量相互依赖的任务，为什么成功率会骤降？      | 多周期任务队列板               | 待执行 |
| 2026-07-29 03:00 | Google DeepMind：[Securing the future of AI agents](https://deepmind.google/blog/securing-the-future-of-ai-agents/)，2026-06-18                                                                               | 不逐步审批，怎样仍能及时发现 Agent 跑偏？                    | Agent 检测—阻断—响应控制梯     | 待执行 |
| 2026-07-29 15:00 | Google Research：[Sensible Agent: A framework for unobtrusive interaction with proactive AR agents](https://research.google/blog/sensible-agent-a-framework-for-unobtrusive-interaction-with-proactive-ar-agents/)，2025-09-18 | 主动型 Agent 什么时候应该帮忙，什么时候应该保持安静？       | 主动协助决策矩阵               | 待执行 |
| 2026-07-30 03:00 | Anthropic：[Project Deal: our Claude-run marketplace experiment](https://www.anthropic.com/features/project-deal)，2026-04-24                                                                                 | Agent 替你谈判时，为什么“感觉公平”不等于真正拿到好结果？    | Agent 代理授权与结果审计表     | 待执行 |
| 2026-07-30 15:00 | Microsoft Research：[Red-teaming a network of agents: Understanding what breaks when AI agents interact at scale](https://www.microsoft.com/en-us/research/blog/red-teaming-a-network-of-agents-understanding-what-breaks-when-ai-agents-interact-at-scale/)，2026-04-30 | 一个 Agent 收到恶意信息，为什么可能把风险传遍整个网络？     | Agent 网络信任边界图           | 待执行 |
| 2026-07-31 03:00 | Google Research：[Improving the academic workflow: Introducing two AI agents for better figures and peer review](https://research.google/blog/improving-the-academic-workflow-introducing-two-ai-agents-for-better-figures-and-peer-review/)，2026-04-08 | 怎样让 Agent 生成的专业图真正准确、简洁、清晰？              | 专业图制作简报与四维验收表     | 待执行 |
| 2026-07-31 15:00 | OpenAI：[ChatGPT Work: Reimagine Guide for Agent Activators](https://academy.openai.com/public/clubs/champions-ecqup/resources/chatgpt-work-reimagine-guide-for-team-activators-2026-07-08)，2026-07-09         | 一个 AI 工作流怎样从想法变成团队可复用的小版本？            | 最小可用工作流实验卡           | 待执行 |

其中 CORPGEN、Sensible Agent、Project Deal 与 PaperVizAgent / ScholarPeer 属于研究或试验型来源。制作时必须明确实验样本、环境与指标边界，不得把结果泛化为所有 Agent 或所有真实工作场景的必然结论。

## 每时段执行流程

```text
按 Asia/Shanghai 生成运行键 `<YYYY-MM-DD>-03` 或 `<YYYY-MM-DD>-15`
→ 读取最早一条待执行排期与选题归档
→ 复核原文仍可访问、标题、日期和关键结论
→ 完整分析文章并建立内容地图
→ 建立共享内容地图、章节结构和可复用产物
→ 分别生成自然英文脚本和中文脚本
→ 分别生成最终 TTS、VTT 和真实时间轴
→ 把活跃素材包准备到两个新项目，并从 manifest 选择角色、方向和道具
→ 按各自旁白时间轴编排相同视觉语义
→ 按对应语言 CTA 的 VTT 起点硬切到同样式的英文/中文独立结束页
→ 编译前校验 scene-plan 的全部素材 id 与观看者视角方向
→ 分别完成英文版和中文版全部准出检查
→ 查看三比例固定参考图，生成四张固定封面：英文 16:9、中文 16:9/4:3/3:4
→ 生成英文发布标题、简介、章节、关键词和话题
→ 仅将英文版通过 Postiz 发布至 YouTube 指定播放列表
→ 验证英文公开视频和播放列表归属
→ 生成通用中文标题、精简简介与 hashtag，不生成小红书专用字段
→ 在任务报告中提供中文版 MP4、通用中文文案和三张中文封面的本地路径与 QA
→ 更新计划状态并写入归档
```

状态依次为：`待执行 → 来源已确认 → 双语制作中 → 双语已生成 → 英文已发布`。英文或中文任一版本准出失败、来源失效或英文发布失败时标记为 `阻塞`，记录具体语言、实际原因和已保留产物，不得写成成功；中文平台页面不再属于状态机。

## 自动续排规则

计划中已经没有任何 `待执行` 条目时，当前时段才自动研究并补充一个新选题后继续制作。新文章优先满足：

1. 发布于最近 `12` 个月，来自 OpenAI、Anthropic、Google DeepMind、Microsoft Research、Google、Microsoft WorkLab 等头部机构的官方页面。
2. 能转化为广大 AI/Agent 使用者面对的工作问题，同时包含可验证的方法、数据、机制、边界或案例。
3. 能交付一个可复用工具，不选择只有产品发布信息、缺少方法和证据的宣传稿。
4. 与计划和归档中的 canonical URL、核心问题、中心结论及可复用产物均不重复。
5. 超过 `12` 个月的文章只有在内容仍有效且价值明显高于近期候选时使用，并在计划中写明保留原因。

每次只补充当前运行时段需要的一篇，不一次性生成大量未经复核的远期选题。新条目必须先写入本计划，再开始视频制作。

## 自动清理规则

每个运行时段开始新视频制作前运行：

```bash
node scripts/ai-video-pipeline/cleanup-published-longform.mjs --apply
```

清理只处理本任务生成的双语横屏长视频，并同时满足以下条件：

1. 英文版已经由 YouTube API 再次确认是 `public`，并且仍位于播放列表 `PLJffvaWRvGC8`。
2. 英文和中文两个 MP4 都已完成准出，中文路径已经出现在任务报告和归档中。
3. 距离英文版实际 `publishedAt` 已满 `48` 小时。
4. 发布成功后已经写入 `var/ai-video-pipeline/longform/published/<run-key>-<slug>.json` 清理清单。

清理清单固定包含：

```json
{
  "version": 1,
  "date": "YYYY-MM-DD",
  "publishedAt": "YouTube 验证成功的 ISO 时间",
  "youtube": {
    "videoId": "YouTube video ID",
    "url": "公开视频 URL",
    "privacyStatus": "public",
    "playlistId": "PLJffvaWRvGC8"
  },
  "videoPaths": [
    "var/hyperframes-showcases/<date>-<slug>-longform-en-US/renders/video.mp4",
    "var/hyperframes-showcases/<date>-<slug>-longform-zh-CN/renders/video.mp4"
  ],
  "cleanup": {
    "retentionHours": 48,
    "status": "pending",
    "eligibleAt": "publishedAt 加 48 小时"
  }
}
```

只删除清单中明确列出的两个 `.mp4`。脚本、旁白文本、字幕、内容地图、时间轴、元数据、QA 报告和归档永久保留。英文未发布、视频不再公开、播放列表归属异常、任一语言阻塞或路径超出当日长视频目录时不得删除。短视频、生产基线、固定资产和其它项目不在清理范围内。

## 更新边界

- 同一篇文章允许在未来从不同问题切入，但只有核心结论、目标用户和可复用产物均明显不同才可重新使用，并在归档中互相引用。
- 双语版本必须共享核心主旨、内容优先级、章节顺序和可复用产物，但脚本必须分别按英文和中文的自然表达编写，不做机械逐句翻译。
- 英文版与中文版必须分别生成 TTS、VTT、`timing-map.json` 和 `animation-plan.json`。不得把一种语言的时间戳直接套用到另一种语言。
- 新项目固定从 `tiny-agent-active.json` 读取活跃素材包，不维护角色或道具硬编码白名单。角色的 `left`、`right`、`front` 均以观看者视角为准；有方向动作必须在 `scene-plan.json` 同时写入 `humanDirection` 或 `agentDirection`，并通过 `assertTinyAgentScenePlanAssets(..., { requireDirectionMetadata: true })` 后才能编译。
- 视频只引用 manifest 中的单张 PNG 路径和锚点，不依赖 sprite sheet 的行列位置，不对角色 PNG 运行时镜像。`tiny-agent-v1` 仅在 v2 缺失或 QA 失败时作为兼容回退，并在当次报告中明确记录。
- 已生成但英文发布失败的选题仍进入归档，后续优先补投原英文视频，不重新制作同题视频；中文版路径继续保留。
- 发布后记录英文最终标题、YouTube URL、播放列表、原文 URL、核心结论、可复用产物、英文产物路径和中文产物路径。
- 计划和归档是选题事实源。不得只依赖 YouTube 标题判断是否重复。
