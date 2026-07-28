import fs from 'node:fs';
import path from 'node:path';

const root = '/Users/bytedance/Documents/postiz-app';
const runKey = '2026-07-28-03';
const slug = 'multi-agent-decision-longform';
const zhDir = path.join(root, `var/hyperframes-showcases/${runKey}-${slug}-zh-CN`);
const enDir = path.join(root, `var/hyperframes-showcases/${runKey}-${slug}-en-US`);
const sourceUrl = 'https://www.anthropic.com/engineering/multi-agent-research-system';
const contractId = `${runKey}-multi-agent-research-decision-v1`;
const coverActionId = 'cover-action-parallel-research-decision-01';

const writeText = (directory, relativePath, value) => {
  const output = path.join(directory, relativePath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, value.endsWith('\n') ? value : `${value}\n`);
};

const writeJson = (directory, relativePath, value) => {
  writeText(directory, relativePath, `${JSON.stringify(value, null, 2)}\n`);
};

const idsForChapter = (chapterNumber, count) =>
  Array.from({ length: count }, (_, index) =>
    `c${String(chapterNumber).padStart(2, '0')}-p${String(index + 1).padStart(2, '0')}`);

const chapters = [
  { id: 'intro', sceneIds: idsForChapter(1, 5), recapIds: [] },
  { id: 'fit-gate', sceneIds: idsForChapter(2, 10), recapIds: idsForChapter(2, 10).slice(-3) },
  { id: 'delegation-contract', sceneIds: idsForChapter(3, 10), recapIds: idsForChapter(3, 10).slice(-3) },
  { id: 'effort-sizing', sceneIds: idsForChapter(4, 10), recapIds: idsForChapter(4, 10).slice(-3) },
  { id: 'evaluation', sceneIds: idsForChapter(5, 10), recapIds: idsForChapter(5, 10).slice(-3) },
  { id: 'production-reliability', sceneIds: idsForChapter(6, 10), recapIds: idsForChapter(6, 10).slice(-3) },
  { id: 'summary', sceneIds: idsForChapter(7, 4), recapIds: [] },
];

const contract = {
  schemaVersion: 1,
  contractId,
  canonicalLocale: 'zh-CN',
  sourceCanonicalUrl: sourceUrl,
  centralThesisId: 'thesis-parallelism-is-a-fit-and-economics-decision',
  reusableArtifactId: 'artifact-single-vs-multi-agent-decision-tree',
  coverActionId,
  priorityIds: {
    P0: ['p0-fit-before-scaling', 'p0-independent-paths', 'p0-high-value-task'],
    P1: ['p1-delegation-contract', 'p1-effort-sizing', 'p1-evidence-evaluation'],
    P2: ['p2-checkpoints-tracing', 'p2-synchronous-bottleneck'],
    P3: ['p3-agent-count-as-status', 'p3-parallelism-as-default'],
  },
  examples: [
    'Anthropic internal research evaluation: Opus 4 lead with Sonnet 4 subagents outperformed single-agent Opus 4 by 90.2 percent.',
    'Anthropic guidance examples range from one agent with 3-10 tool calls to more than ten subagents for complex research.',
    'Parallel research can reduce time by up to 90 percent on complex queries when independent paths can run concurrently.',
  ],
  caveats: [
    'The 90.2 percent result is an internal research evaluation, not a universal benchmark.',
    'The reported token multipliers describe Anthropic usage patterns and make multi-agent systems sensible mainly for high-value tasks.',
    'Tasks with heavy shared context or tight dependencies, including many coding tasks, may fit a single agent better.',
  ],
  chapters,
  review: {
    sameFactsAndBoundaries: true,
    sameCentralThesis: true,
    sameP0P1P2Coverage: true,
    sameExamplesAndCaveats: true,
    sameReusableArtifact: true,
    naturalEnglishNotMechanicalTranslation: true,
  },
};

