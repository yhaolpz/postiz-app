import fs from 'node:fs';
import path from 'node:path';

const repoRoot = '/Volumes/SSD/Workspace/postiz-app';
const output = path.join(
  repoRoot,
  'var/ai-video-pipeline/longform/2026-07-29-03-topic-b.json',
);

const source = {
  publisher: 'Anthropic',
  title: 'Agentic coding and persistent returns to expertise',
  published: '2026-06-16',
  url: 'https://www.anthropic.com/research/claude-code-expertise',
};

const chapter = (core, recaps) => [...core, ...recaps];

const zhParagraphs = [
  [
    '为什么懂业务的人，能让 AI Agent 做得更多？因为责任边界没有外包。',
    'Anthropic 在二零二六年六月发布了一项隐私保护分析，覆盖约四十万次 Claude Code 交互会话和约二十三万五千名用户，观察期从二零二五年十月到二零二六年四月。',
    '研究看到的不是专家把每个动作抓得更紧。相反，领域理解越清楚，Agent 每条指令后的行动链越长，遇到错误时也更容易被带回正确方向。',
    '这期会把发现整理成一张责任分工卡：规划由谁定，执行交给谁，验证看什么，失败时谁接管。它是本期的实践推导，不是 Anthropic 官方模板。',
    '视频全程干货高价值，让你成为更擅长使用 AI 的人，内容较长，点点关注收藏不迷路。',
  ],
  chapter([
    '第一步先看真实分工，而不是把自主程度想成一个开或关的按钮。',
    '研究把决策分成两类。规划回答做什么、选哪条路线和怎样算完成；执行回答改哪些文件、写什么代码和运行哪些命令。',
    '在典型会话里，人平均做出约百分之七十的规划决策，却只做出约百分之二十的执行决策。',
    '换句话说，常见模式是人决定要建什么，Agent 决定具体怎样建。',
    '这并不等于人只写一句需求就离场。典型会话大约有四轮往返，每轮都可以重新校正方向。',
    '每条用户提示平均会触发大约十个 Agent 动作，有些会话远高于这个数字，所以每个检查点都可能承载很长的行动链。',
    '真正要写清的不是允许 Agent 做几步，而是哪些决定必须留给懂问题的人。',
  ], [
    '本章小节。第一，把做什么和怎样做分开记录。',
    '第二，让 Agent 承担可验证的执行链，而不是替人定义目标。',
    '第三，用阶段检查点保持方向可纠正。',
  ]),
  chapter([
    '第二步要理解为什么专业度会放大 Agent，而不是简单压缩 Agent 的空间。',
    '研究按任务把用户表现出的专业度分成五级。它看的是指令是否精确、要求怎样验证，以及谁在纠正谁，不是职位或笼统能力。',
    '同一个人换到陌生领域可能是新手；不会写代码的会计，只要能说清月末对账规则并发现边界错误，也可能是该任务的专家。',
    '典型新手会话中，每条提示大约触发五个 Agent 动作和约六百词输出。',
    '典型专家会话中，行动链超过两倍，约十二个动作；输出约三千二百词，是新手会话的五倍左右。',
    '在控制工作模式、任务价值、月份、职业和模型家族后，专业度每提高一级，动作数仍增加约百分之九，输出增加约百分之十三。',
    '这不是说文字越多越好，而是清晰约束让 Agent 能在一次交接中安全推进更多可检查工作。',
  ], [
    '本章小节。第一，专业度是针对当前任务的理解。',
    '第二，明确约束会延长 Agent 的有效行动链。',
    '第三，用可验证产物衡量工作，不用输出长度代替质量。',
  ]),
  chapter([
    '第三步是按能力与不确定性分工，而不是按人和机器简单切一刀。',
    '稳定、可逆、规则清楚的执行可以成批交给 Agent，例如读取文件、机械修改、运行检查和汇总证据。',
    '目标定义、价值冲突、隐含约束和高代价取舍要由人负责，因为这些决定依赖领域背景和后果判断。',
    '当规则虽清楚但环境陌生时，可以让 Agent 先勘察并列出假设，人在执行前确认边界。',
    '当执行出现反复失败、证据互相冲突或影响范围扩大时，自动化程度应该下降，责任重新回到人。',
    '研究中的典型分工给出方向，但它来自 Claude Code 的交互会话，不是所有行业的固定比例。',
    '所以责任卡要写决定类型和升级条件，而不是照抄百分之七十或百分之二十。',
  ], [
    '本章小节。第一，按可逆性和不确定性决定委派深度。',
    '第二，把目标、价值和高代价取舍留给人。',
    '第三，预先写明失败与冲突何时触发接管。',
  ]),
  chapter([
    '第四步是把专业度转成可观察的责任动作。',
    '清晰的任务定义要包含对象、约束、完成证据和明确禁区，不能只给一个模糊愿望。',
    '验证要求要在执行前写下，例如必须通过哪些测试、比对哪些原始数据、保留哪些审计痕迹。',
    '专业用户会在关键节点纠正 Agent，因为他们能识别看似顺畅却偏离业务规则的结果。',
    '研究的严格验证成功率从新手会话的百分之十五，上升到中级及以上会话的大约百分之二十八到三十三。',
    '大部分提升发生在新手到中级之间，说明工作性理解已经能带来很大收益，深度精通的边际增益较小。',
    '遇到麻烦时，专家会话转成验证成功的比例也更高；这提醒我们要设计恢复路径，而不是只设计顺利路径。',
  ], [
    '本章小节。第一，把专业知识写成约束和完成证据。',
    '第二，在关键节点主动纠偏，不把流畅当正确。',
    '第三，为失败后的诊断、缩小范围和人工接管留出路径。',
  ]),
  chapter([
    '第五步，把这些原则落到一张四栏责任分工卡。',
    '第一栏是规划所有者。写出谁定义目标、优先级、允许的取舍和完成标准。',
    '第二栏是执行授权。列出 Agent 可以自主读取、修改、运行和组合的动作，以及明确禁止的动作。',
    '第三栏是验证证据。每个关键结果都绑定测试、原始来源、差异检查或可复现命令。',
    '第四栏是失败所有者。写清连续失败、证据冲突、范围扩大或不可逆动作出现时由谁接管。',
    '使用时先填规划所有者和失败所有者，再开放执行授权，最后逐项核对验证证据。',
    '这张卡是基于研究分工与专业度信号整理出的工作流工具，不代表研究已经验证了这张卡本身。',
  ], [
    '本章小节。第一，先指定规划与失败责任人。',
    '第二，再开放有边界的执行授权。',
    '第三，用预先约定的证据决定是否完成。',
  ]),
  [
    '总结一下，领域专家不是因为少让 Agent 做事而更有效，而是因为他们更清楚目标、约束、证据和接管时机。',
    '研究仍有边界：成功来自转录分类和可验证信号，不等于真实世界结果；非交互式使用也没有纳入。',
    '下次启动 AI Agent 前，先写四栏：规划所有者、执行授权、验证证据、失败所有者。',
    '关注 Tiny Agent，成为更擅长使用 AI 的人！',
  ],
];

