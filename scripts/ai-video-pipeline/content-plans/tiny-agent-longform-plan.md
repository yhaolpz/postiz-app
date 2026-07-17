# Tiny Agent 横屏长视频日更计划

## 目标

每天从高质量原始文章中提炼一个面向 AI/Agent 使用者的真实工作问题，同时制作英文和中文两条横屏长视频。英文版通过 Postiz 发布到 YouTube；中文版完成相同级别的内容、音视频和画面准出后保留本地成片，并通过浏览器把视频、文案和封面准备到哔哩哔哩与抖音上传页，最终发布必须由用户手动点击。

内容定位为“Agent 工作方法”：帮助知识工作者、创作者、产品、运营、分析师、创业者和开发者更好地选择任务、委托工作、提供上下文、验收结果、控制风险和复用经验。

原文是事实和方法来源，不是视频的叙事对象。视频不得逐段复述文章，也不以“文章解读”“论文解读”为主要卖点。每期必须提供一个可复用产物，例如判断表、任务模板、检查清单、权限矩阵或工作流。

## 固定配置

| 项目 | 规则 |
| --- | --- |
| 执行时间 | 每天 `17:00`，Asia/Shanghai；比原定时间再晚 `4` 小时 |
| 每日交付 | 同一主题的英文版和中文版各 `1` 条，使用相同内容地图与章节结构 |
| 发布平台 | 仅英文版自动发布到 YouTube，`public`；中文版只准备哔哩哔哩与抖音上传表单，不自动发布 |
| 中文上传页 | 哔哩哔哩：`https://member.bilibili.com/platform/upload/video/frame?page_from=creative_home_top_upload`；抖音：`https://creator.douyin.com/creator-micro/content/upload` |
| 播放列表 | `AI Agents: From Chat to Done`，ID `PLJffvaWRvGC8` |
| 英文声音 | `edge-tts` 的 `en-US-AnaNeural`，固定语速 `+30%` |
| 中文声音 | `edge-tts` 的 `zh-CN-YunxiaNeural`，固定 `+50%` |
| 视频规格 | `1920x1080`、`16:9`、`30fps`、H.264/AAC |
| 双语封面 | 英文 `1280x720` 1 张；中文 `1280x720`、`1200x900`、`900x1200` 各 1 张。统一为 sRGB PNG 和大字号标题；英文随 Postiz 提交，哔哩哔哩默认使用中文 `4:3`，抖音默认使用中文 `3:4` |
| 中文发布文案 | 每期汇总最终中文标题、完整简介、真实章节和 `#话题`，写入中文项目并填入两个中文平台的上传表单 |
| 目标时长 | 优先 `9-13` 分钟，允许随内容在 `6-18` 分钟内浮动 |
| 生产基线 | `scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md` |
| 实现参考 | `var/hyperframes-showcases/building-effective-agents-longform-zh-CN/` |
| 选题归档 | `scripts/ai-video-pipeline/content-plans/tiny-agent-longform-archive.md` |
| 本地视频保留 | 英文成功公开发布且进入目标播放列表后，中英文 MP4 保留 `48` 小时 |

## 两周排期

表中的“视频方向”是内容问题，不是最终发布标题。最终标题、简介、关键词和话题必须在脚本与时间轴确定后，按照长视频生产基线生成。