const zh = {
  locale: 'zh-CN',
  voice: 'zh-CN-YunxiaNeural',
  rate: '+35%',
  scriptFile: 'SCRIPT.zh-CN.md',
  outputName: `${runKey}-multi-agent-decision-longform.zh-CN.mp4`,
  projectTitle: '什么时候该让多个 AI Agent 并行工作？',
  hookQuestion: '什么时候该让多个 AI Agent 并行工作？',
  hookLines: ['什么时候该让', '多个 AI Agent', '并行', '工作？'],
  firstSentence: '什么时候该让多个 AI Agent 并行工作？答案先看任务能不能拆开。',
  fixedValueSentence: '视频全程干货高价值，让你成为更擅长使用 AI 的人，内容较长，点点关注收藏不迷路。',
  fixedOutroCta: '关注 Tiny Agent，成为更擅长使用 AI 的人！',
  chapterLabels: ['前言', '先过适配门', '写好委派契约', '按任务分配算力', '用结果和过程评估', '为并行系统兜底', '总结'],
  paragraphs: [
    [
      '什么时候该让多个 AI Agent 并行工作？答案先看任务能不能拆开。',
      'Anthropic 在多 Agent 研究系统复盘中给出一个清楚边界：并行能扩大搜索广度，但只有独立路径、高价值结果和足够工具空间同时存在时，协调成本才值得。',
      '它的内部研究评测里，Opus 4 主 Agent 配合 Sonnet 4 子 Agent，比单个 Opus 4 高出百分之九十点二。这个数字来自特定内部评测，不代表所有任务都会得到同样提升。',
      '这期我们做一张单 Agent 和多 Agent 决策树。先判断适配度，再写委派契约、分配搜索力度、检查证据，最后给并行系统加上恢复能力。',
      '视频全程干货高价值，让你成为更擅长使用 AI 的人，内容较长，点点关注收藏不迷路。',
    ],
    [
      '第一步不是增加 Agent，而是判断这个问题有没有值得并行的独立探索路径。',
      '研究任务适合并行，因为答案通常来自许多方向。市场、技术、用户和风险可以分别搜索，再由主 Agent 压缩成一个结论。',
      '当单个上下文窗口需要同时容纳太多来源、工具结果和中间假设时，子 Agent 还能把各自的搜索压缩成高信号摘要。',
      '但如果每一步都依赖上一步的精确状态，拆分会制造大量同步。很多编码任务共享同一份代码和测试状态，往往更适合一个 Agent 连续推进。',
      '还要检查经济性。Anthropic 的使用数据里，单 Agent 大约消耗普通聊天四倍的 token，多 Agent 大约是十五倍。',
      '所以，多 Agent 应该留给价值足够高、错误代价足够大，或者搜索广度会显著改变结果的任务，而不是给简单问题增加仪式感。',
      '把判断写成三个门：路径能否独立，单个上下文是否吃紧，结果价值能否覆盖额外成本。三个条件越齐，越值得并行。',
      '本章小节。第一，先找能独立推进的路径。',
      '第二，共享状态越重，越应该谨慎拆分。',
      '第三，高价值结果才配得上更高成本。',
    ],
    [
      '通过适配门之后，主 Agent 的核心工作不是亲自搜索，而是把问题拆成不会重复也不会漏掉的任务。',
      '每个委派都要写清目标和预期输出。比如不是研究竞争对手，而是列出三家产品的定价、目标用户和可验证来源。',
      '接着声明可用工具和来源边界。指定搜索、浏览或数据库，并说明优先使用原始来源，能减少子 Agent 在低质量材料里绕路。',
      '还要告诉子 Agent 什么不要做。已经覆盖的地区、时间范围和结论格式都要明确，否则多个 Agent 很容易返回同一批信息。',
      'Anthropic 把优秀委派总结为目标、输出格式、工具、来源和任务边界。主 Agent 还要根据第一轮发现继续调整分工。',
      '先广后窄通常更有效。第一轮平行扫描线索，第二轮只让 Agent 深挖真正改变判断的分支。',
      '最终回收的不只是结论，还要有证据链接、关键不确定项和停止原因。这样主 Agent 才能判断哪些结果可以合并。',
      '本章小节。第一，委派必须写清目标和输出。',
      '第二，来源、工具和边界要一起交代。',
      '第三，回收证据与未知项，不只收结论。',
    ],
    [
      '多 Agent 不等于越多越好，搜索力度应该跟问题复杂度和预期价值一起变化。',
      'Anthropic 的经验示例里，简单事实可能只用一个 Agent 和三到十次工具调用。这个量级无需额外协调层。',
      '需要对比多个对象时，可以使用两到四个 Agent，每个 Agent 大约十到十五次工具调用，让每条路径都有足够深度。',
      '复杂研究可能使用十个以上子 Agent，但这不是默认答案。主 Agent 必须能够看见进度、发现重复，并在边际收益下降时停止。',
      '同一个子 Agent 内也可以并行工具调用。Anthropic 建议复杂路径常用三到五个子 Agent，并让每个 Agent 同时使用三个以上工具。',
      '当路径真的独立时，并行可让复杂查询耗时最多下降百分之九十。这个收益来自等待重叠，而不是让每个 Agent 思考得更聪明。',
      '决策树的力度档位可以写成轻量、比较和深挖。每档规定 Agent 数、工具预算、停止条件和升级信号。',
      '本章小节。第一，先按复杂度选择力度档位。',
      '第二，并行收益来自独立等待的重叠。',
      '第三，边际收益下降时就停止扩张。',
    ],
    [
      '多 Agent 的路径会动态变化，因此评估不能只检查它是否复现了一条固定步骤。',
      '先看最终结果：事实是否正确，引用是否支持结论，问题是否覆盖完整，来源是否足够权威。',
      '再看过程是否合理：任务拆分有没有重复或空白，工具调用是否有效，主 Agent 是否在新证据出现后调整了计划。',
      'Anthropic 使用小样本人工评审，并把事实、引用、完整性、来源质量和工具效率放进评估标准。这里的重点是建立可解释的质量信号。',
      '如果只给最终答案打分，系统可能靠高成本碰巧得到好结果；如果只要求固定轨迹，又会惩罚合理的新路径。',
      '更稳妥的做法是把结果标准和过程护栏分开。结果必须达标，过程则允许多种路径，但要留下可审查证据。',
      '对自己的系统，可以从十个真实问题开始。记录单 Agent 基线、答案质量、token、耗时和失败类型，再决定是否扩大并行。',
      '本章小节。第一，先评估事实、引用和覆盖度。',
      '第二，允许动态路径，但过程要可解释。',
      '第三，用真实基线判断并行是否值得。',
    ],
    [
      '研究演示能跑通，不代表多 Agent 系统已经能在生产中稳定恢复。',
      '每个子 Agent 都可能超时、工具报错或返回空结果。主 Agent 需要保存任务状态，让失败只重跑受影响的路径。',
      '检查点至少记录任务、负责人、当前状态、证据位置和下一步。这样进程重启后不必从头搜索，也不会把旧结果误当成新结果。',
      '可观测性要穿过整个树。为每次委派、工具调用、重试和汇总保留 trace，才能分清是搜索失败、协调失败还是合并失败。',
      '发布也要渐进。Anthropic 提到彩虹部署，让新旧版本同时运行，避免正在执行的 Agent 因代码切换而中断。',
      '当前架构还有一个同步瓶颈：主 Agent 等所有子 Agent 返回后再继续。异步能够更快，但会引入优先级、并发和结果合并的新复杂度。',
      '因此生产清单是状态持久化、路径级重试、端到端追踪、渐进发布和明确停止规则。速度只是最后的结果，不是唯一目标。',
      '本章小节。第一，把状态和证据写出进程。',
      '第二，只重试失败路径，并保留完整 trace。',
      '第三，用渐进发布和停止规则保护生产。',
    ],
    [
      '把决策树串起来：先问路径能否独立，再问上下文是否吃紧，然后确认结果价值能覆盖成本。通过之后，才进入委派、力度、评估和恢复。',
      '如果任务共享状态很重，或者一个 Agent 已能稳定完成，就保留单 Agent。多 Agent 是一种任务架构，不是能力勋章。',
      '下一次做深度研究时，先画出三条候选路径，并给每条写一行目标、来源、输出和停止条件。能独立推进，再开并行；不能，就让一个 Agent 继续做完。',
      '关注 Tiny Agent，成为更擅长使用 AI 的人！',
    ],
  ],
  screens: [
    ['一个 Agent 什么时候不够用', 'Anthropic 的多 Agent 边界', '90.2% 是内部研究评测', '单 Agent / 多 Agent 决策树', '高价值内容先收藏'],
    ['先判断能不能拆', '研究天然有多条路径', '子 Agent 压缩高信号', '共享状态重，不适合拆', '多 Agent 约 15 倍 token', '只为高价值任务扩张', '三个适配门', '路径必须独立', '共享状态越重越谨慎', '价值覆盖成本'],
    ['主 Agent 负责拆分', '目标与输出要具体', '指定工具和原始来源', '写清不要重复什么', '委派五要素', '两轮收敛策略', '回收证据和未知项', '目标与输出明确', '工具来源边界齐全', '不只回收结论'],
    ['按复杂度分档', '简单事实：1 个 Agent', '比较任务：2 到 4 个', '复杂研究：可超 10 个', 'Agent 内也能并行工具', '复杂查询最多快 90%', '轻量 / 比较 / 深挖', '复杂度决定力度', '收益来自等待重叠', '边际收益下降就停'],
    ['评估动态路径', '先看事实与引用', '再看拆分与工具效率', '人工评审质量信号', '别只看最终分数', '结果标准与过程护栏分开', '先做十题真实基线', '评事实引用覆盖', '过程必须可解释', '用基线判断价值'],
    ['生产系统要能恢复', '失败只重跑一条路径', '检查点保存工作状态', 'trace 穿过整棵树', '彩虹部署保护运行中任务', '同步瓶颈仍然存在', '五项生产清单', '状态写出进程', '路径级重试与 trace', '渐进发布保护生产'],
    ['先适配，再并行', '单 Agent 仍是好答案', '四字段路径卡', '关注 Tiny Agent'],
  ],
};