const zhScreens = [
  ['专业度为什么放大 Agent？', '四十万次交互会话', '懂问题，Agent 才能走得更远', '责任分工卡', '高价值方法'],
  ['先看真实分工', '规划：做什么与怎样算完成', '人做约七成规划决策', 'Agent 承担约八成执行决策', '典型会话约四轮往返', '每条提示约十个动作', '决定必须有所有者', '规划与执行分开', '执行要可验证', '检查点保持纠偏'],
  ['专业度放大行动链', '专业度针对当前任务', '会计也能是任务专家', '新手：约五个动作', '专家：约十二个动作', '每级增加动作与输出', '约束换来安全推进', '专业度不是职位', '明确约束延长行动链', '证据比字数重要'],
  ['按风险划分责任', '可逆执行交给 Agent', '目标与价值由人负责', '陌生环境先勘察', '异常出现就降级自主', '比例不是行业定律', '写决定与升级条件', '看可逆性与不确定性', '高代价取舍留给人', '失败时及时接管'],
  ['把专业度变成动作', '任务定义要可检查', '验证要求提前写', '关键节点由人纠偏', '验证成功率随专业度上升', '主要收益来自新手到中级', '恢复路径同样重要', '知识写成约束与证据', '流畅不等于正确', '为故障预留接管路径'],
  ['使用责任分工卡', '一：规划所有者', '二：执行授权', '三：验证证据', '四：失败所有者', '按责任顺序填写', '本期工作流推导', '先指定责任人', '再开放执行授权', '证据决定完成'],
  ['专业度保留责任', '研究边界必须保留', '启动前先写四栏', 'Tiny Agent'],
];

