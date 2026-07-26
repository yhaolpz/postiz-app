import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const template = path.join(root, 'var/hyperframes-showcases/2026-07-25-03-agent-memory-retention-contract-r1-longform-en-US');
const runKey = '2026-07-26-03';
const slug = 'agent-long-running-harness';

const source = {
  publisher: 'Anthropic',
  title: 'Effective harnesses for long-running agents',
  url: 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents',
  publishedDate: '2025-11-26',
  facts: [
    'Long-running agents must bridge discrete context windows, because a fresh session does not automatically remember prior work.',
    'Anthropic describes a two-part harness: an initializer that prepares the environment and a coding agent that advances one feature at a time while leaving structured updates.',
    'Their web-app experiment treats a clean handoff as merge-ready code, documented state, and a clear next step.',
    'The article presents one practical approach for long-running coding agents; it does not establish that this is the best design for every agent, domain, or multi-agent system.'
  ]
};

const shared = {
  chapters: ['Introduction', 'The Reset Problem', 'Build a Working Floor', 'Shrink the Next Move', 'Write the Handoff', 'Verify Before Advance', 'Summary'],
  chaptersZh: ['前言', '重启难题', '工作底座', '缩小下一步', '写好交接', '先验再推进', '总结'],
  artifact: {
    en: 'Long-Running AI Agent Progress & Handoff Card',
    zh: 'AI Agent 长任务进度与交接模板'
  },
  central: {
    en: 'A long-running AI Agent stays useful when each session starts from an explicit working floor, finishes one small verified move, and leaves a handoff another session can trust.',
    zh: '长任务 AI Agent 能持续推进，不靠它记住一切，而靠每次都从明确底座开始、完成一个可验证小步骤，并留下下一次能直接使用的交接。'
  }
};