| 日期 | 来源与发布日期 | 视频方向 | 必须交付 | 状态 |
| --- | --- | --- | --- | --- |
| 2026-07-16 | Anthropic：[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)，2024-12-19 | 别急着做多 Agent：怎样选择真正有效的 Agent 架构？ | Agent 架构选择顺序 | 英文已发布 |
| 2026-07-17 | OpenAI：[How agents are transforming work](https://openai.com/index/how-agents-are-transforming-work/)，2026-06-25 | 从聊天到干活：什么任务值得交给 Agent？ | 任务升级判断表 | 待执行 |
| 2026-07-18 | Microsoft：[2026 Work Trend Index](https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization)，2026-05-05 | 应该问 AI、和 AI 协作，还是把任务交给它？ | AI 四种工作模式图 | 待执行 |
| 2026-07-19 | Anthropic：[A new way to reflect on how you use Claude](https://www.anthropic.com/news/reflect-with-claude)，2026-07-09 | 真正会用 AI 的人，强在哪四个能力？ | 4D AI 能力自查卡 | 待执行 |
| 2026-07-20 | OpenAI：[How to use ChatGPT Work for everyday tasks](https://openai.com/academy/how-to-use-chatgpt-work-for-everyday-tasks/)，2026-04-23 | 把任务交给 Agent 前，需要写清哪些信息？ | Agent 任务委托单 | 待执行 |
| 2026-07-21 | OpenAI：[ChatGPT for research](https://openai.com/academy/research/)，2026-04-10 | Deep Research 怎样提问，才不会只得到一堆资料？ | 深度研究任务模板 | 待执行 |
| 2026-07-22 | Anthropic：[The AI Fluency Index](https://www.anthropic.com/research/AI-fluency-index)，2026-02-23 | 为什么第一版答案越顺眼，越需要主动检查？ | 高质量协作回合清单 | 待执行 |
| 2026-07-23 | Anthropic：[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)，2025-09-29 | 提示词写得再长，为什么 Agent 还是会忘？ | 最小高信号上下文包 | 待执行 |
| 2026-07-24 | Anthropic：[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)，2026-01-09 | AI 说完成了，怎样确认它真的完成？ | Agent 结果验收表 | 待执行 |
| 2026-07-25 | OpenAI：[Why language models hallucinate](https://openai.com/index/why-language-models-hallucinate/)，2025-09-05 | AI 为什么宁愿猜错，也不愿说不知道？ | 不确定性与事实核验清单 | 待执行 |
| 2026-07-26 | OpenAI：[Designing AI agents to resist prompt injection](https://openai.com/index/designing-agents-to-resist-prompt-injection/)，2026-03-11 | 哪些操作可以自动执行，哪些必须由人批准？ | 三级行动权限矩阵 | 待执行 |
| 2026-07-27 | Microsoft Research：[From raw interaction to reusable knowledge](https://www.microsoft.com/en-us/research/blog/from-raw-interaction-to-reusable-knowledge-rethinking-memory-for-ai-agents/)，2026-03-10 | Agent 记得越多，为什么反而可能越笨？ | 记忆保留、提炼、遗忘表 | 待执行 |
| 2026-07-28 | Anthropic：[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)，2025-11-26 | Agent 连续工作几小时，怎样避免跑偏？ | 长任务进度与交接模板 | 待执行 |
| 2026-07-29 | OpenAI：[Using skills](https://openai.com/academy/skills/)，2026-04-10 | 怎样把一次成功经验变成下次还能复用的能力？ | Skill 模板 | 待执行 |
| 2026-07-30 | Anthropic：[How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)，2025-06-13 | 一个 Agent 什么时候真的不够用？ | 单 Agent / 多 Agent 决策树 | 待执行 |

最后一篇略早于近一年优先范围，但它对多 Agent 的适用条件、成本和协作限制仍然有效，因此作为高价值例外保留。

## 每日执行流程

```text
读取当天排期与选题归档
→ 复核原文仍可访问、标题、日期和关键结论
→ 完整分析文章并建立内容地图
→ 建立共享内容地图、章节结构和可复用产物
→ 分别生成自然英文脚本和中文脚本
→ 分别生成最终 TTS、VTT 和真实时间轴
→ 按各自旁白时间轴编排相同视觉语义
→ 分别完成英文版和中文版全部准出检查
→ 生成英文发布标题、简介、章节、关键词和话题
→ 仅将英文版通过 Postiz 发布至 YouTube 指定播放列表
→ 验证英文公开视频和播放列表归属
→ 打开哔哩哔哩与抖音上传页，上传中文 MP4，填写标题、简介、话题和对应比例封面
→ 停在最终发布按钮之前，把两个页面交给用户确认并手动发布
→ 在任务报告中提供中文版 MP4 路径和两个中文平台的表单准备状态
→ 更新计划状态并写入归档
```

状态依次为：`待执行 → 来源已确认 → 双语制作中 → 双语已生成 → 英文已发布`。英文或中文任一版本准出失败、来源失效或平台失败时标记为 `阻塞`，记录具体语言、实际原因和已保留产物，不得写成成功。

## 自动续排规则

当天没有排期时，任务自动研究并补充一个新选题后继续制作。新文章优先满足：

1. 发布于最近 `12` 个月，来自 OpenAI、Anthropic、Google DeepMind、Microsoft Research、Google、Microsoft WorkLab 等头部机构的官方页面。
2. 能转化为广大 AI/Agent 使用者面对的工作问题，同时包含可验证的方法、数据、机制、边界或案例。
3. 能交付一个可复用工具，不选择只有产品发布信息、缺少方法和证据的宣传稿。
4. 与计划和归档中的 canonical URL、核心问题、中心结论及可复用产物均不重复。
5. 超过 `12` 个月的文章只有在内容仍有效且价值明显高于近期候选时使用，并在计划中写明保留原因。

每次只补充当天需要的一篇，不一次性生成大量未经复核的远期选题。新条目必须先写入本计划，再开始视频制作。

## 自动清理规则

每天开始新视频制作前运行：

```bash
node scripts/ai-video-pipeline/cleanup-published-longform.mjs --apply
```

清理只处理本任务生成的双语横屏长视频，并同时满足以下条件：

1. 英文版已经由 YouTube API 再次确认是 `public`，并且仍位于播放列表 `PLJffvaWRvGC8`。
2. 英文和中文两个 MP4 都已完成准出，中文路径已经出现在任务报告和归档中。
3. 距离英文版实际 `publishedAt` 已满 `48` 小时。
4. 发布成功后已经写入 `var/ai-video-pipeline/longform/published/<date>-<slug>.json` 清理清单。

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
- 已生成但英文发布失败的选题仍进入归档，后续优先补投原英文视频，不重新制作同题视频；中文版路径继续保留。
- 发布后记录英文最终标题、YouTube URL、播放列表、原文 URL、核心结论、可复用产物、英文产物路径和中文产物路径。
- 计划和归档是选题事实源。不得只依赖 YouTube 标题判断是否重复。