const enParagraphs = [
  [
    'How can an expert let AI Agent do more? Ownership stays clear.',
    'In June 2026, Anthropic published a privacy-preserving analysis of roughly four hundred thousand interactive Claude Code sessions from about two hundred thirty-five thousand people, observed between October 2025 and April 2026.',
    'The pattern is not that experts micromanage every action. Stronger domain understanding is associated with longer action chains per instruction and a better ability to recover when the session goes wrong.',
    'This episode turns the findings into a responsibility card: who owns planning, what execution is delegated, which evidence verifies the result, and who takes over on failure. The card is our practical synthesis, not an Anthropic template.',
    'This video is packed with practical, high-value insights to help you get better at using AI. It is a longer one, so follow Tiny Agent and save it so you do not lose it.',
  ],
  chapter([
    'Start with the observed division of labor instead of treating autonomy as a single on-or-off setting.',
    'The study separates planning decisions from execution decisions. Planning covers what to do, which approach to take, and what counts as done. Execution covers files, code, tools, and commands.',
    'In a typical session, people make about seventy percent of planning decisions but only about twenty percent of execution decisions.',
    'The common pattern is simple: the person decides what to build, while the agent decides how to build it.',
    'That does not mean one prompt and a silent exit. A typical session has about four back-and-forth turns, each offering a chance to correct direction.',
    'Each user prompt triggers around ten agent actions on average, and the distribution has a long tail. One check-in can therefore govern a substantial chain of work.',
    'The useful question is not how many steps the agent may take. It is which decisions must stay with the person who understands the problem.',
  ], [
    'Chapter recap. First, separate what to do from how to execute it.',
    'Second, delegate verifiable execution without giving away the goal.',
    'Third, use staged check-ins to keep the direction correctable.',
  ]),
  chapter([
    'Next, understand why expertise can expand the agent role instead of shrinking it.',
    'The study rates apparent task expertise on five levels using precise framing, requested verification, and who corrects whom. It is not a job title or a measure of general ability.',
    'A senior engineer can be a novice in an unfamiliar language. An accountant who defines reconciliation rules and catches a month-end edge case can be an expert for that task.',
    'In typical novice sessions, one prompt triggers about five agent actions and roughly six hundred words of output.',
    'In typical expert sessions, the chain exceeds twice as many actions, around twelve, and carries roughly thirty-two hundred words, about five times the novice output.',
    'After controls for work mode, task value, month, occupation, and model family, each expertise level is still associated with about nine percent more actions and thirteen percent more output.',
    'More text is not automatically better. Precise constraints let the agent safely advance more checkable work before the next handoff.',
  ], [
    'Chapter recap. First, expertise is specific to the task at hand.',
    'Second, precise constraints expand the agent’s useful action chain.',
    'Third, judge progress by verifiable artifacts, not output length.',
  ]),
  chapter([
    'Now divide responsibility by capability and uncertainty, not by drawing a simple human-versus-machine line.',
    'Stable, reversible, rule-bound execution can be delegated in batches: reading files, making mechanical edits, running checks, and collecting evidence.',
    'Goals, value conflicts, hidden constraints, and costly trade-offs stay with a person because they depend on domain context and consequences.',
    'When rules are clear but the environment is unfamiliar, let the agent investigate and list assumptions, then confirm the boundary before execution.',
    'When failures repeat, evidence conflicts, or the affected scope expands, autonomy should decrease and responsibility should return to a person.',
    'The observed Claude Code split is directional evidence from interactive coding sessions, not a universal ratio for every industry.',
    'Write decision types and escalation triggers on the card. Do not copy seventy and twenty as fixed operating targets.',
  ], [
    'Chapter recap. First, set delegation depth by reversibility and uncertainty.',
    'Second, keep goals, values, and costly trade-offs with a person.',
    'Third, define the failures and conflicts that trigger a takeover.',
  ]),
  chapter([
    'Turn expertise into observable responsibility actions rather than a vague claim that an expert is present.',
    'A clear task definition names the object, constraints, completion evidence, and prohibited actions. A polished wish is not enough.',
    'Write verification before execution: required tests, primary data, comparison checks, and the audit trail that must remain.',
    'Expert users correct the agent at pivotal points because they can recognize fluent work that violates the domain rule.',
    'The study’s strict verified-success rate is fifteen percent for novice-rated sessions and roughly twenty-eight to thirty-three percent for intermediate or higher sessions.',
    'Most of the gain occurs between novice and intermediate. Working competence captures much of the benefit, while deep mastery adds a smaller margin.',
    'Experts also recover more often when sessions hit trouble. A responsible workflow needs a recovery path, not only a happy path.',
  ], [
    'Chapter recap. First, encode expertise as constraints and completion evidence.',
    'Second, correct pivotal deviations instead of trusting fluency.',
    'Third, preserve a path to diagnose, narrow scope, and take over.',
  ]),
  chapter([
    'Put the principles into a four-field agent responsibility card.',
    'Field one is the planning owner: who defines the goal, priorities, allowed trade-offs, and completion standard.',
    'Field two is execution authority: what the agent may read, change, run, and combine, plus actions that remain prohibited.',
    'Field three is verification evidence: tests, primary sources, diffs, or reproducible commands attached to every consequential result.',
    'Field four is the failure owner: who takes over after repeated failure, conflicting evidence, scope expansion, or an irreversible action.',
    'Fill the planning and failure owners first. Then open execution authority and close the loop by checking each required piece of evidence.',
    'This card is a workflow inference from the study’s division of labor and expertise signals. The report did not validate this specific card.',
  ], [
    'Chapter recap. First, name the planning and failure owners.',
    'Second, grant bounded execution authority.',
    'Third, let agreed evidence determine whether the work is done.',
  ]),
  [
    'Domain experts are effective with agents not because they make agents do less, but because they clarify goals, constraints, evidence, and takeover points.',
    'Keep the research boundary visible. Success is inferred from transcript classifiers and verifiable signals, not real-world outcomes, and non-interactive usage is excluded.',
    'Before the next AI Agent run, write four fields: planning owner, execution authority, verification evidence, and failure owner.',
    'Follow Tiny Agent. Tiny Agent helps you get better at using AI.',
  ],
];