const en = {
  locale: 'en-US',
  voice: 'en-US-ChristopherNeural',
  rate: '+30%',
  profile: 'tiny-agent-longform-kinetic-retention-2026-07-23-en-US',
  projectTitle: 'How to Keep an AI Agent Moving on Long Tasks',
  hookQuestion: 'Can an AI Agent stay on track across context windows?',
  firstSentence: 'Can an AI Agent stay on track across context windows? Use a handoff.',
  promise: 'This video is packed with practical, high-value insights to help you get better at using AI. It\'s a longer one, so follow Tiny Agent and save it so you don\'t lose it.',
  outro: 'Follow Tiny Agent. Tiny Agent helps you get better at using AI.',
  title: 'Long-Running AI Agents: Keep Work Moving Across Context Windows',
  titleCandidates: [
    'Why Long-Running AI Agents Lose the Thread—and How to Fix It',
    'Long-Running AI Agents: A Progress System That Keeps Work Moving',
    'How to Build a Long-Running AI Agent Handoff That Actually Works'
  ],
  thumbnailText: 'AI Agent Handoff',
  primaryKeyword: 'long-running AI agents',
  secondaryKeywords: ['AI Agent handoff', 'agent context windows', 'agent progress tracking', 'incremental agent workflow'],
  hashtags: ['#LongRunningAgents', '#AIAgents', '#AgentWorkflow', '#AIProductivity', '#TinyAgent'],
  tags: ['long-running AI agents', 'AI Agent handoff', 'agent context window', 'agent workflow', 'agent progress tracking', 'AI agent memory'],
  paragraphs: [
    [
      'Can an AI Agent stay on track across context windows? Use a handoff.',
      'Anthropic studied this problem in a long-running coding setup. Their useful conclusion is simple: do not ask a fresh session to rediscover the whole project before it can help.',
      'Without a working floor, an Agent can restart by guessing, repeat already-finished work, or mistake a half-built feature for a completed task. That burns time and quietly raises risk.',
      'The reusable tool in this episode is a Long-Running AI Agent Progress & Handoff Card. It turns a vague continuation request into a small, inspectable next move.',
      'We will separate the reset problem, the minimum starting state, the size of a good next move, the handoff itself, and the evidence required before progress is claimed.',
      'This video is packed with practical, high-value insights to help you get better at using AI. It\'s a longer one, so follow Tiny Agent and save it so you don\'t lose it.'
    ],
    [
      'A long task does not become continuous just because the Agent has a loop. Each context window is a new session with incomplete memory of what happened before.',
      'That reset creates two costly failure modes. The Agent can attempt too much at once, or it can see partial progress and declare the entire job finished.',
      'Compaction can preserve some context, but it is not a substitute for a durable work state. A new session still needs to know what matters now.',
      'Treat the handoff as an interface, not as a diary. It should help the next Agent choose a safe next action without rereading every past conversation.',
      'Do not ask what the last session discussed. Ask what is true in the environment, what remains unproven, and what should happen next.',
      'A reset becomes manageable when the project keeps a small source of truth outside the context window.',
      'Chapter recap. First, a context window reset can erase practical working state.',
      'Second, partial work can trigger either repeated effort or premature completion.',
      'Third, the next session needs an actionable state, not a transcript.'
    ],
    [
      'Start with a working floor before asking an AI Agent to add a feature. The floor is the smallest verified state from which new work is safe.',
      'For software work, that usually includes a runnable environment, a feature list, a progress record, and a quick end-to-end check. Other domains need equivalent anchors.',
      'The initializer has a distinct job: make future sessions less dependent on inference. It prepares the map before anyone starts driving.',
      'Keep requirements in a structure that makes completion visible. A feature is not complete because it sounds finished; it is complete when its observable behavior passes.',
      'Also record the current constraints: accepted inputs, forbidden changes, known failures, and the evidence a reviewer will need.',
      'A stable floor reduces the temptation to rebuild the foundation in every session.',
      'Chapter recap. First, create a minimal verified starting environment.',
      'Second, make requirements and current constraints easy to inspect.',
      'Third, treat the initializer as setup for future sessions, not as one-shot delivery.'
    ],
    [
      'Once the floor exists, shrink the next move. A long-running AI Agent should advance one meaningful unit instead of trying to finish the whole project in one pass.',
      'Choose a unit that has a clear boundary: one feature, one failure to reproduce, one data check, or one reviewable decision. It should fit inside the available context.',
      'A small move still needs a result. The Agent should change a real state, run the relevant verification, and say what that verification did and did not prove.',
      'This is not slow for its own sake. Small completed units avoid the expensive recovery work caused by abandoned half-implementations.',
      'When a request is too large, split by a user-observable outcome rather than by arbitrary files or token counts.',
      'The progress card should name one next move, its success signal, and its stop condition.',
      'Chapter recap. First, give each session one bounded meaningful objective.',
      'Second, connect that objective to a real verification signal.',
      'Third, split oversized work by observable outcome, not by convenience.'
    ],
    [
      'A useful handoff answers four questions fast: what changed, what is verified, what is uncertain, and what is the next smallest safe action.',
      'Write decisions and evidence beside each other. A choice is usable when it names the browser evidence that passed and the alternative that failed.',
      'Leave paths to the source of truth, not a copied wall of context. The next Agent can inspect the feature list, progress note, tests, or artifacts on demand.',
      'Keep the environment clean enough for another person or Agent to begin immediately. Hidden breakage is not progress merely because a diff exists.',
      'A good handoff also names a boundary: do not change this integration, do not claim this metric, or wait for this external approval.',
      'That boundary is how you preserve human judgment when the Agent continues independently.',
      'Chapter recap. First, record changes, evidence, uncertainty, and the next move.',
      'Second, link to inspectable sources instead of copying all context.',
      'Third, make constraints explicit so the next Agent does not overreach.'
    ],
    [
      'Before an AI Agent marks progress complete, verify the claimed outcome at the level the user will experience. A unit test alone may not prove an end-to-end feature works.',
      'The source article describes better results when Agents were explicitly prompted to use browser automation for end-to-end checks in a web-app setting.',
      'Use the narrowest sufficient check first, then add a realistic workflow check when the claim affects an interface, integration, or delivery.',
      'Update the progress card only after the evidence exists. A pass flag is an output of verification, not a substitute for it.',
      'When verification fails, preserve the failure, the reproduction path, and the smallest next diagnostic step. That turns a reset into a focused continuation.',
      'This is also the human gate: people decide whether the evidence is enough for the consequence at stake.',
      'Chapter recap. First, verify outcomes at the level users actually experience.',
      'Second, record evidence before changing a task to complete.',
      'Third, turn failures into precise next diagnostics rather than vague retries.'
    ],
    [
      'Long-running AI Agents need continuity by design, not by optimism.',
      'First, establish a working floor with a runnable environment, clear requirements, and a fast reality check.',
      'Second, make one bounded move at a time and verify its observable result.',
      'Third, leave a handoff that states changes, evidence, uncertainty, boundaries, and the next safe action.',
      'Use the Long-Running AI Agent Progress & Handoff Card whenever work must cross sessions, people, or context windows.',
      'The practical test is simple: could a fresh Agent begin useful work without guessing what the last one meant?',
      'Follow Tiny Agent. Tiny Agent helps you get better at using AI.'
    ]
  ],
  recap: [
    ['A reset can erase working state', 'Partial work invites repeats or premature claims', 'Actionable state beats a transcript'],
    ['Verify a minimal working floor', 'Expose requirements and constraints', 'Prepare future sessions before delivery'],
    ['Choose one bounded objective', 'Attach a real success signal', 'Split by observable outcome'],
    ['Record evidence with decisions', 'Link to inspectable sources', 'Make boundaries explicit'],
    ['Check user-visible outcomes', 'Evidence comes before completion', 'Failures become next diagnostics']
  ]
};