const en = {
  locale: 'en-US',
  voice: 'en-US-ChristopherNeural',
  rate: '+30%',
  scriptFile: 'SCRIPT.en-US.md',
  outputName: `${runKey}-multi-agent-decision-longform.en-US.mp4`,
  projectTitle: 'When Multiple AI Agents Should Work in Parallel',
  hookQuestion: 'How should AI Agents research in parallel?',
  hookLines: ['How should', 'AI Agents', 'research in', 'parallel?'],
  firstSentence: 'How should AI Agents research in parallel? First, test task fit.',
  fixedValueSentence: 'This video is packed with practical value to help you become better at using AI. It is a longer episode, so follow and save it for later.',
  fixedOutroCta: 'Follow Tiny Agent and become better at using AI!',
  chapterLabels: ['Introduction', 'Pass the fit gate', 'Write a delegation contract', 'Size the effort', 'Evaluate quality', 'Build for recovery', 'Summary'],
  paragraphs: [
    [
      'How should AI Agents research in parallel? First, test task fit.',
      'Anthropic draws a useful boundary in its multi-agent research retrospective. Parallelism expands search breadth, but the coordination cost is worthwhile only when independent paths, a valuable result, and enough room for tool use appear together.',
      'In Anthropic’s internal research evaluation, an Opus 4 lead agent with Sonnet 4 subagents outperformed a single Opus 4 agent by 90.2 percent. That number belongs to one internal evaluation, not a promise for every task.',
      'In this episode, we will build a single-versus-multi-agent decision tree. We will test fit, define delegation, size the search, evaluate evidence, and add the recovery controls a production system needs.',
      'This video is packed with practical value to help you become better at using AI. It is a longer episode, so follow and save it for later.',
    ],
    [
      'The first move is not adding agents. It is deciding whether the problem contains independent exploration paths that deserve parallel work.',
      'Research often fits because an answer may require several directions. Market, technology, user, and risk research can proceed separately before the lead agent compresses them into one conclusion.',
      'Subagents also help when one context window would otherwise hold too many sources, tool results, and working hypotheses. Each path can return a compact, high-signal research summary.',
      'But decomposition creates synchronization when every step depends on the exact state produced by the previous step. Many coding tasks share one codebase and test state, so one continuous agent may fit better.',
      'Economics matters too. In Anthropic’s usage data, agents used about four times the tokens of chat interactions, while multi-agent systems used about fifteen times as many.',
      'That makes multi-agent work sensible for valuable outcomes, expensive mistakes, or questions where search breadth can materially change the answer. It should not add ceremony to a simple request.',
      'Turn the decision into three gates. Can paths run independently? Is one context becoming overloaded? Can the value of the result cover the extra cost? The more gates pass, the stronger the case for parallelism.',
      'Chapter recap. First, look for paths that can progress independently.',
      'Second, be cautious when the task depends on heavily shared state.',
      'Third, reserve the higher cost for high-value outcomes.',
    ],
    [
      'After the fit gate, the lead agent’s main job is not searching. It is dividing the question into assignments that do not overlap and do not leave gaps.',
      'Every delegation should name an objective and the expected output. Instead of saying research competitors, ask for pricing, target users, and verifiable sources for three named products.',
      'Then declare the allowed tools and source boundary. Naming search, browsing, or databases and prioritizing primary sources keeps subagents from wandering through weak material.',
      'Tell each subagent what not to do as well. Covered regions, time ranges, and result formats should be explicit, or several agents may return the same evidence.',
      'Anthropic describes effective delegation through the objective, output format, tools, sources, and task boundaries. The lead agent should still revise assignments when the first findings change the map.',
      'Broad first and narrow second is often effective. Run a parallel scan for leads, then deepen only the branches that can change the final judgment.',
      'Collect more than conclusions. Require evidence links, important uncertainties, and the reason a path stopped, so the lead agent can decide which findings are safe to merge.',
      'Chapter recap. First, make the objective and output explicit.',
      'Second, specify sources, tools, and boundaries together.',
      'Third, collect evidence and uncertainty, not conclusions alone.',
    ],
    [
      'Multi-agent does not mean more is always better. Search effort should scale with both question complexity and expected value.',
      'Anthropic’s examples suggest that a simple fact may need one agent and three to ten tool calls. That scale does not require another coordination layer.',
      'A comparison across several targets may use two to four agents, with roughly ten to fifteen tool calls per agent, so each research path reaches useful depth.',
      'Complex research may use more than ten subagents, but that is not a default. The lead agent must see progress, detect duplication, and stop when marginal value falls.',
      'Tool calls can also run in parallel inside one subagent. Anthropic suggests that complex paths often use three to five subagents, with three or more tools running concurrently per agent.',
      'When paths are truly independent, parallel work can cut time by as much as 90 percent on complex queries. The gain comes from overlapping waits, not from making each agent inherently smarter.',
      'Give the decision tree three effort tiers: light, comparison, and deep research. Each tier defines agent count, tool budget, stopping conditions, and the evidence required to escalate.',
      'Chapter recap. First, choose an effort tier from task complexity.',
      'Second, parallel gains come from overlapping independent waits.',
      'Third, stop expanding when marginal value starts to fall.',
    ],
    [
      'Multi-agent paths change dynamically, so evaluation cannot require one fixed sequence of steps.',
      'Start with the result. Are the facts correct? Do citations support the claims? Is the question covered? Are the sources authoritative enough for the decision?',
      'Then inspect whether the process was reasonable. Did the decomposition leave gaps or duplication? Were tool calls useful? Did the lead agent revise its plan when new evidence appeared?',
      'Anthropic uses small-sample human review and criteria for factual accuracy, citations, completeness, source quality, and tool efficiency. The point is to create quality signals people can explain.',
      'If you score only the final answer, a system may get lucky through expensive searching. If you demand one fixed trace, you punish reasonable paths that react to evidence.',
      'A stronger design separates outcome standards from process guardrails. The outcome must pass, while the path may vary as long as it leaves evidence that a reviewer can inspect.',
      'Start with ten real questions for your own system. Compare a single-agent baseline, answer quality, tokens, latency, and failure types before expanding parallel work.',
      'Chapter recap. First, evaluate facts, citations, and coverage.',
      'Second, allow dynamic paths but require an explainable process.',
      'Third, use a real baseline to decide whether parallelism pays.',
    ],
    [
      'A research demo that finishes once is not yet a multi-agent system that can recover reliably in production.',
      'Any subagent can time out, lose a tool, or return an empty result. Persist task state so a failure reruns only the affected path instead of restarting the whole tree.',
      'A useful checkpoint records the assignment, owner, current state, evidence location, and next action. After a process restart, the system can resume without treating old output as new evidence.',
      'Observability must cross the whole tree. Trace every delegation, tool call, retry, and synthesis step so you can distinguish search failure, coordination failure, and merge failure.',
      'Deployment should be gradual too. Anthropic describes rainbow deployments that keep old and new versions available so agents already running are not broken by a code change.',
      'The current architecture also has a synchronous bottleneck: the lead agent waits for all subagents before moving on. Async work can be faster, but it adds scheduling, concurrency, and result-merging complexity.',
      'The production checklist is persistent state, path-level retries, end-to-end tracing, gradual deployment, and explicit stopping rules. Speed is an outcome of reliability, not the only goal.',
      'Chapter recap. First, persist state and evidence outside the process.',
      'Second, retry only the failed path and preserve the full trace.',
      'Third, protect production with gradual releases and stopping rules.',
    ],
    [
      'Now connect the decision tree. Ask whether paths are independent, whether one context is overloaded, and whether the result can justify the cost. Only then move into delegation, effort sizing, evaluation, and recovery.',
      'Keep a single agent when the task depends on shared state or one agent already completes it reliably. Multi-agent is a task architecture, not a badge of capability.',
      'Before your next deep-research job, draw three candidate paths. Give each one an objective, source boundary, output, and stopping condition. Run them in parallel only if they can truly progress independently.',
      'Follow Tiny Agent and become better at using AI!',
    ],
  ],
  screens: [
    ['When one agent is not enough', 'Anthropic’s multi-agent boundary', '90.2% was an internal evaluation', 'Single vs. multi-agent decision tree', 'Save this high-value guide'],
    ['Test whether the task can split', 'Research has parallel paths', 'Subagents compress signal', 'Shared state resists splitting', 'Multi-agent used about 15x tokens', 'Scale only for valuable work', 'The three fit gates', 'Paths must be independent', 'Shared state demands caution', 'Value must cover cost'],
    ['The lead agent decomposes', 'Make objectives and outputs concrete', 'Name tools and primary sources', 'Prevent duplicated coverage', 'The five delegation fields', 'Broad first, narrow second', 'Return evidence and uncertainty', 'Objective and output', 'Tools, sources, and boundaries', 'Collect more than conclusions'],
    ['Scale effort with complexity', 'Simple fact: one agent', 'Comparison: two to four agents', 'Deep research: more than ten', 'Parallel tools inside each agent', 'Up to 90% faster on complex queries', 'Light / compare / deep', 'Complexity sets effort', 'Overlap creates the gain', 'Stop at falling marginal value'],
    ['Evaluate dynamic paths', 'Check facts and citations first', 'Then inspect decomposition and tools', 'Human-reviewed quality signals', 'Do not score only the answer', 'Separate outcomes from guardrails', 'Ten-question baseline', 'Facts, citations, coverage', 'Keep the process explainable', 'Use a baseline to judge value'],
    ['Production must recover', 'Retry only one failed path', 'Checkpoints preserve work state', 'Trace the entire tree', 'Rainbow deployment protects live work', 'A synchronous bottleneck remains', 'The five production controls', 'Persist state outside the process', 'Path retries and full tracing', 'Gradual releases protect production'],
    ['Fit before parallelism', 'A single agent is still a good answer', 'The four-field path card', 'Follow Tiny Agent'],
  ],
};

