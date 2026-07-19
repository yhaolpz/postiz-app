# Tiny Agent 横屏长视频选题归档

## 用途

本文件记录已经进入制作的横屏长视频选题、运行时段，以及同一选题的英文和中文产物，用于避免重复、恢复发布失败任务，并为后续新选题提供内容覆盖参考。

自动选题必须同时检查本归档和 `tiny-agent-longform-plan.md`。以下任一项高度重合时默认视为重复：

- canonical URL 相同，或只是增加追踪参数、锚点和语言参数。
- 面向同一用户问题，中心结论和判断方法基本相同。
- 最终交付的是同一种模板、清单或决策工具，且没有新的应用边界。

来源相同不必然等于重复，但复用同一来源时必须在“差异说明”中写明新的问题、结论和产物；无法说明差异时不得再次制作。

## 归档记录

从每日两次运行启用后，新记录使用 `<YYYY-MM-DD>-03` 或 `<YYYY-MM-DD>-15` 作为运行键；历史记录继续保留原日期格式。

| 运行键     | 来源                                                                                                                                                                                                               | 用户问题与核心结论                                                                                                                           | 可复用产物                                               | 英文视频                                                                                                                                                                        | 中文视频                                                                                                                | 状态                                               | 差异说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-16 | Anthropic：[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)，2024-12-19                                                                                                | 不要从多 Agent 架构开始；先使用最简单的可行方案，只有结果可测量地改善时才增加 Workflow 或 Agent 复杂度                                       | Agent Architecture Decision Ladder（Agent 架构选择顺序） | [YouTube](https://www.youtube.com/watch?v=m678C-XvUFE)；`var/hyperframes-showcases/2026-07-16-building-effective-agents-longform-en-US/renders/video.mp4`                       | `var/hyperframes-showcases/2026-07-16-building-effective-agents-longform-zh-CN/renders/video.mp4`                       | 英文已发布                                         | 双语以共享内容地图保持结论与章节承诺一致，并按各自旁白独立编译时间轴；该架构选择问题不再重复制作                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-07-17 | OpenAI：[How agents are transforming work](https://openai.com/index/how-agents-are-transforming-work/)，2026-06-25                                                                                                 | 哪些任务值得从聊天升级为 Agent；只有产物明确、上下文与工具可访问、反馈可观察、风险与权限有边界时，才适合升级为可委派流程                     | Task Upgrade Scorecard（任务升级判断表）                 | [YouTube](https://www.youtube.com/watch?v=SJ0g9yxI3_o)；`var/hyperframes-showcases/2026-07-17-agent-task-upgrade-longform-en-US/renders/video.mp4`                              | `var/hyperframes-showcases/2026-07-17-agent-task-upgrade-longform-zh-CN/renders/video.mp4`                              | 英文已发布                                         | 聚焦任务是否适合升级为 Agent，而非选择 Agent 架构；三个中文平台简介均已删除章节标题和时间戳。外部 Chrome 中哔哩哔哩已选择 `AIAgent` 原生主话题，仅保留 `Agent工作流`、`人机协作`、`TinyAgent`、`AIAutomation` 等相关标签，已删除 `记录`、`剪辑`、`生活记录` 及简介里的整行 `#话题` 文本，停在立即投稿前；抖音已绑定 5 个原生话题，并分别应用正确的中文 `4:3` 横封面和 `3:4` 竖封面，公开可见并停在发布前；小红书已逐个绑定 5 个原生话题，用户已确认加入合集 `AI Agent 知识` 并选中原创声明，停在发布前；三个平台均未点击最终发布 |
| 2026-07-18 | Microsoft：[Agents, human agency, and the opportunity for every organization](https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization)，2026-05-05 | 应该问 AI、与 AI 协作、先探索，还是委派给 Agent；用人类参与强度与 Agent 执行强度两条轴选择提问、协作、探索或委派，并用停止条件与证据切换模式 | AI 四种工作模式图；模式切换与交接记录                    | [YouTube](https://www.youtube.com/watch?v=S6cVeVgCaB0)；`var/hyperframes-showcases/2026-07-18-ai-work-modes-longform-en-US/renders/2026-07-18-ai-work-modes-longform.en-US.mp4` | `var/hyperframes-showcases/2026-07-18-ai-work-modes-longform-zh-CN/renders/2026-07-18-ai-work-modes-longform.zh-CN.mp4` | 英文已发布；中文三平台已由用户手动发布（用户确认） | 与 2026-07-17 的“任务是否适合升级为 Agent”不同，本期解决执行过程中如何选择并切换四种工作模式。双语成片与四张固定封面均通过准出，英文已由 Postiz 提交封面并公开发布，已验证属于播放列表 `PLJffvaWRvGC8`。三个中文平台在自动化阶段均准备到最终发布前；用户于 2026-07-18 手动接管并确认哔哩哔哩、抖音和小红书均已发布，自动化未再次点击或验证公开页面。发布简介已统一删除来源机构、原文标题、来源段和外站链接，并使用固定关注句。小红书长期改为逐个生成并验证 `[话题]` 原生实体，同时清除普通 `#文字`、`##`、重复和连写残留。       |
| 2026-07-19-03 | Anthropic：[Introducing a way to reflect on how you use Claude](https://www.anthropic.com/news/reflect-with-claude)，2026-07-09 | 真正会用 AI 的人，强在能决定是否委托、清楚描述目标、判断输出价值，并对最终使用负责；四项能力需要共同工作，而不是把使用时长当作熟练度 | 4D AI 能力自查卡 | [YouTube](https://www.youtube.com/watch?v=AV6exgE49fU)；`var/hyperframes-showcases/2026-07-19-03-ai-fluency-4d-longform-en-US/renders/2026-07-19-03-ai-fluency-4d-longform.en-US.mp4` | `var/hyperframes-showcases/2026-07-19-03-ai-fluency-4d-longform-zh-CN/renders/2026-07-19-03-ai-fluency-4d-longform.zh-CN.mp4` | 英文已发布；中文三平台准备受锁屏阻塞 | 与“哪些任务适合升级为 Agent”及“四种工作模式”不同，本期聚焦个人在每次 AI 协作中的委托、描述、辨别和尽责能力，并提供可重复自查的四维评分卡。双语成片与四张固定封面均通过准出，英文已由 Postiz 连同封面公开发布并验证属于播放列表 `PLJffvaWRvGC8`。外部 Mac 锁屏导致 Computer Use 无法连接既有 Chrome 登录态，哔哩哔哩、抖音和小红书均未开始上传；保留本时段 marker，解锁后从现有中文 MP4、文案和封面继续。 |

## 追加格式

每次进入制作后追加一行，不删除历史记录：

```text
| YYYY-MM-DD-03 或 YYYY-MM-DD-15 | [机构：文章标题](canonical URL)，原文发布日期 | 用户问题；中心结论 | 模板/清单/决策工具 | 英文 YouTube URL 或英文 MP4 | 中文 MP4 | 双语已生成/英文已发布/阻塞 | 与历史主题的差异或阻塞原因 |
```

状态含义：

- `双语已生成`：英文和中文成片均通过本地准出，但尚未确认英文版在 YouTube 公开发布。
- `英文已发布`：英文版已取得 YouTube 公开视频 URL，并确认加入目标播放列表；中文版本地路径有效。
- `阻塞`：已进入制作或发布流程但未完成；必须写明英文或中文的失败阶段，并保留可恢复产物路径。
- `淘汰`：来源复核后确认不适合制作；保留淘汰原因，避免以后重复评估。

归档只能依据实际证据更新。只有双语本地 QA、英文平台结果和 URL 齐全时才能标记为 `英文已发布`。

## 本地视频清理记录

英文发布成功后记录 `publishedAt` 和清理清单路径。满 `48` 小时并通过公开状态与播放列表复核后，删除中英文 MP4，并将状态更新为 `已清理`。删除后仍保留原始本地路径、YouTube URL、脚本、字幕、时间轴、元数据和 QA 结果。

| 选题日期   | publishedAt          | 清理清单                                                                             | eligibleAt           | 状态   | deletedAt |
| ---------- | -------------------- | ------------------------------------------------------------------------------------ | -------------------- | ------ | --------- |
| 2026-07-16 | 2026-07-16T11:09:05Z | `var/ai-video-pipeline/longform/published/2026-07-16-building-effective-agents.json` | 2026-07-18T11:09:05Z | 已清理 | 2026-07-18T19:05:34.648Z |
| 2026-07-17 | 2026-07-17T10:21:27Z | `var/ai-video-pipeline/longform/published/2026-07-17-agent-task-upgrade.json`        | 2026-07-19T10:21:27Z | 待清理 |           |
| 2026-07-18 | 2026-07-18T08:54:02Z | `var/ai-video-pipeline/longform/published/2026-07-18-ai-work-modes.json`             | 2026-07-20T08:54:02Z | 待清理 |           |
| 2026-07-19-03 | 2026-07-18T20:11:07Z | `var/ai-video-pipeline/longform/published/2026-07-19-03-ai-fluency-4d.json`      | 2026-07-20T20:11:07Z | 待清理 |           |