const zh = {
  locale: 'zh-CN',
  voice: 'zh-CN-YunxiaNeural',
  rate: '+35%',
  profile: 'tiny-agent-longform-kinetic-retention-2026-07-23-zh-CN',
  projectTitle: 'AI Agent 长任务怎样持续推进',
  hookQuestion: 'AI Agent 长任务会跑偏吗？',
  firstSentence: 'AI Agent 长任务会跑偏吗？写好交接。',
  promise: '视频全程干货高价值，让你成为更擅长使用 AI 的人，内容较长，点点关注收藏不迷路。',
  outro: '关注 Tiny Agent，成为更擅长使用 AI 的人！',
  title: 'AI Agent 长任务怎样持续推进：进度与交接模板',
  thumbnailText: 'AI Agent 如何交接？',
  primaryKeyword: 'AI Agent 长任务',
  secondaryKeywords: ['智能体交接', '上下文窗口', '任务进度', 'AI Agent 验收'],
  hashtags: ['#AIAgent长任务', '#智能体交接', '#人机协作', '#AI工作流', '#TinyAgent'],
  paragraphs: [
    [
      'AI Agent 长任务会跑偏吗？写好交接。',
      'Anthropic 用长周期编程任务研究过这个难题。它给出的实用方向是：别让新会话先猜项目发生过什么。',
      '没有清晰底座，智能体会重复已完成的工作，或把半成品误认为完成。时间和风险都会被悄悄放大。',
      '这期的可复用产物是 AI Agent 长任务进度与交接模板。它把“继续做”变成一个可检查的小步骤。',
      '我们会依次拆开重启难题、工作底座、下一步粒度、交接内容和验收证据。',
      '视频全程干货高价值，让你成为更擅长使用 AI 的人，内容较长，点点关注收藏不迷路。'
    ],
    [
      '长任务并不会因为智能体循环运行就天然连续。每个上下文窗口都可能像一次新的交接班。',
      '这会带来两种常见失败：一次想做太多，或看到部分成果就宣称全任务完成。',
      '上下文压缩能保留一些信息，但不能替代可查的工作状态。新会话仍要知道现在最重要的是什么。',
      '交接不是流水账，而是接口。它要让下一位智能体不用重读全部历史也能选对下一步。',
      '真正该问的不是“之前聊了什么”，而是“环境现在有什么证据，还缺什么，下一步做什么”。',
      '把小型事实源放在上下文窗口之外，重启才不会靠猜。',
      '本章小节。第一，窗口重启会丢失可用工作状态。',
      '第二，半成品容易导致重复劳动或过早宣称完成。',
      '第三，下一轮需要行动状态，而不是完整聊天记录。'
    ],
    [
      '让 AI Agent 开始前，先建立工作底座。它是新工作可以安全继续的最小已验证状态。',
      '在软件任务里，底座通常包括可运行环境、功能清单、进度记录和一次快速端到端检查。别的工作也要有等价锚点。',
      '初始化智能体的职责不同：它要为后续会话铺路，减少每次都靠推测找方向。',
      '需求要放进能看出完成状态的结构里。不是写着“完成”就算完成，而是可观察行为真的通过。',
      '同时记录约束：允许的输入、不能碰的边界、已知失败和审阅者需要的证据。',
      '稳定底座能减少每一轮重新修地基的冲动。',
      '本章小节。第一，先建立最小可验证的工作底座。',
      '第二，让需求与约束可以快速检查。',
      '第三，初始化是为后续会话服务，不是一次性交付。'
    ],
    [
      '有了底座后，把下一步缩小。长任务 AI Agent 每轮应完成一个有意义的小单元，不要试图一口吞完整项目。',
      '小单元要边界清楚：一个功能、一条可复现失败、一次数据核对，或一个可审阅决定。它应当装得进本轮上下文。',
      '小不等于没有结果。智能体要改变真实状态，跑相关检查，并说明检查证明了什么、没有证明什么。',
      '这样做不是故意变慢，而是避免半截实现留下昂贵的恢复成本。',
      '任务过大时，按用户能观察到的结果拆分，不要只按文件或 token 数量拆。',
      '进度模板要写清下一步、成功信号和停止条件。',
      '本章小节。第一，每轮只领取一个有边界的目标。',
      '第二，目标必须绑定真实成功信号。',
      '第三，按可观察结果拆分过大的任务。'
    ],
    [
      '一份可用交接要快速回答四件事：改了什么、验证了什么、哪里未知、下一步最安全的动作是什么。',
      '把决定和证据写在一起。“选 B”不够；“B 通过了这个浏览器检查，而 A 在此处失败”才可复用。',
      '留下事实源入口，不要复制一整面上下文。下一轮按需打开功能清单、进度记录、测试或产物。',
      '环境要干净到另一个人或智能体能马上开始。存在隐藏破损的改动不能算有效进展。',
      '交接也要说清边界：不能修改哪个集成、不能宣称哪个指标，或必须等待哪项外部批准。',
      '边界让人类仍然掌握关键判断，即使智能体继续执行。',
      '本章小节。第一，交接写清变化、证据、未知和下一步。',
      '第二，链接可检查事实源，不复制全部上下文。',
      '第三，把不能越过的边界写明白。'
    ],
    [
      'AI Agent 想把进度标成完成前，要按用户真正感受到的层级验收。单元测试通过，不代表端到端功能可用。',
      '原文在网页应用实验中发现，明确要求智能体使用浏览器自动化做端到端检查后，结果更好。',
      '先跑最窄且足够的检查；如果影响界面、集成或交付，再补一条真实工作流检查。',
      '有证据后再更新进度卡。通过标记是验收的结果，不能代替验收。',
      '检查失败时，保留失败现象、复现路径和最小诊断动作。这样下一轮才能聚焦继续。',
      '这也是人的关口：由人判断当前证据是否匹配这项决定的后果。',
      '本章小节。第一，按用户可感知的结果验收。',
      '第二，有证据后才把任务改为完成。',
      '第三，把失败变成明确的下一步诊断。'
    ],
    [
      '长任务 AI Agent 的连续性，需要被设计出来。',
      '第一，先建立可运行、需求明确、能快速自检的工作底座。',
      '第二，每轮完成一个小而可验证的结果。',
      '第三，交接留下变化、证据、未知、边界和下一步。',
      '当任务跨会话、跨人或跨上下文窗口时，就使用 AI Agent 长任务进度与交接模板。',
      '最后问自己：一位全新的智能体能不能不用猜，就从这里继续做有价值的工作？',
      '关注 Tiny Agent，成为更擅长使用 AI 的人！'
    ]
  ],
  recap: [
    ['重启会丢失工作状态', '半成品带来重复或误判', '行动状态胜过记录堆积'],
    ['先验证最小工作底座', '需求与约束要可检查', '初始化服务后续会话'],
    ['每轮只做一个小目标', '目标绑定成功信号', '按可观察结果拆任务'],
    ['变化要连同证据记录', '按需打开事实源', '边界必须明确'],
    ['按用户结果做验收', '有证据再标完成', '失败转成下一步诊断']
  ]
};

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function json(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function text(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function sceneId(chapter, paragraph) {
  return `c${String(chapter + 1).padStart(2, '0')}-p${String(paragraph + 1).padStart(2, '0')}`;
}

function visualMap(data) {
  const labels = data.locale === 'zh-CN' ? shared.chaptersZh : shared.chapters;
  const props = ['question', 'repository', 'dashboard', 'task-list', 'progress', 'handoff', 'checklist', 'browser', 'target', 'queue', 'clipboard', 'evidence', 'document-stack', 'milestone', 'shield', 'workflow'];
  const agent = ['ask-front', 'reason-front', 'read-front', 'plan-front', 'execute-right', 'verify-front', 'handoff-left', 'evaluate-front', 'monitor-right', 'present-left'];
  const layouts = ['big-text', 'human-agent-prop', 'agent-center', 'two-props', 'human-prop', 'agent-center', 'big-text', 'human-agent-prop', 'two-props', 'human-center'];
  const generatedArt = {};
  const output = {};
  const motions = {};
  const humanPoses = {};
  const secondProps = {};
  const generatedNames = ['reset-map.png', 'working-floor.png', 'small-move.png', 'evidence-trail.png', 'handoff-bridge.png', 'test-gate.png', 'state-ledger.png', 'next-step.png', 'trust-chain.png', 'review-loop.png'];
  let artIndex = 0;
  let motionIndex = 0;
  const motionTypes = ['press-pulse', 'spring-pop', 'nudge', 'split-tilt', 'fly-in', 'spin-in', 'sine-float'];
  labels.forEach((label, chapterIndex) => {
    output[label] = data.paragraphs[chapterIndex].map((paragraph, paragraphIndex) => {
      const id = sceneId(chapterIndex, paragraphIndex);
      let type = 'generic';
      if (chapterIndex === 0 && paragraphIndex === 0) type = 'hook';
      if (chapterIndex === 0 && paragraphIndex === 1) type = 'authority';
      if (chapterIndex === 0 && paragraphIndex === 5) type = 'promise';
      if (chapterIndex >= 1 && chapterIndex <= 5 && paragraphIndex === 0) type = 'chapter-intro';
      if (chapterIndex >= 1 && chapterIndex <= 5 && paragraphIndex >= 6) type = 'recap';
      if (chapterIndex === 6 && paragraphIndex === 6) type = 'outro';
      const recapIndex = paragraphIndex - 6;
      const core = type === 'recap' ? data.recap[chapterIndex - 1][recapIndex] : paragraph.replace(/^[^。.!?]+[。.!?]?\s*/, '').slice(0, data.locale === 'zh-CN' ? 16 : 52);
      const headline = type === 'chapter-intro'
        ? `${data.locale === 'zh-CN' ? '第' + chapterIndex + '章：' : 'Chapter ' + chapterIndex + ': '}${label}`
        : type === 'hook' ? data.hookQuestion : core;
      const prop = props[(chapterIndex * 7 + paragraphIndex) % props.length];
      const pose = agent[(chapterIndex * 5 + paragraphIndex) % agent.length];
      if (chapterIndex >= 1 && chapterIndex <= 5 && (paragraphIndex === 2 || paragraphIndex === 5)) {
        generatedArt[id] = generatedNames[artIndex++];
      }
      if (!['recap', 'outro', 'hook'].includes(type)) motions[id] = motionTypes[motionIndex++ % motionTypes.length];
      if ((chapterIndex + paragraphIndex) % 4 === 0 || layouts[(chapterIndex * 8 + paragraphIndex) % layouts.length] === 'two-props') secondProps[id] = props[(chapterIndex * 11 + paragraphIndex + 5) % props.length];
      humanPoses[id] = ['present-right', 'explain-front', 'review-front', 'write-front', 'handoff-right', 'decide-front'][(chapterIndex + paragraphIndex) % 6];
      return [headline, prop, pose, core, type];
    });
  });
  labels.forEach((label, chapterIndex) => {
    data.paragraphs[chapterIndex].forEach((_, paragraphIndex) => {
      const id = sceneId(chapterIndex, paragraphIndex);
      if (!generatedArt[id] && !['hook', 'chapter-intro', 'recap', 'outro'].includes(output[label][paragraphIndex][4])) {
        output[label][paragraphIndex].push(layouts[(chapterIndex * 8 + paragraphIndex) % layouts.length]);
      }
    });
  });
  const layoutOverrides = {};
  Object.entries(output).forEach(([label, scenes]) => scenes.forEach((scene, index) => {
    if (scene[4] === 'generic') layoutOverrides[sceneId(labels.indexOf(label), index)] = scene[5] || 'agent-center';
  }));
  return { visuals: output, generatedArt, motions, humanPoses, secondProps, layouts: layoutOverrides };
}

function sceneArt(project, files) {
  const artDir = path.join(project, 'assets/generated/scene-art');
  fs.mkdirSync(artDir, { recursive: true });
  const shapes = [
    '<rect x="160" y="120" width="440" height="300" rx="32" fill="#ECECEA" stroke="#111413" stroke-width="16"/><path d="M230 210H530M230 285H460M230 360H390" stroke="#117ABD" stroke-width="26" stroke-linecap="round"/><circle cx="625" cy="440" r="78" fill="#F4C542" stroke="#111413" stroke-width="16"/>',
    '<path d="M150 500H690" stroke="#111413" stroke-width="20" stroke-linecap="round"/><rect x="180" y="240" width="150" height="220" rx="28" fill="#117ABD" stroke="#111413" stroke-width="16"/><rect x="410" y="150" width="170" height="310" rx="28" fill="#F4C542" stroke="#111413" stroke-width="16"/><path d="M255 220V120M495 130V70" stroke="#111413" stroke-width="18"/>',
    '<circle cx="400" cy="300" r="190" fill="#ECECEA" stroke="#111413" stroke-width="18"/><path d="M250 300H550M400 150V450" stroke="#117ABD" stroke-width="24" stroke-linecap="round"/><path d="M540 310L610 270L610 350Z" fill="#F4C542" stroke="#111413" stroke-width="14"/>',
    '<path d="M150 180H460L620 300L460 420H150Z" fill="#ECECEA" stroke="#111413" stroke-width="18"/><path d="M190 220H425M190 300H510M190 380H425" stroke="#117ABD" stroke-width="22" stroke-linecap="round"/><circle cx="640" cy="430" r="76" fill="#F4C542" stroke="#111413" stroke-width="16"/>',
    '<path d="M120 410C260 120 510 120 700 360" fill="none" stroke="#111413" stroke-width="22" stroke-linecap="round"/><path d="M610 320L740 370L650 465Z" fill="#117ABD" stroke="#111413" stroke-width="16"/><rect x="200" y="360" width="260" height="150" rx="30" fill="#F4C542" stroke="#111413" stroke-width="16"/>',
    '<rect x="170" y="130" width="480" height="360" rx="42" fill="#ECECEA" stroke="#111413" stroke-width="18"/><path d="M235 220L320 305L500 165" fill="none" stroke="#117ABD" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><circle cx="610" cy="430" r="88" fill="#F4C542" stroke="#111413" stroke-width="18"/>',
    '<path d="M180 160H610V460H180Z" fill="#ECECEA" stroke="#111413" stroke-width="18"/><path d="M250 230H540M250 310H470M250 390H420" stroke="#117ABD" stroke-width="24" stroke-linecap="round"/><path d="M620 155V430" stroke="#F4C542" stroke-width="28" stroke-linecap="round"/>',
    '<path d="M150 420H510" stroke="#111413" stroke-width="20" stroke-linecap="round"/><circle cx="220" cy="320" r="70" fill="#117ABD" stroke="#111413" stroke-width="16"/><circle cx="410" cy="210" r="70" fill="#F4C542" stroke="#111413" stroke-width="16"/><path d="M282 290L350 245" stroke="#111413" stroke-width="18"/>',
    '<path d="M145 370H650" stroke="#111413" stroke-width="18"/><path d="M180 370L290 170L410 370L525 120L640 370" fill="none" stroke="#117ABD" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/><circle cx="525" cy="120" r="50" fill="#F4C542" stroke="#111413" stroke-width="14"/>',
    '<circle cx="400" cy="300" r="190" fill="#ECECEA" stroke="#111413" stroke-width="18"/><path d="M400 150V300L540 390" fill="none" stroke="#117ABD" stroke-width="26" stroke-linecap="round"/><path d="M150 500H650" stroke="#F4C542" stroke-width="30" stroke-linecap="round"/>'
  ];
  files.forEach((file, index) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="620" viewBox="0 0 820 620">${shapes[index]}</svg>`;
    const svgPath = path.join(artDir, `${file}.svg`);
    text(svgPath, svg);
    run('rsvg-convert', ['-w', '820', '-h', '620', '-o', path.join(artDir, file), svgPath], project);
    run('magick', [path.join(artDir, file), '-strip', '-colorspace', 'sRGB', path.join(artDir, file)], project);
    fs.rmSync(svgPath);
  });
  json(path.join(artDir, 'provenance.json'), {
    generatedAt: new Date().toISOString(),
    method: 'project-native SVG scene illustrations rasterized as transparent PNGs',
    sourceTopic: source.title,
    assets: files.map((file) => ({ file, transparentBackground: true, containsGeneratedText: false }))
  });
}

function writeEpisode(data) {
  const project = path.join(root, 'var/hyperframes-showcases', `${runKey}-${slug}-longform-${data.locale}`);
  fs.mkdirSync(project, { recursive: true });
  for (const rel of ['build.mjs', 'qa/check-production.mjs', 'qa/check-dom-layout.mjs', 'assets/fonts', 'assets/vendor', 'assets/images']) {
    const from = path.join(template, rel);
    const to = path.join(project, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
  }
  const visual = visualMap(data);
  const outputName = `${runKey}-${slug}-longform.${data.locale}.mp4`;
  const packageJson = JSON.parse(fs.readFileSync(path.join(template, 'package.json'), 'utf8'));
  packageJson.name = `tiny-agent-${slug}-longform-${data.locale.toLowerCase()}`;
  packageJson.scripts.render = `pnpm dlx hyperframes@0.7.71 render . --quality high --strict --quiet --workers 1 --low-memory-mode --video-bitrate 8M --output renders/${outputName}`;
  json(path.join(project, 'package.json'), packageJson);
  const headings = data.locale === 'zh-CN' ? shared.chaptersZh : shared.chapters;
  text(path.join(project, `SCRIPT.${data.locale}.md`), data.paragraphs.map((paragraphs, index) => `### ${index + 1} | ${headings[index]}\n\n${paragraphs.join('\n\n')}`).join('\n\n'));
  const episode = {
    locale: data.locale,
    projectTitle: data.projectTitle,
    scriptFile: `SCRIPT.${data.locale}.md`,
    outputName,
    voice: data.voice,
    rate: data.rate,
    hookQuestion: data.hookQuestion,
    firstSentence: data.firstSentence,
    fixedValueSentence: data.promise,
    fixedOutroCta: data.outro,
    coverAlt: data.thumbnailText,
    promise: { label: data.locale === 'zh-CN' ? '长任务继续前' : 'Before the next session', strong: data.locale === 'zh-CN' ? '先留下可检查状态' : 'Leave an inspectable state', action: data.locale === 'zh-CN' ? '关注 · 收藏' : 'Follow · Save' },
    outro: data.locale === 'zh-CN' ? { title: '关注 Tiny Agent', lines: ['成为更擅长使用 AI 的人！'] } : { title: 'Follow Tiny Agent', lines: ['Tiny Agent helps you', 'get better at using AI.'] },
    visuals: visual.visuals,
    generatedArt: visual.generatedArt,
    layouts: visual.layouts,
    motions: visual.motions,
    humanPoses: visual.humanPoses,
    secondProps: visual.secondProps
  };
  json(path.join(project, 'episode.json'), episode);
  json(path.join(project, 'production-profile.json'), {
    id: data.profile,
    status: 'active-profile-derived',
    scope: data.projectTitle,
    opening: { coverFirstFrame: false, firstFrameType: 'voice-synced-kinetic-question', firstSentence: data.firstSentence, fixedValueSentence: data.promise, maximumOrdinaryGapSeconds: 0.2 },
    visual: { canvas: '1920x1080', fps: 30, paper: '#ECECEA', ink: '#111413', layout: 'one-judgement-diverse-human-agent-prop-generated-art', semanticChangeSeconds: [4, 7], transitionLanguage: ['hard-cut', 'press-pulse', 'spring-pop', 'nudge', 'split-tilt', 'fly-in', 'spin-in', 'sine-float'], temporaryGeneratedSceneRatioMinimum: 0.15, motionTypeMinimum: 7, motionBeatMinimum: 20, recapPattern: 'persistent-blue-left-panel-cumulative-1-2-3', internalPropFrame: 'none-blend-with-paper-background', generatedArtHighlightLayout: 'alternating-opposite-sides', yellowHighlightMaxMeasuredCharsPerLine: data.locale === 'zh-CN' ? 11 : 26, yellowHighlightOverflowGate: true },
    audio: { voice: data.voice, rate: data.rate, targetLufs: -17, captionTiming: 'final-vtt', chapterRecapSpokenPrefix: data.locale === 'zh-CN' ? '本章小节。第一，' : 'Chapter recap. First, ' }
  });
  text(path.join(project, 'source.md'), `# Source\n\n- Publisher: ${source.publisher}\n- Title: ${source.title}\n- Published: ${source.publishedDate}\n- Canonical URL: ${source.url}\n\n## Verified facts\n\n${source.facts.map((fact) => `- ${fact}`).join('\n')}\n`);
  json(path.join(project, 'content-map.json'), {
    source,
    centralThesis: data.locale === 'zh-CN' ? shared.central.zh : shared.central.en,
    priorities: { P0: ['continuity requires an explicit state', 'incremental verified progress', 'structured handoff'], P1: ['working floor', 'bounded next move', 'handoff fields', 'user-visible verification'], P2: ['Anthropic web-app experiment and its limits'], P3Removed: ['company history and article-by-article retelling'] },
    chapters: headings,
    reusableArtifact: data.locale === 'zh-CN' ? shared.artifact.zh : shared.artifact.en,
    factBoundary: 'The episode treats Anthropic\'s article as a coding-agent case study and does not generalize its setup as a universal best design.'
  });
  const description = data.locale === 'zh-CN'
    ? `${data.primaryKeyword} 不是让智能体不停记住历史，而是让每一轮都有可查状态和可验证下一步。\n用一张交接模板，减少重启靠猜、半成品误判和无证据完成。\n\n你会学到：\n- 怎样建立可安全继续的工作底座\n- 怎样把长任务切成可验收的小步骤\n- 怎样写出下一轮能直接使用的交接\n\n关注 Tiny Agent，成为更擅长使用 AI 的人！\n\n${data.hashtags.join(' ')}`
    : `${data.primaryKeyword} do not stay reliable by remembering everything. They need a verified working floor, a bounded next move, and an inspectable handoff.\nUse the Progress & Handoff Card to reduce rework, premature completion, and context-window guessing.\n\nWhat you'll learn:\n- Build a safe working floor for a fresh AI Agent session\n- Turn a long task into small verified outcomes\n- Leave an evidence-backed handoff another session can use\n\nChapters:\n00:00 Introduction\n[Generated from final timing map before publication]\n\nFollow Tiny Agent. Tiny Agent helps you get better at using AI.\n\n${data.hashtags.join(' ')}`;
  json(path.join(project, `publish-metadata.${data.locale}.json`), {
    language: data.locale, title: data.title, titleCandidates: data.titleCandidates || undefined, thumbnailText: data.thumbnailText, primaryKeyword: data.primaryKeyword, secondaryKeywords: data.secondaryKeywords, description, hashtags: data.hashtags, tags: data.tags || [], source, youtube: data.locale === 'en-US' ? { visibility: 'public', selfDeclaredMadeForKids: 'no', playlistId: 'PLJffvaWRvGC8', playlistTitle: 'AI Agents: From Chat to Done', playlistPrivacyStatus: 'public' } : undefined
  });
  if (data.locale === 'zh-CN') text(path.join(project, 'manual-publish-copy.zh-CN.md'), `# ${data.title}\n\n${description}\n`);
  sceneArt(project, [...new Set(Object.values(visual.generatedArt))]);
  return project;
}

const enProject = writeEpisode(en);
const zhProject = writeEpisode(zh);
process.stdout.write(JSON.stringify({ enProject, zhProject, source, artifact: shared.artifact }, null, 2) + '\n');