const layouts = {
  'c01-p01': 'agent-prop', 'c01-p02': 'human-agent-prop', 'c01-p03': 'generated', 'c01-p04': 'agent-center', 'c01-p05': 'human-agent-prop',
  'c02-p01': 'chapter-intro', 'c02-p02': 'big-text', 'c02-p03': 'generated', 'c02-p04': 'two-props', 'c02-p05': 'agent-center', 'c02-p06': 'human-prop', 'c02-p07': 'generated',
  'c03-p01': 'chapter-intro', 'c03-p02': 'human-prop', 'c03-p03': 'agent-prop', 'c03-p04': 'generated', 'c03-p05': 'human-agent-prop', 'c03-p06': 'two-props', 'c03-p07': 'generated',
  'c04-p01': 'chapter-intro', 'c04-p02': 'two-props', 'c04-p03': 'generated', 'c04-p04': 'human-prop', 'c04-p05': 'agent-prop', 'c04-p06': 'big-text', 'c04-p07': 'generated',
  'c05-p01': 'chapter-intro', 'c05-p02': 'big-text', 'c05-p03': 'human-agent-prop', 'c05-p04': 'generated', 'c05-p05': 'agent-center', 'c05-p06': 'human-prop', 'c05-p07': 'generated',
  'c06-p01': 'chapter-intro', 'c06-p02': 'human-prop', 'c06-p03': 'agent-prop', 'c06-p04': 'generated', 'c06-p05': 'human-agent-prop', 'c06-p06': 'two-props', 'c06-p07': 'agent-center',
  'c07-p01': 'human-agent-prop', 'c07-p02': 'two-props', 'c07-p03': 'agent-center', 'c07-p04': 'agent-prop',
};

const generatedArt = {
  'c01-p03': 'multi-agent-paths.png',
  'c02-p03': 'multi-agent-paths.png',
  'c02-p07': 'multi-agent-delegation.png',
  'c03-p04': 'multi-agent-delegation.png',
  'c03-p07': 'multi-agent-paths.png',
  'c04-p03': 'multi-agent-paths.png',
  'c04-p07': 'multi-agent-delegation.png',
  'c05-p04': 'multi-agent-reliability.png',
  'c05-p07': 'multi-agent-paths.png',
  'c06-p04': 'multi-agent-reliability.png',
};

const motions = {
  'c01-p02': 'press-pulse', 'c01-p03': 'spring-pop', 'c01-p04': 'nudge', 'c01-p05': 'split-tilt',
  'c02-p02': 'fly-in', 'c02-p03': 'spin-in', 'c02-p04': 'sine-float', 'c02-p05': 'press-pulse', 'c02-p06': 'spring-pop', 'c02-p07': 'nudge',
  'c03-p02': 'split-tilt', 'c03-p03': 'fly-in', 'c03-p04': 'spin-in', 'c03-p05': 'sine-float', 'c03-p06': 'press-pulse', 'c03-p07': 'spring-pop',
  'c04-p02': 'nudge', 'c04-p03': 'split-tilt', 'c04-p04': 'fly-in', 'c04-p05': 'spin-in', 'c04-p06': 'sine-float', 'c04-p07': 'press-pulse',
  'c05-p02': 'spring-pop', 'c05-p03': 'nudge', 'c05-p04': 'split-tilt', 'c05-p05': 'fly-in', 'c05-p06': 'spin-in', 'c05-p07': 'sine-float',
  'c06-p02': 'press-pulse', 'c06-p03': 'spring-pop', 'c06-p04': 'nudge', 'c06-p05': 'split-tilt', 'c06-p06': 'fly-in', 'c06-p07': 'spin-in',
  'c07-p01': 'sine-float', 'c07-p02': 'press-pulse', 'c07-p03': 'spring-pop',
};

const humanPoses = {
  'c01-p02': 'review-front', 'c01-p05': 'write-front', 'c02-p01': 'review-front', 'c02-p06': 'present-right',
  'c03-p01': 'operate-right', 'c03-p02': 'explain-front', 'c03-p05': 'present-right',
  'c04-p01': 'explain-front', 'c04-p04': 'present-right',
  'c05-p01': 'write-front', 'c05-p03': 'present-right', 'c05-p06': 'explain-front',
  'c06-p01': 'decide-front', 'c06-p02': 'present-right', 'c06-p05': 'explain-front', 'c07-p01': 'present-right',
};

const secondProps = {
  'c02-p04': 'dependency',
  'c03-p06': 'citation',
  'c04-p02': 'timer',
  'c06-p06': 'shield',
  'c07-p02': 'target',
};

