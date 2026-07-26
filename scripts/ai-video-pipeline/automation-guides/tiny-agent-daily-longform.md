# Tiny Agent 双语长视频每日运行手册

## 任务边界

- 每次运行消费一个独立选题，生成英文和中文两条 Tiny Agent 横屏深度视频。
- 英文版通过本地 Postiz 发布到已连接的 IndieSeek YouTube；中文版只生成本地成片、通用中文元数据和三张固定封面。
- 不打开或代填任何中文平台上传页，不生成小红书专用字段，不通过接口或浏览器上传中文素材。
- 不提交代码，不回滚用户改动，不泄露凭据。

生产前完整读取：

- `scripts/ai-video-pipeline/content-plans/tiny-agent-longform-plan.md`
- `scripts/ai-video-pipeline/content-plans/tiny-agent-longform-archive.md`
- `scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md`
- `scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json`
- `scripts/ai-video-pipeline/style-guides/snapshots/2026-07-23-scheduled-6m18/manifest.json`
- `scripts/ai-video-pipeline/style-guides/snapshots/2026-07-23-scheduled-6m18/automation-prompt.txt`
- `scripts/ai-video-pipeline/style-guides/snapshots/2026-07-23-scheduled-6m18/tiny-agent-longform.md`
- `scripts/ai-video-pipeline/style-guides/snapshots/2026-07-23-scheduled-6m18/implementation-profile.zh-CN.json`
- `$CODEX_HOME/automations/tiny-agent/memory.md`

本手册只规定每日状态机和发布流程。中英文视频生成规则统一由 `tiny-agent-longform-active-profile.zh-CN.json` 激活的 `2026-07-23-scheduled-6m18` 冻结快照提供；当前 `tiny-agent-longform.md` 已恢复为提交 `457ba42d110d259ed03c4b008e1af2cc8b0b9935` 中的逐字副本。新选题必须重新生成事实、自然双语脚本、TTS、VTT、章节秒点、场景和动画，但内容组织、语音、时长、开头、章节结构、画面节拍、动作、生成图、逐章小结和 QA 必须执行冻结快照。

`tiny-agent-deep-longform-cognitive-load.md` 及 V4/V5/V6/V7 工程均形成于 6:18 定时成片之后，不参与当前生产。不得混入后来的双语 `+10%`、`9-12 分钟`、单故事三模块、取消逐章三点口播小结、`35-45` 个稳定状态或完整问题停留 `1.2-1.6 秒`等规则。仅以 active profile 中具名、窄范围的 `postSnapshotUserOverrides` 替换相冲突的冻结措辞。

读取完成后先运行：

```bash
node scripts/ai-video-pipeline/validate-tiny-agent-active-rules.mjs
```

检查失败时停止生产，先修复活跃规则中的冲突、失效引用或过长自动化上下文。

## 1. 清理与恢复

1. 运行 `node scripts/ai-video-pipeline/cleanup-published-longform.mjs --apply`。
2. 只处理清理清单明确记录、英文公开发布已满 `48` 小时、再次确认仍为 `public` 且属于播放列表 `PLJffvaWRvGC8` 的双语 MP4。
3. 单个旧清单清理失败时记录原因并继续生产，不扩大删除范围；把成功删除记录同步到选题归档。
4. 按 `Asia/Shanghai` 生成 `RUN_KEY=<YYYY-MM-DD>-03`，检查计划、归档、本地产物和发布证据：
   - 英文已发布且中文已完成：停止重复生产。
   - 双语已完成但英文未发布：补投原英文视频，不重新制作。
   - 任一语言未完成：从已有脚本、音频、时间轴或项目恢复。
5. 使用 `var/ai-video-pipeline/longform/<RUN_KEY>.in-progress` 防并发。六小时内的有效 marker 阻止重复运行；过期 marker 先核对产物再恢复。
6. 若上一运行仍未完成，优先恢复上一运行；否则领取计划中最早的“制作中”或“待执行”条目，并立即写入 `RUN_KEY` 与来源确认状态。

## 2. 选题与内容

1. 只有计划中没有可恢复或待执行条目时，才从最近十二个月头部 AI 公司或研究机构的官方文章续排新主题。
2. 新主题先检查 canonical URL、用户问题、中心结论和可复用产物是否与计划或归档重复。
3. 打开官方原文复核标题、日期和关键结论，建立双语共享 `content-map.json`：
   - 中心主旨与 P0/P1/P2/P3；
   - 事实边界与来源归属；
   - 由来源知识结构决定的实质章节；
   - 每章的价值承诺、正文知识与三点小结；
   - 最终可复用方法或工具。
