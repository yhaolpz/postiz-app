# Tiny Agent 双语长视频每日运行手册

## 任务边界

- 每次运行消费一个独立选题，生成英文和中文两条 Tiny Agent 横屏深度视频。
- 英文版通过本地 Postiz 发布到已连接的 IndieSeek YouTube；中文版只生成本地成片、通用中文元数据和 `4:3`、`3:4` 两张中文封面。每期另同步交付一套与中文发布素材语义一致的自然英文文案和三条英文互动建议。
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

自 `2026-07-28-03` 起，active profile 的 `englishChineseProductionParity` 是双语生产的硬门槛。当前认可的中文实现 `var/hyperframes-showcases/2026-07-27-03-ai-agent-skills-longform-zh-CN/` 是画面、节奏、封面和准出体验的现行参考；英文不再拥有独立创意方向。中文是制作语法的主版本，英文只做自然英语本地化和成人英语旁白替换。

读取完成后先运行：

```bash
node scripts/ai-video-pipeline/validate-tiny-agent-active-rules.mjs
```

检查失败时停止生产，先修复活跃规则中的冲突、失效引用或过长自动化上下文。

## 0. 中英文统一制作合同

1. 研究完成后先创建一份 `bilingual-content-contract.json`，相同字节分别放入两个语言项目。它至少固定：
   - canonical URL、中心结论和 P0/P1/P2/P3 语义单元；
   - 章节、场景、小结、例子、边界和风险的稳定 ID；
   - 最终可复用产物；
   - 中英文事实、结论、例子、边界和产物一致，以及英文为自然表达而非机械翻译的人工复核结果。

   ```json
   {
     "schemaVersion": 1,
     "contractId": "<RUN_KEY>-<SLUG>",
     "canonicalLocale": "zh-CN",
     "sourceCanonicalUrl": "<canonical URL>",
     "centralThesisId": "thesis-01",
     "reusableArtifactId": "artifact-01",
     "coverActionId": "cover-action-01",
     "priorityIds": {"P0": ["p0-01"], "P1": ["p1-01"], "P2": ["p2-01"], "P3": ["p3-01"]},
     "chapters": [{"id": "chapter-01", "sceneIds": ["c01-p01"], "recapIds": []}],
     "review": {
       "sameFactsAndBoundaries": true,
       "sameCentralThesis": true,
       "sameP0P1P2Coverage": true,
       "sameExamplesAndCaveats": true,
       "sameReusableArtifact": true,
       "naturalEnglishNotMechanicalTranslation": true
     }
   }
   ```
2. 中文作为 canonical locale 先确定内容地图、场景骨架和视觉语义。英文使用相同 `contractId`，保持相同章节数、场景数、场景 ID/顺序、三点小结、布局序列、角色与道具、生成图语义、动作类型、转场、字幕样式、章节进度条和结束页；只改自然英文文案与字幕。
3. 两版分别生成 TTS/VTT 和绝对秒点。英文长视频使用 `en-US-ChristopherNeural +15%` 成人旁白，中文使用 `zh-CN-YunxiaNeural +35%`。英文 Shorts 仍使用自己的 `+30%` 规则，不得把短视频语速带入横屏长视频。绝对时间允许随语言自然变化，但归一化后的章节和场景时长占比必须通过 active profile 的 pacing 门槛。
4. 两版开头执行同一字体、同一字号计算方式、同一画布覆盖率、同一关键词语义色和同一入场节奏。每种语言在 `episode.openingAccentTokens` 中声明当期自然的 `identity/topic/risk` 三类词；不得让英文使用混合行字号、另一套字体或上一期关键词。
5. 自 `2026-07-29-03` 起执行 active profile 的 `englishChineseProductionParity.coverSet`：英文固定生成 `16:9` 4K 发布母版、`4:3`、`3:4` 三张封面；中文只生成 `4:3`、`3:4` 两张封面，不再生成或恢复中文 `16:9`。中英文 `4:3`、`3:4` 使用同一严格 title-hero 几何、主题动作和单 Agent 构图，只替换自然语言标题与对应语言的当期主题插画；只有英文 `16:9` 4K 母版进入 Postiz。
6. 两个语言项目的内容、场景、动画和封面完成后，先运行：

   ```bash
   node scripts/ai-video-pipeline/validate-tiny-agent-bilingual-parity.mjs \
     --english-project <EN_PROJECT_DIR> \
     --chinese-project <ZH_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-bilingual-publishing-materials.mjs \
     --english-project <EN_PROJECT_DIR> \
     --chinese-project <ZH_PROJECT_DIR>
   ```

   两个命令必须分别在两个项目写入相同、带文件哈希的 `qa/bilingual-parity-report.json` 与 `qa/bilingual-publishing-materials-report.json`。任一内容合同、场景结构、动作序列、归一化节奏、`4:3`/`3:4` 封面几何、发布文案语义或三类互动建议不一致时失败；不得手写或复制旧报告绕过检查。