const props = [
  ['question', 'parallel-agents', 'evidence', 'branch', 'task-list'],
  ['branch', 'parallel-agents', 'summary', 'dependency', 'timer', 'target', 'checklist', 'branch', 'dependency', 'target'],
  ['workflow', 'target', 'tool', 'task-list', 'branch', 'search', 'evidence', 'target', 'tool', 'evidence'],
  ['scorecard', 'single-agent', 'compare', 'parallel-agents', 'tool', 'timer', 'ruler', 'scorecard', 'timer', 'stop'],
  ['checklist', 'evidence', 'workflow', 'scorecard', 'warning', 'shield', 'experiment', 'evidence', 'workflow', 'experiment'],
  ['shield', 'error', 'progress', 'dashboard', 'branch', 'queue', 'checklist', 'progress', 'dashboard', 'shield'],
  ['route', 'single-agent', 'task-list', 'success'],
];

const agents = [
  ['ask-front', 'present-left', 'evaluate-front', 'plan-front', 'handoff-left'],
  ['present-left', 'plan-front', 'store-memory', 'blocked-front', 'evaluate-front', 'reason-front', 'plan-front', 'plan-front', 'evaluate-front', 'verify-front'],
  ['delegate-front', 'plan-front', 'receive-tool', 'delegate-front', 'monitor-left', 'search', 'verify-front', 'plan-front', 'receive-tool', 'verify-front'],
  ['present-left', 'evaluate-front', 'compare-front', 'delegate-front', 'receive-tool', 'monitor-left', 'plan-front', 'evaluate-front', 'monitor-left', 'blocked-front'],
  ['present-left', 'verify-front', 'evaluate-front', 'evaluate-front', 'alert-front', 'verify-front', 'plan-front', 'verify-front', 'evaluate-front', 'plan-front'],
  ['present-left', 'retry-front', 'store-memory', 'monitor-left', 'handoff-left', 'wait-front', 'verify-front', 'store-memory', 'monitor-left', 'verify-front'],
  ['plan-front', 'evaluate-front', 'write-front', 'celebrate-front'],
];

function buildVisuals(data) {
  return Object.fromEntries(data.chapterLabels.map((label, chapterIndex) => [
    label,
    data.screens[chapterIndex].map((screen, paragraphIndex) => {
      const isRecap = chapterIndex >= 1 && chapterIndex <= 5 && paragraphIndex >= 7;
      const type = chapterIndex >= 1 && chapterIndex <= 5 && paragraphIndex === 0
        ? 'chapter-intro'
        : isRecap
          ? 'recap'
          : chapterIndex === 0 && paragraphIndex === 0
            ? 'hook'
            : chapterIndex === 0 && paragraphIndex === 1
              ? 'authority'
              : chapterIndex === 0 && paragraphIndex === 4
                ? 'promise'
                : chapterIndex === 6 && paragraphIndex === 3
                  ? 'outro'
                  : 'generic';
      return [screen, props[chapterIndex][paragraphIndex], agents[chapterIndex][paragraphIndex], screen, type];
    }),
  ]));
}

function scriptText(data) {
  return data.chapterLabels.map((label, index) => (
    `### ${index + 1} | ${label}\n\n${data.paragraphs[index].join('\n\n')}`
  )).join('\n\n');
}

function makeContentMap(data) {
  const factText = data.locale === 'zh-CN'
    ? [
      'Anthropic 的内部研究评测中，Opus 4 主 Agent 配合 Sonnet 4 子 Agent，比单个 Opus 4 高出 90.2%。',
      'Anthropic 使用数据中，单 Agent 约为普通聊天 4 倍 token，多 Agent 约为 15 倍。',
      '复杂查询在独立路径并行时，耗时最多可下降 90%。',
      '共享上下文和依赖很重的任务，包括许多编码任务，通常不适合并行拆分。',
    ]
    : [
      'In Anthropic’s internal research evaluation, an Opus 4 lead with Sonnet 4 subagents outperformed single-agent Opus 4 by 90.2 percent.',
      'Anthropic usage data reports about four times chat tokens for agents and about fifteen times for multi-agent systems.',
      'Complex queries can take up to 90 percent less time when independent paths run in parallel.',
      'Tasks with heavy shared context or dependencies, including many coding tasks, often fit a single agent better.',
    ];
  const priorities = data.locale === 'zh-CN'
    ? {
      P0: ['先做适配判断', '独立路径才并行', '高价值结果覆盖成本'],
      P1: ['委派契约', '力度分档', '证据与过程评估'],
      P2: ['检查点与 trace', '同步瓶颈'],
      P3: ['把 Agent 数量当成绩', '默认并行'],
    }
    : {
      P0: ['Test fit first', 'Parallelize only independent paths', 'Value must cover cost'],
      P1: ['Delegation contract', 'Effort tiers', 'Evidence and process evaluation'],
      P2: ['Checkpoints and tracing', 'Synchronous bottleneck'],
      P3: ['Treating agent count as success', 'Parallelism by default'],
    };
  return {
    bilingualContractId: contractId,
    source: {
      publisher: 'Anthropic',
      title: 'How we built our multi-agent research system',
      published: '2025-06-13',
      url: sourceUrl,
      facts: factText,
    },
    centralThesis: data.locale === 'zh-CN'
      ? '多 Agent 不是默认升级，而是一项适配度与经济性决策：只有高价值任务能拆成独立路径，且单个上下文与工具空间已成为瓶颈时，并行才值得。'
      : 'Multi-agent is not a default upgrade but a fit-and-economics decision: parallelism pays when a valuable task splits into independent paths and one context or tool budget becomes the bottleneck.',
    priorities,
    reusableArtifact: data.locale === 'zh-CN'
      ? '单 Agent / 多 Agent 决策树：独立路径、上下文压力、结果价值、委派契约、力度档位、评估与恢复。'
      : 'Single-vs-multi-agent decision tree: independent paths, context pressure, result value, delegation contract, effort tier, evaluation, and recovery.',
    chapters: data.chapterLabels.slice(1, 6).map((title, index) => ({
      id: chapters[index + 1].id,
      title,
      promise: data.paragraphs[index + 1][0],
      recaps: data.paragraphs[index + 1].slice(-3).map((narration, recapIndex) => ({
        narration,
        screenText: data.screens[index + 1][7 + recapIndex],
      })),
    })),
    factBoundaries: data.locale === 'zh-CN'
      ? [
        '90.2% 是 Anthropic 内部研究评测结果，不是通用性能承诺。',
        '4 倍与 15 倍 token 是 Anthropic 报告的使用模式，不代表所有实现的固定成本。',
        'Agent 数量与工具调用范围是其研究系统的经验示例，不是强制配置。',
      ]
      : [
        'The 90.2 percent result is an internal Anthropic research evaluation, not a universal performance promise.',
        'The four-times and fifteen-times token figures describe Anthropic usage patterns, not fixed costs for every implementation.',
        'Agent counts and tool-call ranges are examples from Anthropic’s research system, not mandatory settings.',
      ],
    inference: data.locale === 'zh-CN'
      ? '单 Agent / 多 Agent 决策树是对来源的实践化整理，不是 Anthropic 发布的官方模板。'
      : 'The single-vs-multi-agent decision tree is an applied synthesis of the source, not an official Anthropic template.',
  };
}