const enScreens = [
  ['Why do experts amplify agents?', 'Four hundred thousand sessions', 'Expertise enables delegation', 'Four-field duty card', 'Practical high-value method'],
  ['Observe the real split', 'Planning defines done', 'People own about 70% of planning', 'Agents own about 80% of execution', 'About four turns per session', 'Around ten actions per prompt', 'Every decision needs an owner', 'Separate planning from execution', 'Delegate verifiable action', 'Correct direction at checkpoints'],
  ['Expertise expands action chains', 'Expertise is task-specific', 'A domain expert need not be a coder', 'Novice: about five actions', 'Expert: about twelve actions', 'Actions and output rise by level', 'Constraints enable safe progress', 'Expertise is not a title', 'Precision expands the action chain', 'Evidence beats word count'],
  ['Allocate by risk', 'Delegate reversible execution', 'Humans own goals and values', 'Investigate unfamiliar terrain', 'Reduce autonomy on anomalies', 'The ratio is not universal', 'Write decisions and triggers', 'Use reversibility and uncertainty', 'Keep costly trade-offs human', 'Trigger a timely takeover'],
  ['Make expertise visible', 'Define a checkable task', 'Write verification first', 'Correct pivotal deviations', 'Verified success rises with expertise', 'Most gains arrive by competence', 'Design the recovery path', 'Encode knowledge as evidence', 'Fluency is not correctness', 'Preserve takeover paths'],
  ['Use the duty card', 'One: planning owner', 'Two: execution authority', 'Three: evidence', 'Four: failure owner', 'Fill responsibility first', 'An episode workflow inference', 'Name both owners', 'Then grant bounded authority', 'Evidence determines done'],
  ['Expertise keeps responsibility', 'Research limits remain visible', 'Write four fields before the run', 'Tiny Agent'],
];