4. 英文和中文分别写自然脚本，不机械翻译。两版共享知识覆盖、章节顺序、事实边界和最终工具，但必须按各自语言自然表达。
5. 保留所有增加事实、证据、机制、边界、判断、步骤或迁移价值的内容；只删除无信息增量的重复表达、客套转场和相似案例。

## 3. 双语生产

1. 分别生成最终 TTS 和 VTT，再分别生成 `timing-map.json`、`scene-plan.json` 和 `animation-plan.json`；禁止跨语言复用时间戳。声音、语速、时长和开场数值只读取 active profile 的 `fixedBilingualGeneration` 与具名覆盖项，不在本手册、自动化 Prompt 或 memory 中复写。前 `30 秒`普通句间停顿不超过 `0.2 秒`，其余停顿按最终自然语音和章节节奏生成，不套用后来 V4 的三档停顿。
2. 新建独立项目：
   - `var/hyperframes-showcases/<RUN_KEY>-<SLUG>-longform-en-US/`
   - `var/hyperframes-showcases/<RUN_KEY>-<SLUG>-longform-zh-CN/`
3. 两个项目都运行：

   ```bash
   node scripts/ai-video-pipeline/hyperframes/prepare-tiny-agent-assets.mjs --project <PROJECT_DIR>
   ```

4. 活跃资产必须来自 `tiny-agent-active.json` 中 QA 为 pass 的包。生成 HTML 前调用 `assertTinyAgentScenePlanAssets(scenePlan, pack, { requireDirectionMetadata: true })`。
5. 以最终 VTT 编译场景、字幕、动画、章节进度和固定结束页。`scripts/ai-video-pipeline/run.mjs` 是 Shorts 入口，不用于长视频。
6. 两个项目都在 `summary.json` 写入对应语言的 `tiny-agent-longform-kinetic-retention-2026-07-23-<locale>` profile，并完整执行冻结快照：
   - 使用总分总结构，按来源知识自然划分章节；每个实质章节包含章节开场、正文和可朗读的三点编号小结。章节开场与小结文字至少为字幕字号的 `130%` 且加粗。
   - 6:18 中文参考实现包含 `63` 个场景、`7` 个章节和 `15` 个小结场景。这些数字用于效果对照，不机械复制主题文字；新视频应保持相近的信息节拍和章节密度，偏差必须在 QA 中说明。
   - 首句按各自最终 VTT 呈现，并完整执行 active profile 的 `openingQuestionReadability`：以 profile 的测量区间让问题文字先于声音轻微出现、在声音结束前获得稳定阅读窗口、放大至画布级的视觉主角；右下角的批准 Tiny Agent 从开场第一帧完整可见。开场 DOM 中不得出现独立进度条、左侧蓝色圆点或 `VOICE` 标签；正文硬切后才可开始普通章节进度。
   - 三点小结必须保留口播前缀和编号，画面严格执行 active profile 的 `chapterRecapNarration.screenCopy`：保留蓝色章节小结侧栏与章节标题；右侧三行以蓝色 `1.` / `2.` / `3.` 编号和左对齐的实质结论呈现。实质结论只取 `recapDisplayText`，不得混入“第一/第二/第三”或 `First/Second/Third` 等口播序数词；字幕仍逐字使用最终 VTT。
   - 临时生成图占非结束页视觉状态约 `15%-20%`且不低于 `15%`；全部实际引用的临时生成图严格执行 active profile 的 `generatedArtTransparency`，只以真实透明主体叠加到原有纸质网格底图。每条视频至少 `7` 类实际可见动作和 `20` 个动作节点。文字、边框、字幕、角色和道具的真实 DOM 溢出、裁切或遮挡必须为 `0`。
7. 两种语言都必须从各自最终 VTT 生成 `animation-plan.json`，并记录动作类型、语义触发、目标、起止参数、持续时间和可读保持时间。
8. 两个项目生成全部 QA 证据后，分别运行：

   ```bash
   node scripts/ai-video-pipeline/validate-tiny-agent-longform-output.mjs --project <PROJECT_DIR>
   ```

   此检查把 active profile 的开场、小结画面文案和临时图透明交付规则作为硬门槛；任一项目失败时不得渲染、发布或报告成功。