function makeEpisode(data) {
  return {
    locale: data.locale,
    projectTitle: data.projectTitle,
    sourceAttribution: {
      publisher: 'Anthropic',
      title: 'How we built our multi-agent research system',
      url: sourceUrl,
    },
    scriptFile: data.scriptFile,
    outputName: data.outputName,
    voice: data.voice,
    rate: data.rate,
    bilingualContractId: contractId,
    hookQuestion: data.hookQuestion,
    hookLines: data.hookLines,
    openingAccentTokens: data.locale === 'zh-CN'
      ? [
        { token: 'AI Agent', tone: 'identity' },
        { token: '并行', tone: 'topic' },
        { token: '什么时候', tone: 'risk' },
      ]
      : [
        { token: 'AI Agents', tone: 'identity' },
        { token: 'parallel', tone: 'topic' },
        { token: 'How', tone: 'risk' },
      ],
    firstSentence: data.firstSentence,
    openingHookReview: {
      visibleQuestion: data.hookQuestion,
      intent: 'trade-off',
      audiencePainPoint: data.locale === 'zh-CN'
        ? '团队容易把多 Agent 当作默认升级，忽略任务依赖、token 成本和恢复复杂度。'
        : 'Teams may treat multi-agent as a default upgrade while ignoring task dependencies, token cost, and recovery complexity.',
      knowledgeGap: data.locale === 'zh-CN'
        ? '观众需要一个能判断何时并行、如何委派、怎样评估和兜底的具体框架。'
        : 'Viewers need a concrete framework for when to parallelize, how to delegate, and how to evaluate and recover.',
      curiosityRationale: data.locale === 'zh-CN'
        ? '问题直接询问决策阈值，但把三个适配门和完整决策树留到后续章节展开。'
        : 'The question names the decision threshold directly while leaving the three fit gates and full tree for the episode.',
      directTopicTerms: data.locale === 'zh-CN' ? ['AI Agent', '并行工作'] : ['AI Agents', 'parallel'],
      viewerValue: data.locale === 'zh-CN'
        ? '观众将拿到一张单 Agent / 多 Agent 决策树，并学会判断成本、委派、评估与恢复。'
        : 'Viewers will get a single-vs-multi-agent decision tree covering cost, delegation, evaluation, and recovery.',
      topicAlignmentRationale: data.locale === 'zh-CN'
        ? '视频实际分析多 Agent 研究系统的适配、委派、力度、评估与生产边界，开场直接点名相同问题。'
        : 'The episode analyzes fit, delegation, effort, evaluation, and production boundaries for multi-agent research, matching the opening question.',
      tangentialSetupRisk: 'none',
      obviousAnswerRisk: 'none',
      rejectedObviousQuestion: data.locale === 'zh-CN' ? '多 Agent 更强吗？' : 'Are more agents always better?',
    },
    chinesePronunciationReview: {
      reviewed: true,
      entries: [],
    },
    chineseMandarinProsodyReview: {
      reviewed: true,
      method: '逐句检查普通话意群；逗号、顿号、冒号和分号仅作为句内自然短停顿，不作为 TTS 切段边界。',
      approvedSentenceTerminators: ['。', '！', '？', '!', '?'],
      forbiddenTtsSegmentBoundaryPunctuation: ['，', '、', '：', '；', ',', ':', ';'],
    },
    fixedValueSentence: data.fixedValueSentence,
    fixedOutroCta: data.fixedOutroCta,
    coverAlt: data.locale === 'zh-CN'
      ? 'Tiny Agent 判断一个研究问题何时该交给多个 AI Agent 并行处理'
      : 'Tiny Agent deciding when multiple AI Agents should research in parallel',
    promise: {
      label: data.locale === 'zh-CN' ? '先收藏' : 'Save it',
      strong: data.locale === 'zh-CN' ? '留下单 Agent / 多 Agent 决策树' : 'Keep the single-vs-multi-agent decision tree',
      action: data.locale === 'zh-CN' ? '先适配，再并行' : 'Fit first, then parallelize',
    },
    outro: {
      title: 'Tiny Agent',
      lines: [data.locale === 'zh-CN' ? '成为更擅长使用 AI 的人！' : 'Become better at using AI!'],
    },
    visuals: buildVisuals(data),
    generatedArt,
    layouts,
    motions,
    humanPoses,
    secondProps,
  };
}

function updatePackage(directory, data) {
  const packagePath = path.join(directory, 'package.json');
  const current = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  current.name = `${runKey}-${slug}-${data.locale.toLowerCase()}`;
  current.scripts = {
    tts: 'node build.mjs --tts',
    build: 'node build.mjs --compile',
    'check:transitions': 'node qa/check-production.mjs transitions',
    'check:semantics': 'node qa/check-production.mjs semantics',
    'check:balance': 'node qa/check-production.mjs balance',
    check: 'pnpm dlx hyperframes@0.7.76 check . --snapshots --frame-check=severity=error',
    render: `pnpm dlx hyperframes@0.7.76 render . --quality high --strict --quiet --workers 1 --low-memory-mode --video-bitrate 8M --output renders/${data.outputName}`,
  };
  writeJson(directory, 'package.json', current);
}

