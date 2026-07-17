# Tiny Agent 横屏长视频选题归档

## 用途

本文件记录已经进入制作的横屏长视频选题，以及同一选题的英文和中文产物，用于避免重复、恢复发布失败任务，并为后续新选题提供内容覆盖参考。

自动选题必须同时检查本归档和 `tiny-agent-longform-plan.md`。以下任一项高度重合时默认视为重复：

- canonical URL 相同，或只是增加追踪参数、锚点和语言参数。
- 面向同一用户问题，中心结论和判断方法基本相同。
- 最终交付的是同一种模板、清单或决策工具，且没有新的应用边界。

来源相同不必然等于重复，但复用同一来源时必须在“差异说明”中写明新的问题、结论和产物；无法说明差异时不得再次制作。

## 归档记录

| 进入制作日期 | 来源 | 用户问题与核心结论 | 可复用产物 | 英文视频 | 中文视频 | 状态 | 差异说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-16 | Anthropic：[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)，2024-12-19 | 不要从多 Agent 架构开始；先使用最简单的可行方案，只有结果可测量地改善时才增加 Workflow 或 Agent 复杂度 | Agent Architecture Decision Ladder（Agent 架构选择顺序） | [YouTube](https://www.youtube.com/watch?v=m678C-XvUFE)；`var/hyperframes-showcases/2026-07-16-building-effective-agents-longform-en-US/renders/video.mp4` | `var/hyperframes-showcases/2026-07-16-building-effective-agents-longform-zh-CN/renders/video.mp4` | 英文已发布 | 双语以共享内容地图保持结论与章节承诺一致，并按各自旁白独立编译时间轴；该架构选择问题不再重复制作 |

## 追加格式

每次进入制作后追加一行，不删除历史记录：

```text
| YYYY-MM-DD | [机构：文章标题](canonical URL)，原文发布日期 | 用户问题；中心结论 | 模板/清单/决策工具 | 英文 YouTube URL 或英文 MP4 | 中文 MP4 | 双语已生成/英文已发布/阻塞 | 与历史主题的差异或阻塞原因 |
```

状态含义：

- `双语已生成`：英文和中文成片均通过本地准出，但尚未确认英文版在 YouTube 公开发布。
- `英文已发布`：英文版已取得 YouTube 公开视频 URL，并确认加入目标播放列表；中文版本地路径有效。
- `阻塞`：已进入制作或发布流程但未完成；必须写明英文或中文的失败阶段，并保留可恢复产物路径。
- `淘汰`：来源复核后确认不适合制作；保留淘汰原因，避免以后重复评估。

归档只能依据实际证据更新。只有双语本地 QA、英文平台结果和 URL 齐全时才能标记为 `英文已发布`。

## 本地视频清理记录

英文发布成功后记录 `publishedAt` 和清理清单路径。满 `48` 小时并通过公开状态与播放列表复核后，删除中英文 MP4，并将状态更新为 `已清理`。删除后仍保留原始本地路径、YouTube URL、脚本、字幕、时间轴、元数据和 QA 结果。

| 选题日期 | publishedAt | 清理清单 | eligibleAt | 状态 | deletedAt |
| --- | --- | --- | --- | --- | --- |
| 2026-07-16 | 2026-07-16T11:09:05Z | `var/ai-video-pipeline/longform/published/2026-07-16-building-effective-agents.json` | 2026-07-18T11:09:05Z | 待清理 |  |