9. 冻结快照不复制 6:18 参考视频的主题、事实、脚本、绝对秒点或场景文案；当期内容必须从当前来源重新生成。来源事实、安全、标题身份、固定结束页、技术编码、封面和本地交付边界继续执行当前操作规则。
10. 每个项目至少输出：

   ```text
   source.md
   content-map.json
   SCRIPT.<locale>.md
   STORYBOARD.md
   scene-plan.json
   animation-plan.json
   timing-map.json
   summary.json
   assets-manifest.json
   assets/generated/scene-art/provenance.json
   audio/narration.mp3
   captions/narration.vtt
   publish-metadata.<locale>.json
   qa/generated-art-report.json
   qa/generated-art-alpha-report.json
   qa/recap-visual-copy-report.json
   qa/retention-opening-report.json
   qa/speech-pacing-report.json
   snapshots/
   renders/video.mp4
   ```

## 4. 封面与元数据

1. 英文项目生成 `thumbnail.en-US.png` 4K 母版和两张 QA 预览；中文项目只生成 `16:9`、`4:3`、`3:4` 三张固定封面。
2. 四张封面都只允许一个大号 Tiny Agent 作为唯一角色，并配一个与主题直接相关的核心物体；禁止人物、第二个机器人、多角色群组、角色拼贴和小角色墙。封面必须对齐 `2026-07-23-03-ai-agent-uncertainty-longform-zh-CN` 的 title-hero 参考：短蓝色顶线、蓝色 `AI Agent` 身份词、黑色其余标题文字、黄色底部/纵向分区线。生成插画不得包含文字、字母或数字；角色使用已批准的稳定 Tiny Agent 参考资产族，禁止通过生成图重造角色。标题只做确定性叠加，禁止金色/红色标题字、标题下划线和辅助封面文案。
3. 英文 `16:9`、中文 `16:9` 和中文 `4:3` 的 Tiny Agent 可见高度不得低于画布 `50%`；中文 `3:4` 的 Tiny Agent 可见高度不得低于底部 `40%` 插画区的 `85%`。角色、天线、手脚、工具和核心物体必须完整可辨。
4. 双语标题、片内主题标题和封面标题必须通过 AI Agent 主题身份规则。
5. 运行：

   ```bash
   node scripts/ai-video-pipeline/validate-tiny-agent-title-identity.mjs \
     --english-project <EN_PROJECT_DIR> \
     --chinese-project <ZH_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-zh-cover-reference.mjs \
     --project <ZH_PROJECT_DIR>
   ```

6. 两个项目的 `thumbnails/qa.json` 必须证明 `characterCount=1`、`tinyAgentCharacterCount=1`、`humanCharacterCount=0`、`secondaryAgentCharacterCount=0`、`coverCollageCount=0`、`generatedIllustrationTextCount=0`、`blueBlackTitleHierarchy=true`、`yellowRuleIsNotTitleUnderline=true` 和 `largeAgentHeightRatioFailureCount=0`。
7. 英文简介包含三点收获、英文真实章节、相关 hashtag，并以 `Follow Tiny Agent. Tiny Agent helps you get better at using AI.` 作为 hashtag 前最后一句；中文简介只包含通用中文标题、精简简介、三点收获、相关 hashtag，并以 `关注 Tiny Agent，成为更擅长使用 AI 的人！` 作为 hashtag 前最后一句。
8. 两版简介均不包含来源段、原文标题拼接或外部链接；来源只保存在项目事实文件和结构化字段中。

## 5. 准出