## 1. 清理与恢复

1. 运行 `node scripts/ai-video-pipeline/cleanup-published-longform.mjs --retention-hours 120 --apply`。
2. 只处理清理清单明确记录、英文公开发布已满 `5` 天（`120` 小时）、再次确认仍为 `public` 且属于播放列表 `PLJffvaWRvGC8` 的双语 MP4。
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
6. 两个 `content-map.json` 都写入同一个 `bilingualContractId`；章节、场景、小结、例子和边界必须能回到 `bilingual-content-contract.json` 的稳定 ID。英文不得新增中文没有的论点，也不得删除中文保留的 P0/P1/P2、例子或风险边界。

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
   - 首句按各自最终 VTT 呈现，并完整执行 active profile 的 `openingQuestionReadability`。其中 `hookQuestionQuality` 先检查问题是否直接点明当期真实主题、提供观众价值或有效知识缺口，并排除与正文无关的情境铺垫；通过后再按 profile 的测量区间让问题文字先于声音轻微出现、在声音结束前获得稳定阅读窗口、放大至画布级的视觉主角。右下角的批准 Tiny Agent 从开场第一帧完整可见；开场 DOM 中不得出现独立进度条、左侧蓝色圆点或 `VOICE` 标签，正文硬切后才可开始普通章节进度。
   - 三点小结必须保留口播前缀和编号，画面严格执行 active profile 的 `chapterRecapNarration.screenCopy`：保留蓝色章节小结侧栏与章节标题；右侧三行以蓝色 `1.` / `2.` / `3.` 编号和左对齐的实质结论呈现。实质结论只取 `recapDisplayText`，不得混入“第一/第二/第三”或 `First/Second/Third` 等口播序数词；字幕仍逐字使用最终 VTT。
   - 临时生成图占非结束页视觉状态约 `15%-20%`且不低于 `15%`；全部实际引用的临时生成图严格执行 active profile 的 `generatedArtTransparency`，只以真实透明主体叠加到原有纸质网格底图。凡临时图中出现 Agent，必须同时执行 `tinyAgentGeneratedIdentityConsistency`：生成时实际传入 `tiny-agent-v2` 固定角色 PNG 作为图片参考，角色可完全一致，也可做与 `2026-07-28` 当期临时图相当的轻微姿态、表情、配件、线稿或克制软 3D 变化，但不得改变圆润白色紧凑轮廓、黑色脸屏、两只蓝眼、单根圆头天线、白黑蓝主配色和友好比例，不得变成高挑人形、重甲机甲、动物、真人脸或其它吉祥物。每条视频至少 `7` 类实际可见动作和 `20` 个动作节点。文字、边框、字幕、角色和道具的真实 DOM 溢出、裁切或遮挡必须为 `0`。
7. 两种语言都必须从各自最终 VTT 生成 `animation-plan.json`，并记录动作类型、语义触发、目标、起止参数、持续时间和可读保持时间。
8. 两个项目生成全部 QA 证据后，分别运行：

   ```bash
   node scripts/ai-video-pipeline/validate-tiny-agent-longform-output.mjs --project <PROJECT_DIR>
   ```

   此检查把 active profile 的开场、小结画面文案和临时图透明交付规则作为硬门槛；任一项目失败时不得渲染、发布或报告成功。