const localeBase = {
  'zh-CN': {
    locale: 'zh-CN',
    voice: 'zh-CN-YunxiaNeural',
    rate: '+35%',
    scriptFile: 'SCRIPT.zh-CN.md',
    fixedValueSentence: '视频全程干货高价值，让你成为更擅长使用 AI 的人，内容较长，点点关注收藏不迷路。',
    fixedOutroCta: '关注 Tiny Agent，成为更擅长使用 AI 的人！',
    outro: { title: 'Tiny Agent', lines: ['成为更擅长使用 AI 的人！'] },
  },
  'en-US': {
    locale: 'en-US',
    voice: 'en-US-ChristopherNeural',
    rate: '+15%',
    scriptFile: 'SCRIPT.en-US.md',
    fixedValueSentence: 'This video is packed with practical, high-value insights to help you get better at using AI. It is a longer one, so follow Tiny Agent and save it so you do not lose it.',
    fixedOutroCta: 'Follow Tiny Agent. Tiny Agent helps you get better at using AI.',
    outro: { title: 'Tiny Agent', lines: ['Get better at using AI.'] },
  },
};

const topic = {
  runKey: '2026-07-29-03-topic-b',
  baseRunKey: '2026-07-29-03',
  slug: 'agent-expertise-responsibility',
  topicLabel: 'Topic B — AI Agent 责任分工卡',
  contractId: '2026-07-29-03-topic-b-agent-expertise-v1',
  centralThesisId: 'thesis-expertise-expands-safe-agent-delegation',
  reusableArtifactId: 'artifact-agent-responsibility-card',
  coverActionId: 'cover-action-assign-agent-responsibility-02',
  priorityIds: {
    P0: ['p0-planning-owner', 'p0-execution-authority', 'p0-failure-owner'],
    P1: ['p1-verification-evidence', 'p1-escalation-trigger', 'p1-domain-constraint'],
    P2: ['p2-recovery-path', 'p2-reversibility-check'],
    P3: ['p3-output-volume-equals-quality', 'p3-fixed-delegation-ratio'],
  },
  examples: [
    'Anthropic analyzed about 400,000 interactive Claude Code sessions from about 235,000 people between October 2025 and April 2026.',
    'Typical novice sessions triggered about five actions and 600 words per prompt, while typical expert sessions triggered about twelve actions and 3,200 words.',
    'The responsibility card in this episode is a practical synthesis for viewers, not an Anthropic product or a validated research instrument.',
  ],
  caveats: [
    'Expertise and success are inferred by transcript classifiers and telemetry signals, not direct observation of real-world outcomes.',
    'The report excludes non-interactive Claude Code usage and focuses on the observed included surfaces.',
    'The responsibility card is an inference from the report, not an official Anthropic template.',
  ],
  chapterIds: [
    'intro',
    'observed-division-of-labor',
    'expertise-expands-agent-work',
    'allocate-by-risk',
    'make-responsibility-observable',
    'agent-responsibility-card',
    'summary',
  ],
  sceneAssets: ['expertise-map.png', 'planning-boundary.png', 'recovery-gate.png'],
  source,
  materialId: '2026-07-29-03-topic-b-local-materials-v1',
  locales: {
    'zh-CN': {
      ...localeBase['zh-CN'],
      projectTitle: '为什么更懂业务的人，能让 AI Agent 承担更多工作？',
      hookQuestion: '为什么懂业务的人，能让 AI Agent 做得更多？',
      hookLines: ['为什么懂业务', '的人，能让', 'AI Agent', '做得更多？'],
      openingAccentTokens: [
        { token: 'AI Agent', tone: 'identity' },
        { token: '懂业务', tone: 'topic' },
        { token: '更多', tone: 'risk' },
      ],
      firstSentence: zhParagraphs[0][0],
      coverAlt: 'Tiny Agent 正在填写 AI Agent 责任分工卡，明确规划、执行、验证与失败接管',
      promise: { label: '先收藏', strong: '留下一张责任分工卡', action: '让专业度放大 Agent' },
      openingHookReview: {
        visibleQuestion: '为什么懂业务的人，能让 AI Agent 做得更多？',
        intent: 'causal-diagnosis',
        audiencePainPoint: '许多人把 AI Agent 的能力问题误当成提示词问题，却没有写清目标、约束、验证和失败接管。',
        knowledgeGap: '观众需要知道领域专业度怎样转成可观察的委派动作，以及哪些责任不能随执行一起外包。',
        curiosityRationale: '问题直接点出专业度与 Agent 工作量的反直觉关系，把真实分工、成功差异和责任卡留到正文解释。',
        directTopicTerms: ['懂业务', 'AI Agent'],
        viewerValue: '观众会得到一张规划、执行、验证和失败接管四栏责任分工卡。',
        topicAlignmentRationale: '视频使用 Anthropic 的会话分工与专业度数据，解释怎样用专业知识扩大安全委派。',
        tangentialSetupRisk: 'none',
        obviousAnswerRisk: 'none',
        rejectedObviousQuestion: '专家是不是更会写提示词？',
      },
      chapterLabels: ['前言', '先看真实分工', '专业度怎样放大 Agent', '按风险划分责任', '把专业度变成责任动作', '使用责任分工卡', '总结'],
      paragraphs: zhParagraphs,
      screens: zhScreens,
      metadata: {
        locale: 'zh-CN',
        title: '为什么更懂业务的人，能让 AI Agent 承担更多工作？',
        thumbnailText: '懂业务的人，为什么能让 AI Agent 做得更多？',
        primaryKeyword: 'AI Agent 领域专业度',
        secondaryKeywords: ['AI Agent 分工', 'Agent 委派', '责任边界', '人工接管'],
        hashtags: ['#AIAgent', '#领域专业度', '#工作流', '#TinyAgent'],
        coverTitleContract: {
          coreCoverKeywords: ['AI Agent', '懂业务'],
          metadataKeywordGroups: [
            { coverKeyword: 'AI Agent', titleTerms: ['AI Agent'] },
            { coverKeyword: '懂业务', titleTerms: ['懂业务', '业务'] },
          ],
          topicAction: '用责任分工卡明确 AI Agent 的规划、执行、验证与失败接管',
        },
        source,
        description: '为什么更懂业务的人，反而能让 AI Agent 承担更多工作？这期基于 Anthropic 对约四十万次 Claude Code 交互会话的分析，拆解规划与执行分工、专业度带来的行动链差异，以及怎样用四栏责任分工卡安全扩大委派。\n\n你会学到：\n- 人与 Agent 分别应拥有哪类决定\n- 为什么明确约束会扩大有效行动链\n- 怎样设置验证证据和失败接管\n\n关注 Tiny Agent，成为更擅长使用 AI 的人！\n\n#AIAgent #领域专业度 #工作流 #TinyAgent',
      },
      interactionSuggestions: [
        { id: 'open-question', angle: 'open-question', text: '你的 AI Agent 工作流里，规划责任现在由谁承担？' },
        { id: 'practical-tradeoff', angle: 'practical-tradeoff', text: '哪类执行你愿意扩大委派，哪类决定必须留给人？' },
        { id: 'viewpoint-experience', angle: 'viewpoint-experience', text: '你遇到过 Agent 做得很多，却因为责任边界不清而返工吗？' },
      ],
      facts: [
        'Anthropic 分析约四十万次交互会话，典型会话中人平均做出约百分之七十的规划决策和约百分之二十的执行决策。',
        '典型新手会话每条提示约触发五个动作和六百词输出，典型专家会话约触发十二个动作和三千二百词输出。',
        '严格验证成功率在新手会话中约为百分之十五，在中级及以上会话中约为百分之二十八到三十三。',
      ],
      centralThesis: '领域专业度不会被 AI Agent 自动替代；它通过更清楚的目标、约束、验证和接管条件，让 Agent 能承担更长、更安全的执行链。',
      priorities: {
        P0: ['指定规划所有者', '定义执行授权', '指定失败所有者'],
        P1: ['预先写验证证据', '设置升级触发器', '把专业知识写成约束'],
        P2: ['保留恢复路径', '检查动作可逆性'],
        P3: ['把输出量当质量', '照抄固定委派比例'],
      },
      reusableArtifact: 'AI Agent 责任分工卡：规划所有者、执行授权、验证证据、失败所有者。',
      factBoundaries: [
        '研究使用隐私保护的转录分类器和遥测信号，不能直接证明真实世界业务结果。',
        '样本聚焦纳入分析的 Claude Code 交互会话，不含非交互式使用。',
        '责任分工卡是本期基于研究发现的实践推导，不是 Anthropic 官方模板。',
      ],
      inference: '把规划、执行、验证和失败接管整理成四栏，是为了让研究中的分工与专业度信号变成可执行工作流。',
    },
    'en-US': {
      ...localeBase['en-US'],
      projectTitle: 'Why Domain Experts Can Make AI Agents Do More',
      hookQuestion: 'How can an expert let AI Agent do more?',
      hookLines: ['How can an', 'expert let', 'AI Agent', 'do more?'],
      openingAccentTokens: [
        { token: 'AI Agent', tone: 'identity' },
        { token: 'expert', tone: 'topic' },
        { token: 'more', tone: 'risk' },
      ],
      firstSentence: enParagraphs[0][0],
      coverAlt: 'Tiny Agent completing an AI Agent responsibility card for planning, execution, verification, and failure takeover',
      promise: { label: 'Save it', strong: 'Keep the responsibility card', action: 'Turn expertise into delegation' },
      openingHookReview: {
        visibleQuestion: 'How can an expert let AI Agent do more?',
        intent: 'causal-diagnosis',
        audiencePainPoint: 'Teams often treat agent performance as a prompting problem while leaving goals, constraints, verification, and failure ownership ambiguous.',
        knowledgeGap: 'Viewers need to see how domain expertise becomes observable delegation behavior and which responsibilities cannot be outsourced with execution.',
        curiosityRationale: 'The question names the counterintuitive link between expertise and greater agent work while reserving the measured split and responsibility card for the episode.',
        directTopicTerms: ['expert', 'AI Agent'],
        viewerValue: 'Viewers will get a four-field card covering planning, execution, verification, and failure takeover.',
        topicAlignmentRationale: 'The episode uses Anthropic’s observed decision split and expertise gradient to design safer delegation.',
        tangentialSetupRisk: 'none',
        obviousAnswerRisk: 'none',
        rejectedObviousQuestion: 'Are experts better at prompting?',
      },
      chapterLabels: ['Introduction', 'Observe the work split', 'Expertise expands work', 'Allocate by risk', 'Make expertise visible', 'Use the duty card', 'Summary'],
      paragraphs: enParagraphs,
      screens: enScreens,
      metadata: {
        locale: 'en-US',
        language: 'en-US',
        title: 'Why Domain Experts Can Make AI Agents Do More',
        titleCandidates: [
          'Why Domain Experts Can Make AI Agents Do More',
          'The AI Agent Responsibility Card for Safe Delegation',
          'Delegate More to AI Agents Without Losing Responsibility',
        ],
        thumbnailFile: 'thumbnails/thumbnail.en-US.png',
        thumbnailText: 'EXPERTS MAKE AI AGENTS DO MORE',
        primaryKeyword: 'AI Agent domain expertise',
        secondaryKeywords: ['AI Agent delegation', 'agent responsibility', 'human oversight', 'verification workflow'],
        tags: ['AI Agent', 'domain expertise', 'delegation', 'human oversight', 'Tiny Agent'],
        hashtags: ['#AIAgents', '#DomainExpertise', '#AgentWorkflow', '#TinyAgent'],
        coverTitleContract: {
          coreCoverKeywords: ['AI Agent', 'EXPERTS'],
          metadataKeywordGroups: [
            { coverKeyword: 'AI Agent', titleTerms: ['AI Agent', 'AI Agents'] },
            { coverKeyword: 'EXPERTS', titleTerms: ['Experts', 'experts'] },
          ],
          topicAction: 'use a responsibility card to assign planning, execution, verification, and failure takeover in an AI Agent workflow',
        },
        source,
        description: 'Why can domain experts make AI Agents do more? Drawing on Anthropic’s analysis of roughly 400,000 interactive Claude Code sessions, this episode explains the observed planning-execution split, the persistent returns to task expertise, and a four-field responsibility card for safe delegation.\n\nYou’ll learn:\n- Which decisions belong to people and agents\n- Why precise constraints expand useful action chains\n- How to define verification evidence and failure takeover\n\nFollow Tiny Agent. Tiny Agent helps you get better at using AI.\n\n#AIAgents #DomainExpertise #AgentWorkflow #TinyAgent',
      },
      interactionSuggestions: [
        { id: 'open-question', angle: 'open-question', text: 'Who owns planning in your current AI Agent workflow?' },
        { id: 'practical-tradeoff', angle: 'practical-tradeoff', text: 'Which execution would you delegate further, and which decision stays human?' },
        { id: 'viewpoint-experience', angle: 'viewpoint-experience', text: 'When has an agent done a lot of work but still forced a restart because ownership was unclear?' },
      ],
      facts: [
        'Anthropic analyzed about 400,000 interactive sessions; in a typical session people made about 70% of planning decisions and about 20% of execution decisions.',
        'Typical novice sessions triggered about five actions and 600 words per prompt, while typical expert sessions triggered about twelve actions and 3,200 words.',
        'Verified success was 15% for novice-rated sessions and about 28-33% for intermediate or higher sessions.',
      ],
      centralThesis: 'Domain expertise is not automatically replaced by an AI Agent. Clearer goals, constraints, verification, and takeover conditions let experts safely delegate longer chains of execution.',
      priorities: {
        P0: ['Name the planning owner', 'Define execution authority', 'Name the failure owner'],
        P1: ['Write verification evidence first', 'Set escalation triggers', 'Encode domain knowledge as constraints'],
        P2: ['Preserve a recovery path', 'Check reversibility'],
        P3: ['Treat output volume as quality', 'Copy a fixed delegation ratio'],
      },
      reusableArtifact: 'AI Agent responsibility card: planning owner, execution authority, verification evidence, and failure owner.',
      factBoundaries: [
        'The study uses privacy-preserving transcript classifiers and telemetry signals; it does not directly observe real-world business outcomes.',
        'The sample focuses on included interactive Claude Code sessions and excludes non-interactive usage.',
        'The responsibility card is this episode’s practical synthesis, not an official Anthropic template.',
      ],
      inference: 'Organizing planning, execution, verification, and failure takeover into four fields makes the study’s decision split and expertise signals operational for viewers.',
    },
  },
  covers: {
    'zh-CN': {
      headline: 'AI Agent 为什么在懂业务的人手里做得更多？',
      titleLines: ['AI Agent', '为什么在', '懂业务的人手里', '做得更多？'],
      fontSizes: [132, 156, 144, 150],
      requiredCoverKeywords: ['AI Agent', '懂业务'],
      headlineIntent: 'question',
      headlineIntentRationale: '完整问题直接呈现领域专业度与 Agent 工作量之间的反直觉关系。',
      topicAction: '用责任分工卡明确 AI Agent 的规划、执行、验证与失败接管',
    },
    'en-US': {
      headline: 'WHY CAN EXPERTS MAKE AI AGENTS DO MORE?',
      titleLines: ['AI AGENTS', 'WHY CAN', 'EXPERTS', 'DO MORE?'],
      fontSizes: [132, 150, 166, 152],
      requiredCoverKeywords: ['AI Agent', 'EXPERTS'],
      headlineIntent: 'question',
      headlineIntentRationale: 'The full question names expertise and greater agent work while preserving the episode’s delegation tension.',
      topicAction: 'use a responsibility card to assign planning, execution, verification, and failure takeover in an AI Agent workflow',
    },
  },
};

fs.writeFileSync(output, `${JSON.stringify(topic, null, 2)}\n`);
process.stdout.write(`${output}\n`);