1. 两种语言分别完成冻结 profile 要求的资产、DOM、时间轴、留存开头、音频、动作、视觉状态、叙事、结束页、标题身份和技术输出检查，不得跨语言复用时间戳。
   - 两个 `summary.json` 的 profile ID 必须分别等于 `tiny-agent-longform-kinetic-retention-2026-07-23-zh-CN` 和 `tiny-agent-longform-kinetic-retention-2026-07-23-en-US`；`video-output-report.json` 与 `speech-pacing-report.json` 必须逐项匹配 active profile 的时长、中文声音和英文成人声音配置。
   - 两个 `retention-opening-report.json` 都证明首句在 `5 秒`内结束，且完整记录并通过 active profile 的首字提前、每字最大提前、完整问题阅读窗口、画布文字覆盖率、右下角 Tiny Agent 首帧可见和开场 UI 缺失门槛；没有声音结束后的额外完整问题停留，且字形、问号和角色无裁切或遮挡；权威来源、损失与收益、可复用产物和前 `30 秒`无关注收藏继续通过既有门槛。
   - 两个 `recap-report.json` 和 `recap-visual-copy-report.json` 都证明每个实质章节具有章节开场、正文和三点口播小结；旁白前缀完整，画面有蓝色章节侧栏和章节标题，三行正文按 `1.` / `2.` / `3.` 累积显示并左对齐，正文只显示实质结论，字幕逐字保留最终 VTT。
   - `visual-cadence-report.json` 记录场景数、章节数、场景时长分布及其与 6:18 参考实现 `63/7/15` 的差异；不得套用 V4 的 `35-45` 个稳定状态或 `12 秒`中位时长门槛。
   - 两个 `motion-report.json` 都证明至少 `7` 类动作和 `20` 个动作节点，并且全部动作绑定旁白语义；`visual-variation-report.json` 证明临时生成图场景占比为 `15%-20%`且不低于 `15%`，`generated-art-alpha-report.json` 证明每个引用的临时图都是真实透明主体、没有自带背景并直接叠加到纸质网格。
   - 两版观众可见的制作规则、布局名、动效名和 QA 名称数量均为 `0`；来源事实、安全、自然语言、标题身份、固定结束页和音视频技术门槛全部通过。
2. 运行 HyperFrames check、渲染与 `ffprobe`；抽查首字出现、逐字出现中点、问号收束、正文首帧、章节开场、章节正文、三点小结、最终总结、工具回收和独立结束页。
3. 检查 H.264/AAC、`1920x1080`、`30fps`、BT.709、字幕同步、黑帧、静音尾巴、固定 CTA 音轨和结束页首帧对齐。
4. 四张固定封面全部通过原尺寸和缩略尺寸检查；单一大号 Tiny Agent、无人物/第二机器人/拼贴、生成插画无文字、`2-3` 个静态语义标题色和角色高度门槛的失败数均为 `0`。英文发布只能提交 `thumbnail.en-US.png` 4K 母版。
5. 任一双语视频或固定封面失败时停止发布，修复源文件并重新准出；不得把失败项目写成完成。

## 6. 英文发布

1. 按项目既有方式恢复本地 Postiz backend、Temporal、orchestrator 和可刷新的 OAuth。只有密码、验证码、2FA、CAPTCHA 或平台明确拒绝授权才列为人工项。
2. 只通过现有长视频 Postiz helper 发布英文 MP4，不直接调用 YouTube 上传。
3. 发布参数：
   - `privacyStatus=public`
   - `selfDeclaredMadeForKids=no`
   - `playlistId=PLJffvaWRvGC8`
   - `playlistTitle=AI Agents: From Chat to Done`
   - `playlistPrivacyStatus=public`
   - thumbnail 使用英文 4K 母版
4. Postiz 返回后，通过 YouTube API 或公开页面验证：
   - 视频为 `public`；
   - 发布 URL 可访问；
   - 视频属于播放列表 `PLJffvaWRvGC8`。
5. 三项证据齐全后才标记英文已发布。

## 7. 持久化与报告

1. 双语 QA 和英文发布验证成功后，创建 `var/ai-video-pipeline/longform/published/<RUN_KEY>-<SLUG>.json`，记录实际发布时间、YouTube 证据、双语 MP4 相对路径和 `48` 小时清理状态。
2. 实时更新计划、归档和 automation memory。英文发布失败时保留完整双语产物并标记为优先补投。
3. 最终用中文简短报告：执行时间、来源、英文标题、可复用产物、双语 MP4 与时长、四张固定封面、双语视频和封面 QA、英文 YouTube URL、播放列表验证、清理结果、计划/归档更新，以及通用中文标题、简介、hashtag 和关键词。中文交付段必须列出可本地保存的中文母版路径、三张固定封面路径与尺寸；另固定给出恰好三条“作者互动评论建议”。三条评论必须根据当期视频主题分别采用开放问题、可执行取舍或个人观点/经验邀请等不同互动角度，自然简短、可由作者直接发布、鼓励真实回复；不得伪造来源、成果或互动数据，不自动发布到任何平台。
4. 只有双语成片、四张封面、英文 4K 封面提交、英文 public 状态和播放列表验证全部成功，才能声称当次生产成功。