9. 冻结快照不复制 6:18 参考视频的主题、事实、脚本、绝对秒点或场景文案；当期内容必须从当前来源重新生成。来源事实、安全、标题身份、固定结束页、技术编码、封面和本地交付边界继续执行当前操作规则。
10. 每个项目至少输出：

   ```text
   bilingual-content-contract.json
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
   local-publishing-materials.<locale>.json
   qa/tiny-agent-identity-review.json
   qa/tiny-agent-identity-consistency-report.json
   qa/generated-art-report.json
   qa/generated-art-alpha-report.json
   qa/recap-visual-copy-report.json
   qa/retention-opening-report.json
   qa/speech-pacing-report.json
   qa/bilingual-parity-report.json
   qa/bilingual-publishing-materials-report.json
   snapshots/
   renders/video.mp4
   ```

## 4. 封面与元数据

1. 英文项目生成三张正式封面：`thumbnail.en-US.png` 4K `16:9` 母版及两张 QA 预览、`thumbnail.en-US.4x3.png`（`1200x900`）及 `240x180` 预览、`thumbnail.en-US.3x4.png`（`900x1200`）及 `180x240` 预览。中文项目只生成 `thumbnail.zh-CN.4x3.png` 与 `thumbnail.zh-CN.3x4.png` 及各自预览；不得生成 `thumbnail.zh-CN.png`、中文 `16x9` generated hero、SVG/spec/预览或别名。
2. 五张封面都只允许一个大号 Tiny Agent 作为唯一角色，并配一个与主题直接相关的核心物体；禁止人物、第二个机器人、多角色群组、角色拼贴和小角色墙。英文 `16:9` 保留 4K YouTube 发布系统；中英文 `4:3`、`3:4` 执行 active profile 的共享严格比例几何和同一主题动作。全部封面对齐 title-hero 系统：短蓝色顶线、蓝色 `AI Agent` 身份词、黑色其余标题文字、黄色底部/纵向分区线。生成插画不得包含文字、字母或数字；每个语言和比例都使用当期主题的单一完整 Tiny Agent 动作插画。标题只做确定性叠加，禁止金色/红色标题字、标题下划线和辅助封面文案。
   - 封面临时 Agent 同样执行 `tinyAgentGeneratedIdentityConsistency`。允许直接保持固定素材形象或做轻微同角色变化；不允许只靠文字描述重新发明一个机器人。每个封面生成请求必须实际引用固定素材 PNG，最终角色必须与场景临时图一起进入同一身份一致性审查。
3. 中文 `4:3`、`3:4` 同时执行 `coverTitleTopicAlignment.zhRatioTitleInformationDensity` 与 `coverReferenceAlignment.zhRatioStrictGeometry`；英文 `4:3`、`3:4` 同时执行对应的 `enRatioTitleInformationDensity` 与 `enRatioStrictGeometry`。每个主标题本身都是完整的主题问题、动作或收益，保持批准封面的多行大标题信息密度；纸质网格、圆角蓝/黄线、四行标题基线、标题组样式和比例插画框逐项匹配 active profile。这仍是一个主标题，不得用辅助小字补数量。
4. 英文 `16:9`、中英文 `4:3` 的 Tiny Agent 可见高度不得低于画布 `50%`；中英文 `3:4` 的固定下方 `40%` 插画区不得缩小，最终 hero 的真实 alpha 主体高度不得低于该区域 `85%`。中文版两个比例还必须执行以下失败关闭规则：真实主体包围盒面积不得低于 `4:3` hero box 的 `45%`、`3:4` hero box 的 `40%`；生成后先按真实 alpha 主体裁切并保留 `3%-6%` 透明安全边距，再放入固定 hero box，不得把带大面积透明留白的原图直接 `contain` 后用外框尺寸冒充主体尺寸。中文 `4:3` 的确定性标题必须按可用左侧宽度自适应字号，最终栅格化文字与可见 hero 至少保留 `24px` 水平间距；中文 `3:4` 标题与可见 hero 至少保留 `12px` 垂直间距。发生冲突时优先缩小到可读字号，不得让文字遮挡角色或主题物体。角色、天线、手脚、工具和核心物体必须完整可辨。
5. 双语标题、片内主题标题和封面标题必须通过 AI Agent 主题身份规则，并执行 active profile 的 `publishingMetadata.titleSemanticAgency`：标题中的动作主语必须与来源和脚本里的真实执行者一致，不得把人创建、编写或沉淀 Skill 的动作错误写成 AI Agent 自己完成。
6. 运行：

   ```bash
   node scripts/ai-video-pipeline/validate-tiny-agent-bilingual-parity.mjs \
     --english-project <EN_PROJECT_DIR> \
     --chinese-project <ZH_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-title-identity.mjs \
     --english-project <EN_PROJECT_DIR> \
     --chinese-project <ZH_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-en-cover-reference.mjs \
     --project <EN_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-zh-cover-reference.mjs \
     --project <ZH_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-bilingual-publishing-materials.mjs \
     --english-project <EN_PROJECT_DIR> \
     --chinese-project <ZH_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-generated-identity.mjs \
     --project <EN_PROJECT_DIR>

   node scripts/ai-video-pipeline/validate-tiny-agent-generated-identity.mjs \
     --project <ZH_PROJECT_DIR>
   ```

