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
- `scripts/ai-video-pipeline/style-guides/tiny-agent-deep-longform-cognitive-load.md`
- `$CODEX_HOME/automations/tiny-agent/memory.md`

内容、视觉、封面、语音、开头、QA 和双语差异全部以两份 style guide 为事实源；本手册只规定每日状态机和发布流程。

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
   - 一条日常故事的因果链；
   - 不超过三个实质模块；
   - 最终可复用能力或工具。
4. 英文和中文分别写自然脚本，不机械翻译。两版共享知识覆盖、故事结果、章节承诺、事实边界和最终工具。
5. 保留所有增加事实、证据、机制、边界、判断、步骤或迁移价值的内容；只删除无信息增量的重复表达、客套转场和相似案例。

## 3. 双语生产

1. 分别生成最终 TTS 和 VTT，再分别生成 `timing-map.json`、`scene-plan.json` 和 `animation-plan.json`；禁止跨语言复用时间戳。
2. 新建独立项目：
   - `var/hyperframes-showcases/<RUN_KEY>-<SLUG>-longform-en-US/`
   - `var/hyperframes-showcases/<RUN_KEY>-<SLUG>-longform-zh-CN/`
3. 两个项目都运行：

   ```bash
   node scripts/ai-video-pipeline/hyperframes/prepare-tiny-agent-assets.mjs --project <PROJECT_DIR>
   ```

4. 活跃资产必须来自 `tiny-agent-active.json` 中 QA 为 pass 的包。生成 HTML 前调用 `assertTinyAgentScenePlanAssets(scenePlan, pack, { requireDirectionMetadata: true })`。
5. 以最终 VTT 编译场景、字幕、动画、章节进度和固定结束页。`scripts/ai-video-pipeline/run.mjs` 是 Shorts 入口，不用于长视频。
6. 开头问题场景不显示语音进度、音轨圆点、`VOICE` 文案或其它播放控制式 UI。临时完整插画只使用图片生成模型输出，并按通用规范满足场景数、可见时长、不同图片数量、最大空档和语义质量门槛。
7. 正文稳定画面内部按最终 VTT 安排每分钟 `8-10` 个有效语义动作，最长完全静止间隔不超过 `6 秒`。动作必须指出当前重点、证据、因果、步骤或状态变化；入场、字幕、进度、浮动和装饰旋转不计数。全片至少使用 `12` 种实际轨迹不同的语义动作签名和 `5` 种入场签名，单一语义动作签名占比不超过 `20%`。
   - 生成动作前，`scene-plan.json` 为每个可动元素登记 `semanticElements.selector`、`semanticRole` 和 `supportsConcepts`。从最终 VTT 提取 `triggerConcept` 后，只能选择支持该概念且当前可见的元素；禁止按元素序号、轮询、最少使用次数或“还没动过”选择目标。
   - 没有匹配目标时先补充、替换或重新标注场景元素；仍无法匹配则取消该动作并重编场景。不得使用无关角色、标题或道具兜底，也不得把这种动作计入密度。
8. `animation-plan.json` 的每个有效动作都必须包含通用规范要求的完整触发、对象、动作家族、轨迹签名、方向、状态、幅度、缓动、语义目的和保持字段，并额外记录 `triggerConcept`、`targetSemanticRole` 与 `targetMatchEvidence`。一个场景内同一元素最多执行两个不同家族的动作，不得重复同一动作或动作家族；长于 `12 秒`的正文场景必须包含一次明显语义变化。
   - 正文黄色语义强调线必须绑定精确文字范围，单行与文字实际宽度一致，多行逐行生成同宽线段；左右端点误差不超过 `4px`，宽度误差不超过 `2%`。禁止使用固定百分比、整栏宽度或标题容器宽度。
9. 场景切换固定使用不透明 `#ECECEA` 全画布场景层：相关场景 `0.42 秒`水平推页，跨构图 `0.48 秒`纸张遮罩，章节变化 `0.55 秒`垂直推页。新旧内容包围盒不得交叠，旧场景结束后立即隐藏复位，新场景元素只能在对应区域揭示后入场。
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
   snapshots/
   renders/video.mp4
   ```

## 4. 封面与元数据

1. 英文项目生成 `thumbnail.en-US.png` 4K 母版和两张 QA 预览；中文项目只生成 `16:9`、`4:3`、`3:4` 三张固定封面。
2. 双语标题、片内主题标题和封面标题必须通过 AI Agent 主题身份规则。
3. 运行：

   ```bash
   node scripts/ai-video-pipeline/validate-tiny-agent-title-identity.mjs \
     --english-project <EN_PROJECT_DIR> \
     --chinese-project <ZH_PROJECT_DIR>
   ```

4. 英文简介包含三点收获、英文真实章节、固定关注句和相关 hashtag；中文简介只包含通用中文标题、精简简介、固定关注句和 hashtag。
5. 两版简介均不包含来源段、原文标题拼接或外部链接；来源只保存在项目事实文件和结构化字段中。

## 5. 准出

1. 两种语言分别完成资产、方向、balance、semantics、transitions、DOM、highlight、internal-prop、generated-art、motion、semantic-motion-target、retention-opening、cognitive-load、narrative-transition、outro 和 title-identity 检查。
   - `motion-report.json` 与 `semantic-motion-target-report.json` 必须证明每分钟有效语义动作数、逐场景节点数、最大静止间隔、触发绑定、字段完整性、动作与入场签名、单元素去重、目标覆盖、幅度和动作目标语义匹配全部通过；`semanticTargetMismatchCount`、`unmatchedTriggerConceptCount`、`fallbackTargetCount`、`missingSemanticRoleCount` 和 `invisibleTargetCount` 均为 `0`。
   - `highlight-layout-report.json` 中 `underlineWidthMismatchCount`、`underlineTargetMismatchCount`、`underlineLineFragmentFailureCount` 和 `underlineOverflowCount` 均为 `0`；`transitions-report.json` 中内容交叠、旧场景残留、空白帧、层级错误和入场提前数均为 `0`。
2. 运行 HyperFrames check、渲染与 `ffprobe`；抽查首句逐字出现、完整问题停留、正文首帧、故事转折、模块中点、自然衔接、最终工具回收和独立结束页。
3. 检查 H.264/AAC、`1920x1080`、`30fps`、BT.709、字幕同步、黑帧、静音尾巴、固定 CTA 音轨和结束页首帧对齐。
4. 四张固定封面全部通过原尺寸和缩略尺寸检查。英文发布只能提交 `thumbnail.en-US.png` 4K 母版。
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
3. 最终用中文简短报告：执行时间、来源、英文标题、可复用产物、双语 MP4 与时长、四张固定封面、双语视频和封面 QA、英文 YouTube URL、播放列表验证、清理结果、计划/归档更新，以及通用中文标题、简介和 hashtag。
4. 只有双语成片、四张封面、英文 4K 封面提交、英文 public 状态和播放列表验证全部成功，才能声称当次生产成功。