function writeProject(directory, data) {
  writeText(directory, data.scriptFile, scriptText(data));
  writeJson(directory, 'episode.json', makeEpisode(data));
  writeJson(directory, 'content-map.json', makeContentMap(data));
  writeJson(directory, 'bilingual-content-contract.json', contract);
  writeText(directory, 'source.md', `# Source\n\n- Publisher: Anthropic\n- Title: How we built our multi-agent research system\n- Published: 2025-06-13\n- Canonical URL: ${sourceUrl}\n\n## Evidence boundary\n\n${makeContentMap(data).factBoundaries.map((item) => `- ${item}`).join('\n')}\n`);
  writeText(directory, 'BRIEF.md', `# ${data.projectTitle}\n\n- Audience: people deciding whether to build a multi-agent research workflow\n- Purpose: explain the fit gate and deliver a reusable single-vs-multi-agent decision tree\n- Format: 1920x1080, 30 fps, five to eight minutes, ${data.locale}\n- Source: ${sourceUrl}\n- Visual invariant: one current-topic Tiny Agent hero, paper-gray grid, blue identity accent, yellow decision highlight\n- Motion: seek-safe hard cuts plus the seven approved deterministic motion types\n- Audio: ${data.voice} at ${data.rate}, final VTT is timing authority\n`);
  const metadata = data.locale === 'zh-CN'
    ? {
      locale: 'zh-CN',
      title: data.projectTitle,
      thumbnailText: 'AI Agent 什么时候该并行工作？',
      primaryKeyword: 'AI Agent 并行',
      secondaryKeywords: ['多 Agent 系统', 'AI Agent 研究', 'Agent 编排', '多智能体'],
      hashtags: ['#AIAgent', '#多智能体', '#人工智能', '#TinyAgent'],
      coverTitleContract: {
        coreCoverKeywords: ['AI Agent', '并行'],
        metadataKeywordGroups: [
          { coverKeyword: 'AI Agent', titleTerms: ['AI Agent', '多个 AI Agent'] },
          { coverKeyword: '并行', titleTerms: ['并行'] },
        ],
        topicAction: '判断研究任务何时值得交给多个 AI Agent 并行处理',
      },
      source: {
        publisher: 'Anthropic',
        title: 'How we built our multi-agent research system',
        url: sourceUrl,
      },
      description: `什么时候该让多个 AI Agent 并行工作？本期用一张单 Agent / 多 Agent 决策树，拆解适配门、委派契约、搜索力度、证据评估和生产恢复。\n\n你会学到：\n- 如何判断任务是否真的适合并行\n- 如何写清委派契约并分配搜索力度\n- 如何评估证据并为失败恢复留出控制点\n\n章节：\n00:00 什么时候该让多个 AI Agent 并行工作？\n00:42 先过适配门\n01:49 写好委派契约\n02:53 按任务分配算力\n03:56 用结果和过程评估\n04:58 为并行系统兜底\n06:04 总结\n\n关注 Tiny Agent，成为更擅长使用 AI 的人！\n\n#AIAgent #多智能体 #人工智能 #TinyAgent`,
    }
    : {
      locale: 'en-US',
      title: data.projectTitle,
      titleCandidates: [
        data.projectTitle,
        'When One AI Agent Is Not Enough for Research',
        'How to Choose Between One AI Agent and Multiple AI Agents',
      ],
      language: 'en-US',
      thumbnailFile: 'thumbnails/thumbnail.en-US.png',
      thumbnailText: 'WHEN AI AGENTS SHOULD WORK IN PARALLEL',
      primaryKeyword: 'multi-agent research',
      secondaryKeywords: ['AI agent orchestration', 'parallel AI agents', 'multi-agent systems', 'Anthropic research'],
      tags: ['multi-agent research', 'AI agents', 'agent orchestration', 'parallel research', 'Tiny Agent'],
      hashtags: ['#AIAgents', '#MultiAgent', '#ArtificialIntelligence', '#TinyAgent'],
      coverTitleContract: {
        coreCoverKeywords: ['AI Agents', 'parallel'],
        metadataKeywordGroups: [
          { coverKeyword: 'AI Agents', titleTerms: ['AI Agent', 'AI Agents'] },
          { coverKeyword: 'parallel', titleTerms: ['Parallel', 'parallel'] },
        ],
        topicAction: 'decide when a research task should run across multiple AI Agents in parallel',
      },
      source: {
        publisher: 'Anthropic',
        title: 'How we built our multi-agent research system',
        url: sourceUrl,
      },
      description: `How should AI Agents research in parallel—and when is one agent the better choice? This episode builds a practical single-vs-multi-agent decision tree for fit, delegation, effort sizing, evaluation, and production recovery.\n\nYou’ll learn:\n- How to test task fit before adding agents\n- How to write a delegation contract and size search effort\n- How to evaluate evidence and design recovery controls\n\nChapters:\n00:00 How Should AI Agents Research in Parallel?\n00:42 Pass the Fit Gate\n01:49 Write a Delegation Contract\n02:53 Size the Effort\n03:56 Evaluate Quality\n04:58 Build for Recovery\n06:04 Summary\n\nFollow Tiny Agent. Tiny Agent helps you get better at using AI.\n\n#AIAgents #MultiAgent #ArtificialIntelligence #TinyAgent`,
      youtube: {
        visibility: 'public',
        selfDeclaredMadeForKids: 'no',
        playlistId: 'PLJffvaWRvGC8',
        playlistTitle: 'AI Agents: From Chat to Done',
        playlistPrivacyStatus: 'public',
      },
    };
  writeJson(directory, `publish-metadata.${data.locale}.json`, metadata);
  updatePackage(directory, data);
}

writeProject(zhDir, zh);
writeProject(enDir, en);

const contractText = fs.readFileSync(path.join(zhDir, 'bilingual-content-contract.json'));
fs.writeFileSync(path.join(enDir, 'bilingual-content-contract.json'), contractText);

const identityAnchors = [
  'white rounded body',
  'black face screen',
  'blue eyes and antenna',
  'brown tool belt',
  'hand-drawn outline',
];

function heroSpec({ asset, locale, action }) {
  return {
    asset,
    source: `imagegen-current-episode-${runKey}; chroma-key alpha removal`,
    delivery: 'chroma-key alpha removal',
    characterCount: 1,
    tinyAgentCharacterCount: 1,
    humanCharacterCount: 0,
    secondaryAgentCharacterCount: 0,
    identityAnchors,
    integratedTopicAction: action,
    bilingualActionId: coverActionId,
    generatedIllustrationText: false,
    locale,
  };
}

const coverPalette = {
  agentIdentity: '#117ABD',
  remainingTitle: '#111413',
  decorativeRule: '#F4C542',
};