7. 两个项目的 `thumbnails/qa.json` 必须证明 `characterCount=1`、`tinyAgentCharacterCount=1`、`humanCharacterCount=0`、`secondaryAgentCharacterCount=0`、`coverCollageCount=0`、`generatedIllustrationTextCount=0`、`blueBlackTitleHierarchy=true`、`yellowRuleIsNotTitleUnderline=true` 和 `largeAgentHeightRatioFailureCount=0`；中文项目另证明 `forbidden16x9ArtifactCount=0`。
8. 英文简介包含三点收获、英文真实章节、相关 hashtag，并以 `Follow Tiny Agent. Tiny Agent helps you get better at using AI.` 作为 hashtag 前最后一句；中文简介包含通用中文标题、精简简介、三点收获、相关 hashtag，并以 `关注 Tiny Agent，成为更擅长使用 AI 的人！` 作为 hashtag 前最后一句。两版简介均不包含来源段、原文标题拼接或外部链接。
9. 两个项目分别生成 `local-publishing-materials.zh-CN.json` 与 `local-publishing-materials.en-US.json`。两文件共享 `materialId`，标题、简介、hashtag 和关键词分别与该语言的 `publish-metadata` 一致；各含恰好三条具名互动建议：`open-question`、`practical-tradeoff`、`viewpoint-experience`。英文必须是自然英文对应表达，不做机械翻译，不伪造来源、成果或互动数据，也不自动发布。

## 5. 准出

1. 先完成双语一致性、双语发布素材和两项目 Tiny Agent 临时图身份一致性检查，再分别完成冻结 profile 要求的资产、DOM、时间轴、留存开头、音频、动作、视觉状态、叙事、结束页、标题身份和技术输出检查。绝对时间不得跨语言复用，但内容合同、场景结构、画面语义、动作序列、归一化节奏、中英文 `4:3`/`3:4` 封面几何和发布素材语义必须一致。
   - 两个项目的 `qa/bilingual-parity-report.json` 与 `qa/bilingual-publishing-materials-report.json` 都必须分别字节一致、`pass=true`，并且其中记录的内容合同、内容地图、场景/动画计划、两种共享比例封面、元数据和本地发布素材哈希与当前文件完全一致。
   - 两版共享相同章节/场景/小结/生成图位置和布局动作序列；总时长比、归一化章节时长占比和归一化场景时长占比均在 active profile 的门槛内。
   - 两个 `summary.json` 的 profile ID 必须分别等于 `tiny-agent-longform-kinetic-retention-2026-07-23-zh-CN` 和 `tiny-agent-longform-kinetic-retention-2026-07-23-en-US`；`video-output-report.json` 与 `speech-pacing-report.json` 必须逐项匹配 active profile 的时长、中文声音和英文成人声音配置。
   - 两个 `opening-hook-quality-report.json` 都证明问题直接点明同一个当期真实主题、观众价值或知识缺口，不含与正文无关的情境铺垫；两个 `retention-opening-report.json` 都证明首句在 `5 秒`内结束，使用同一字体与统一字号算法，并完整记录、通过 active profile 的首字提前、每字最大提前、完整问题阅读窗口、画布文字覆盖率、右下角 Tiny Agent 首帧可见和开场 UI 缺失门槛。没有声音结束后的额外完整问题停留，且字形、问号和角色无裁切或遮挡；权威来源、损失与收益、可复用产物和前 `30 秒`无关注收藏继续通过既有门槛。
   - 两个 `recap-report.json` 和 `recap-visual-copy-report.json` 都证明每个实质章节具有章节开场、正文和三点口播小结；旁白前缀完整，画面有蓝色章节侧栏和章节标题，三行正文按 `1.` / `2.` / `3.` 累积显示并左对齐，正文只显示实质结论，字幕逐字保留最终 VTT。
   - `visual-cadence-report.json` 记录场景数、章节数、场景时长分布及其与 6:18 参考实现 `63/7/15` 的差异；不得套用 V4 的 `35-45` 个稳定状态或 `12 秒`中位时长门槛。
   - 两个 `motion-report.json` 都证明至少 `7` 类动作和 `20` 个动作节点，并且全部动作绑定旁白语义；`visual-variation-report.json` 证明临时生成图场景占比为 `15%-20%`且不低于 `15%`，`generated-art-alpha-report.json` 证明每个引用的临时图都是真实透明主体、没有自带背景并直接叠加到纸质网格。
   - 两个 `tiny-agent-identity-consistency-report.json` 都必须 `pass=true`，逐文件绑定最终临时场景图和封面 hero 哈希，并证明包含 Agent 的图片实际使用固定角色 PNG 作为参考、全部硬身份锚点通过、次级身份锚点至少命中 `2` 项、所有 Agent 都属于同一 Tiny Agent 身份、差异只为 `exact-match` 或 `minor-variation`，且 `majorRedesignDetected=false`。
   - 两版观众可见的制作规则、布局名、动效名和 QA 名称数量均为 `0`；来源事实、安全、自然语言、标题身份与语义主语、固定结束页和音视频技术门槛全部通过。
2. 运行 HyperFrames check、渲染与 `ffprobe`；抽查首字出现、逐字出现中点、问号收束、正文首帧、章节开场、章节正文、三点小结、最终总结、工具回收和独立结束页。
3. 检查 H.264/AAC、`1920x1080`、`30fps`、BT.709、字幕同步、黑帧、静音尾巴、固定 CTA 音轨和结束页首帧对齐。
4. 五张固定封面全部通过原尺寸和缩略尺寸检查；中英文 `4:3`/`3:4` 的共享几何和各自 strict geometry 失败数必须为 `0`，中文 `16:9` 禁用产物数必须为 `0`，单一大号 Tiny Agent、无人物/第二机器人/拼贴、生成插画无文字、静态语义标题色、真实 alpha 主体占用率和标题—hero 间距门槛失败数均为 `0`。QA 必须记录裁切前后主体包围盒、四边透明边距、映射后的可见宽高/面积、最终文字包围盒与实际间距；只记录固定 hero box 坐标不算通过。英文发布只能提交 `thumbnail.en-US.png` 4K 母版。
5. 任一双语视频、固定封面、双语发布素材或 Tiny Agent 临时图身份一致性检查失败时停止发布，修复源文件并重新准出；不得把失败项目写成完成。

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

1. 双语 QA 和英文发布验证成功后，创建 `var/ai-video-pipeline/longform/published/<RUN_KEY>-<SLUG>.json`，记录实际发布时间、YouTube 证据、双语 MP4 相对路径和 `120` 小时清理状态。
2. 实时更新计划、归档和 automation memory。英文发布失败时保留完整双语产物并标记为优先补投。
3. 最终用中文简短报告：执行时间、来源、英文标题、可复用产物、双语 MP4 与时长、五张固定封面、双语视频/封面/发布素材 QA、英文 YouTube URL、播放列表验证、清理结果和计划/归档更新。中文交付段列出中文母版、中文 `4:3`/`3:4` 两张封面路径与尺寸；发布素材段同时给出中文与自然英文两套标题、简介、hashtag、关键词，以及各自恰好三条可复制的作者互动评论建议。两种语言的三条评论都按开放问题、可执行取舍、个人观点/经验邀请三个稳定角度生成；不得伪造来源、成果或互动数据，不自动发布到任何平台。
4. 只有双语成片、五张封面、双语发布素材、英文 4K 封面提交、英文 public 状态和播放列表验证全部成功，才能声称当次生产成功。