function writeCovers() {
  const zhThumbnailDir = path.join(zhDir, 'thumbnails');
  const enThumbnailDir = path.join(enDir, 'thumbnails');
  const zhHero = fs.readFileSync(path.join(zhThumbnailDir, 'cover-hero.png'));
  const enHero = fs.readFileSync(path.join(enThumbnailDir, 'cover-hero.png'));
  for (const name of [
    'generated-hero.zh-CN.16x9.png',
    'generated-hero.zh-CN.4x3.png',
    'generated-hero.zh-CN.4x3.title-dense.png',
    'generated-hero.zh-CN.3x4.png',
    'generated-hero.zh-CN.3x4.title-dense.png',
  ]) fs.writeFileSync(path.join(zhThumbnailDir, name), zhHero);
  fs.writeFileSync(path.join(enThumbnailDir, 'generated-hero.en-US.png'), enHero);

  const zhAction = '判断研究任务何时值得交给多个 AI Agent 并行处理';
  const enAction = 'decide when a research task should run across multiple AI Agents in parallel';
  const geometryProfileId = 'tiny-agent-bilingual-cover-16x9-parity-2026-07-27';
  writeJson(zhDir, 'thumbnails/thumbnail-spec.zh-CN.16x9.json', {
    version: 4,
    locale: 'zh-CN',
    referenceLayout: '2026-07-23-approved-title-hero',
    referenceSvg: 'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/thumbnails/thumbnail.zh-CN.svg',
    bilingualGeometryProfileId: geometryProfileId,
    headline: 'AI Agent 什么时候该并行工作？',
    titleLines: ['AI Agent', '什么时候', '该并行工作？'],
    requiredCoverKeywords: ['AI Agent', '并行'],
    composition: 'text-left and right current-topic hero',
    titlePalette: coverPalette,
    auxiliaryCoverCopy: false,
    generatedIllustrationText: false,
    generatedHeroIllustration: heroSpec({
      asset: 'generated-hero.zh-CN.16x9.png',
      locale: 'zh-CN',
      action: zhAction,
    }),
  });
  writeJson(enDir, 'thumbnails/thumbnail-spec.en-US.16x9.json', {
    version: 2,
    locale: 'en-US',
    bilingualGeometryProfileId: geometryProfileId,
    headline: 'WHEN AI AGENTS SHOULD WORK IN PARALLEL',
    titleLines: ['AI AGENTS', 'WORK IN', 'PARALLEL'],
    requiredCoverKeywords: ['AI Agents', 'parallel'],
    composition: 'text-left and right current-topic hero',
    titlePalette: coverPalette,
    auxiliaryCoverCopy: false,
    generatedIllustrationText: false,
    generatedHeroIllustration: heroSpec({
      asset: 'generated-hero.en-US.png',
      locale: 'en-US',
      action: enAction,
    }),
  });
  const zhRatioBase = {
    version: 4,
    locale: 'zh-CN',
    referenceLayout: '2026-07-23-approved-title-hero',
    referenceSvg: 'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/thumbnails/thumbnail.zh-CN.svg',
    strictGeometryProfileId: 'tiny-agent-zh-cover-approved-geometry-2026-07-26',
    headline: 'AI Agent 什么时候该并行工作？',
    titleLines: ['AI Agent', '什么时候', '该并行', '工作？'],
    headlineIntent: 'question',
    headlineIntentRationale: '主标题直接询问多个 AI Agent 何时应该并行工作，补足决策动作和使用价值。',
    requiredCoverKeywords: ['AI Agent', '并行'],
    titlePalette: coverPalette,
    auxiliaryCoverCopy: false,
    generatedIllustrationText: false,
  };
  writeJson(zhDir, 'thumbnails/thumbnail-spec.zh-CN.4x3.json', {
    ...zhRatioBase,
    strictGeometryReferenceSvg: 'var/hyperframes-showcases/2026-07-26-03-agent-long-running-harness-longform-zh-CN/thumbnails/thumbnail.zh-CN.4x3.svg',
    composition: 'text-left and right current-topic hero',
    generatedHeroIllustration: heroSpec({
      asset: 'generated-hero.zh-CN.4x3.title-dense.png',
      locale: 'zh-CN',
      action: zhAction,
    }),
  });
  writeJson(zhDir, 'thumbnails/thumbnail-spec.zh-CN.3x4.json', {
    ...zhRatioBase,
    strictGeometryReferenceSvg: 'var/hyperframes-showcases/2026-07-26-03-agent-long-running-harness-longform-zh-CN/thumbnails/thumbnail.zh-CN.3x4.svg',
    composition: 'top-60-percent-title; bottom-40-percent-contained current-topic hero',
    generatedHeroIllustration: heroSpec({
      asset: 'generated-hero.zh-CN.3x4.title-dense.png',
      locale: 'zh-CN',
      action: zhAction,
    }),
  });

  writeText(zhDir, 'thumbnails/thumbnail.zh-CN.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#111413" stroke-opacity="0.09" stroke-width="1"/></pattern></defs>
  <rect width="1280" height="720" fill="#ECECEA"/><rect width="1280" height="720" fill="url(#grid)"/>
  <rect x="44" y="42" width="118" height="10" fill="#117ABD"/>
  <text x="74" y="190" font-family="Hiragino Sans GB, Arial, sans-serif" font-size="88" font-weight="800" letter-spacing="-4"><tspan fill="#117ABD">AI Agent</tspan></text>
  <text x="74" y="290" font-family="Hiragino Sans GB, Arial, sans-serif" font-size="84" font-weight="800" letter-spacing="-4" fill="#111413">什么时候</text>
  <text x="74" y="390" font-family="Hiragino Sans GB, Arial, sans-serif" font-size="84" font-weight="800" letter-spacing="-4" fill="#111413">该并行工作？</text>
  <image href="generated-hero.zh-CN.16x9.png" x="620" y="82" width="600" height="560" preserveAspectRatio="xMidYMid meet"/>
  <rect x="44" y="652" width="1192" height="12" fill="#F4C542"/>
</svg>`);
  writeText(enDir, 'thumbnails/thumbnail.en-US.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#111413" stroke-opacity="0.09" stroke-width="1"/></pattern></defs>
  <rect width="1280" height="720" fill="#ECECEA"/><rect width="1280" height="720" fill="url(#grid)"/>
  <rect x="44" y="42" width="118" height="10" fill="#117ABD"/>
  <text x="74" y="190" font-family="Hiragino Sans GB, Arial, sans-serif" font-size="82" font-weight="800" letter-spacing="-4"><tspan fill="#117ABD">AI AGENTS</tspan></text>
  <text x="74" y="290" font-family="Hiragino Sans GB, Arial, sans-serif" font-size="82" font-weight="800" letter-spacing="-4" fill="#111413">WORK IN</text>
  <text x="74" y="390" font-family="Hiragino Sans GB, Arial, sans-serif" font-size="82" font-weight="800" letter-spacing="-4" fill="#111413">PARALLEL</text>
  <image href="generated-hero.en-US.png" x="620" y="82" width="600" height="560" preserveAspectRatio="xMidYMid meet"/>
  <rect x="44" y="652" width="1192" height="12" fill="#F4C542"/>
</svg>`);
  writeText(zhDir, 'thumbnails/thumbnail.zh-CN.4x3.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs><pattern id="paper-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0L0 0 0 48" fill="none" stroke="#111413" stroke-width="1" opacity="0.035"/></pattern></defs>
  <rect width="1200" height="900" fill="#ECECEA"/><rect width="1200" height="900" fill="url(#paper-grid)"/>
  <image href="generated-hero.zh-CN.4x3.title-dense.png" x="640" y="230" width="550" height="640" preserveAspectRatio="xMidYMid meet"/>
  <rect x="38" y="28" width="176" height="14" rx="7" fill="#117ABD"/>
  <rect x="38" y="882" width="624" height="18" rx="9" fill="#F4C542"/>
  <g fill="#111413" stroke="#ECECEA" stroke-width="9" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-4">
    <text data-cover-title-line="1" x="38" y="166" font-size="132"><tspan fill="#117ABD">AI Agent</tspan></text>
    <text data-cover-title-line="2" x="38" y="348" font-size="112">什么时候</text>
    <text data-cover-title-line="3" x="38" y="550" font-size="150">该并行</text>
    <text data-cover-title-line="4" x="38" y="786" font-size="150">工作？</text>
  </g>
</svg>`);
  writeText(zhDir, 'thumbnails/thumbnail.zh-CN.3x4.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs><pattern id="paper-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0L0 0 0 48" fill="none" stroke="#111413" stroke-width="1" opacity="0.035"/></pattern></defs>
  <rect width="900" height="1200" fill="#ECECEA"/><rect width="900" height="1200" fill="url(#paper-grid)"/>
  <image href="generated-hero.zh-CN.3x4.title-dense.png" x="75" y="729" width="750" height="480" preserveAspectRatio="xMidYMid meet"/>
  <rect x="36" y="30" width="160" height="14" rx="7" fill="#117ABD"/>
  <rect x="36" y="711" width="828" height="18" rx="9" fill="#F4C542"/>
  <g fill="#111413" stroke="#ECECEA" stroke-width="9" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-4">
    <text data-cover-title-line="1" x="36" y="148" font-size="130"><tspan fill="#117ABD">AI Agent</tspan></text>
    <text data-cover-title-line="2" x="36" y="316" font-size="112">什么时候</text>
    <text data-cover-title-line="3" x="36" y="500" font-size="150">该并行</text>
    <text data-cover-title-line="4" x="36" y="684" font-size="150">工作？</text>
  </g>
</svg>`);
}

writeCovers();

process.stdout.write(`${JSON.stringify({
  runKey,
  contractId,
  projects: [zhDir, enDir],
  sceneCount: chapters.flatMap((chapter) => chapter.sceneIds).length,
}, null, 2)}\n`);
