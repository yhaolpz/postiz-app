import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const cuesData = JSON.parse(fs.readFileSync(path.join(root, 'captions/cues.json'), 'utf8'));
const duration = Number(cuesData.durationSeconds.toFixed(3));
const cues = cuesData.cues;
const QUESTION_END = 5.264;

const scenes = [
  {
    id: 's01-question',
    start: 0,
    end: QUESTION_END,
    role: 'hook',
    layout: 'question',
    title: '让 Agent 自动炒股，能直接动真金白银吗？',
    storyReturn: true,
  },
  {
    id: 's02-source-risk',
    start: QUESTION_END,
    end: 11.42,
    role: 'authority',
    layout: 'focus',
    title: '真正要限制的，是高风险工具',
    storyReturn: false,
  },
  {
    id: 's03-story-loss',
    start: 11.42,
    end: 27.53,
    role: 'concrete-loss',
    layout: 'generated-art-left-copy',
    title: '模拟账户可以放手，真实损失不能',
    storyReturn: true,
    generatedArt: 'assets/generated/scene-art/owner-and-agent-simulated-portfolio.png',
  },
  {
    id: 's04-matrix-preview',
    start: 27.53,
    end: 38.75,
    role: 'tool-preview',
    layout: 'three-tier',
    title: '三级行动权限矩阵',
    storyReturn: true,
  },
  {
    id: 's05-follow-save',
    start: 38.75,
    end: 46.64,
    role: 'intro-follow-save',
    layout: 'character-cta',
    title: '干货高价值，先关注收藏',
    storyReturn: false,
  },
  {
    id: 's06-automatic',
    start: 46.64,
    end: 67.15,
    role: 'automatic-tier',
    layout: 'office-process',
    title: '先看动作会带来什么后果',
    storyReturn: true,
  },
  {
    id: 's07-confirm',
    start: 67.15,
    end: 84.85,
    role: 'confirm-tier',
    layout: 'generated-art-top-copy',
    title: '真实下单：必须看清再确认',
    storyReturn: true,
    generatedArt: 'assets/generated/scene-art/simulation-versus-real-order-gate.png',
  },
  {
    id: 's08-block',
    start: 84.85,
    end: 100.4,
    role: 'block-tier',
    layout: 'generated-art-right-copy',
    title: '凭据与陌生地址：直接阻断',
    storyReturn: true,
    generatedArt: 'assets/generated/scene-art/evidence-versus-rumor.png',
  },
  {
    id: 's09-open-loop',
    start: 100.4,
    end: duration,
    role: 'open-question',
    layout: 'takeaway',
    title: '别先问它聪不聪明，先看动作后果',
    storyReturn: true,
  },
];

const effects = [
  {
    id: 'fx-q-agent',
    sceneId: 's01-question',
    at: 0.22,
    triggerCueId: 'cue-1',
    triggerText: cues[0].text,
    triggerConcept: 'Agent 自动炒股',
    targetSelector: '#q-agent',
    targetSemanticRole: 'tiny-agent',
    targetMatchEvidence: '首句正在引入 Agent 主体',
    effectType: 'picture-entrance',
    entranceType: 'from-bottom',
    direction: 'bottom-to-top',
    distance: 180,
    fromState: { autoAlpha: 0, y: 180 },
    toState: { autoAlpha: 1, y: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.6,
    holdUntil: QUESTION_END,
  },
  {
    id: 'fx-q-underline',
    sceneId: 's01-question',
    at: 2.22,
    triggerCueId: 'cue-1',
    triggerText: '直接动真金白银',
    triggerConcept: '真实资金风险',
    targetSelector: '#u-question-money',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注首句最关键的真实资金风险',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.52,
    holdUntil: QUESTION_END,
  },
  {
    id: 'fx-source-shield',
    sceneId: 's02-source-risk',
    at: 5.38,
    triggerCueId: 'cue-2',
    triggerText: cues[1].text,
    triggerConcept: '高风险工具',
    targetSelector: '#source-shield',
    targetSemanticRole: 'risk-control',
    targetMatchEvidence: '旁白首次引入高风险工具',
    effectType: 'picture-entrance',
    entranceType: 'from-top',
    direction: 'top-to-bottom',
    distance: 180,
    fromState: { autoAlpha: 0, y: -180 },
    toState: { autoAlpha: 1, y: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.58,
    holdUntil: 11.42,
  },
  {
    id: 'fx-source-underline',
    sceneId: 's02-source-risk',
    at: 8.7,
    triggerCueId: 'cue-2',
    triggerText: '高风险工具',
    triggerConcept: '高风险工具',
    targetSelector: '#u-high-risk-tools',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注来源结论中的限制对象',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.48,
    holdUntil: 11.42,
  },
  {
    id: 'fx-story-art',
    sceneId: 's03-story-loss',
    at: 11.54,
    triggerCueId: 'cue-3',
    triggerText: cues[2].text,
    triggerConcept: '一人公司老板与模拟投资账户',
    targetSelector: '#story-art',
    targetSemanticRole: 'generated-story-illustration',
    targetMatchEvidence: '旁白首次引入固定母案例',
    effectType: 'picture-entrance',
    entranceType: 'from-right',
    direction: 'right-to-left',
    distance: 220,
    fromState: { autoAlpha: 0, x: 220 },
    toState: { autoAlpha: 1, x: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.68,
    holdUntil: 27.53,
  },
  {
    id: 'fx-loss-underline',
    sceneId: 's03-story-loss',
    at: 23.05,
    triggerCueId: 'cue-6',
    triggerText: '真金白银的损失',
    triggerConcept: '真实损失',
    targetSelector: '#u-real-loss',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注母案例的具体损失',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.5,
    holdUntil: 27.53,
  },
  ...[
    ['matrix-auto', 'fx-matrix-auto', 27.65, 'from-left', 'left-to-right', 190, '#matrix-auto', 'automatic-tier'],
    ['matrix-confirm', 'fx-matrix-confirm', 30.2, 'from-bottom', 'bottom-to-top', 180, '#matrix-confirm', 'confirm-tier'],
    ['matrix-block', 'fx-matrix-block', 32.8, 'fade', 'none', 0, '#matrix-block', 'block-tier'],
  ].map(([assetId, id, at, entranceType, direction, distance, targetSelector, role]) => ({
    id,
    sceneId: 's04-matrix-preview',
    at,
    triggerCueId: at < 30 ? 'cue-7' : 'cue-8',
    triggerText: at < 30 ? cues[6].text : cues[7].text,
    triggerConcept: assetId,
    targetSelector,
    targetSemanticRole: role,
    targetMatchEvidence: '旁白正在逐项介绍三级权限矩阵',
    effectType: 'picture-entrance',
    entranceType,
    direction,
    distance,
    fromState:
      entranceType === 'fade'
        ? { autoAlpha: 0 }
        : {
            autoAlpha: 0,
            ...(direction === 'left-to-right' ? { x: -distance } : {}),
            ...(direction === 'bottom-to-top' ? { y: distance } : {}),
          },
    toState: { autoAlpha: 1, x: 0, y: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: entranceType === 'fade' ? 0.52 : 0.64,
    holdUntil: 38.75,
  })),
  {
    id: 'fx-matrix-underline',
    sceneId: 's04-matrix-preview',
    at: 27.7,
    triggerCueId: 'cue-7',
    triggerText: '三级行动权限矩阵',
    triggerConcept: 'permission-matrix',
    targetSelector: '#u-permission-matrix',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注本期可复用工具',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.52,
    holdUntil: 38.75,
  },
  ...[
    ['fx-follow-human', 38.92, '#follow-human', 'from-left', 'left-to-right', 170],
    ['fx-follow-agent', 39.05, '#follow-agent', 'from-right', 'right-to-left', 180],
    ['fx-follow-bookmark', 42.2, '#follow-bookmark', 'from-top', 'top-to-bottom', 160],
  ].map(([id, at, targetSelector, entranceType, direction, distance], index) => ({
    id,
    sceneId: 's05-follow-save',
    at,
    triggerCueId: 'cue-9',
    triggerText: cues[8].text,
    triggerConcept: index === 2 ? '收藏' : '关注与学习',
    targetSelector,
    targetSemanticRole: index === 0 ? 'owner' : index === 1 ? 'tiny-agent' : 'save-prop',
    targetMatchEvidence: '固定关注收藏旁白正在引入对应主体',
    effectType: 'picture-entrance',
    entranceType,
    direction,
    distance,
    fromState: {
      autoAlpha: 0,
      ...(direction === 'left-to-right' ? { x: -distance } : {}),
      ...(direction === 'right-to-left' ? { x: distance } : {}),
      ...(direction === 'top-to-bottom' ? { y: -distance } : {}),
    },
    toState: { autoAlpha: 1, x: 0, y: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.58,
    holdUntil: 46.64,
  })),
  {
    id: 'fx-follow-underline',
    sceneId: 's05-follow-save',
    at: 39.1,
    triggerCueId: 'cue-9',
    triggerText: '干货高价值',
    triggerConcept: '高价值内容',
    targetSelector: '#u-high-value',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注固定关注收藏文案中的价值承诺',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.46,
    holdUntil: 46.64,
  },
  ...[
    ['fx-auto-agent', 46.82, '#auto-agent', 'from-bottom', 'bottom-to-top', 180, 'tiny-agent'],
    ['fx-auto-sheet', 52.42, '#auto-sheet', 'from-left', 'left-to-right', 200, 'public-evidence'],
    ['fx-auto-chart', 56.8, '#auto-chart', 'from-right', 'right-to-left', 200, 'simulation-result'],
  ].map(([id, at, targetSelector, entranceType, direction, distance, role], index) => ({
    id,
    sceneId: 's06-automatic',
    at,
    triggerCueId: index === 0 ? 'cue-10' : 'cue-11',
    triggerText: index === 0 ? cues[9].text : cues[10].text,
    triggerConcept: role,
    targetSelector,
    targetSemanticRole: role,
    targetMatchEvidence: '旁白正在引入公开研究或模拟计算',
    effectType: 'picture-entrance',
    entranceType,
    direction,
    distance,
    fromState: {
      autoAlpha: 0,
      ...(direction === 'left-to-right' ? { x: -distance } : {}),
      ...(direction === 'right-to-left' ? { x: distance } : {}),
      ...(direction === 'bottom-to-top' ? { y: distance } : {}),
    },
    toState: { autoAlpha: 1, x: 0, y: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.62,
    holdUntil: 67.15,
  })),
  {
    id: 'fx-auto-underline',
    sceneId: 's06-automatic',
    at: 60.5,
    triggerCueId: 'cue-11',
    triggerText: '自动执行',
    triggerConcept: 'automatic-tier',
    targetSelector: '#u-auto-execute',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注低后果可逆动作的权限结论',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.48,
    holdUntil: 67.15,
  },
  {
    id: 'fx-confirm-art',
    sceneId: 's07-confirm',
    at: 67.28,
    triggerCueId: 'cue-13',
    triggerText: cues[12].text,
    triggerConcept: '真实订单确认',
    targetSelector: '#confirm-art',
    targetSemanticRole: 'generated-confirmation-illustration',
    targetMatchEvidence: '旁白从模拟策略切换到真实订单',
    effectType: 'picture-entrance',
    entranceType: 'from-bottom',
    direction: 'bottom-to-top',
    distance: 220,
    fromState: { autoAlpha: 0, y: 220 },
    toState: { autoAlpha: 1, y: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.7,
    holdUntil: 84.85,
  },
  {
    id: 'fx-confirm-underline',
    sceneId: 's07-confirm',
    at: 80.2,
    triggerCueId: 'cue-15',
    triggerText: '真实下单',
    triggerConcept: 'owner-confirmation',
    targetSelector: '#u-real-order',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注必须由老板确认的真实状态改变',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.5,
    holdUntil: 84.85,
  },
  {
    id: 'fx-block-art',
    sceneId: 's08-block',
    at: 84.98,
    triggerCueId: 'cue-16',
    triggerText: cues[15].text,
    triggerConcept: '凭据与陌生地址',
    targetSelector: '#block-art',
    targetSemanticRole: 'generated-risk-illustration',
    targetMatchEvidence: '旁白引入来源不明的凭据和资金请求',
    effectType: 'picture-entrance',
    entranceType: 'from-left',
    direction: 'left-to-right',
    distance: 220,
    fromState: { autoAlpha: 0, x: -220 },
    toState: { autoAlpha: 1, x: 0 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.68,
    holdUntil: 100.4,
  },
  {
    id: 'fx-block-underline',
    sceneId: 's08-block',
    at: 92.8,
    triggerCueId: 'cue-16',
    triggerText: '直接阻断',
    triggerConcept: 'block-tier',
    targetSelector: '#u-block-now',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注与目标冲突且不可逆的权限结论',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.48,
    holdUntil: 100.4,
  },
  {
    id: 'fx-loop-agent',
    sceneId: 's09-open-loop',
    at: 100.56,
    triggerCueId: 'cue-18',
    triggerText: cues[17].text,
    triggerConcept: '判断动作后果',
    targetSelector: '#loop-agent',
    targetSemanticRole: 'tiny-agent-question',
    targetMatchEvidence: '旁白回收权限判断并提出下一问题',
    effectType: 'picture-entrance',
    entranceType: 'fade',
    direction: 'none',
    distance: 0,
    fromState: { autoAlpha: 0 },
    toState: { autoAlpha: 1 },
    semanticPurpose: 'introduce-new-information',
    duration: 0.56,
    holdUntil: duration,
  },
  {
    id: 'fx-loop-underline',
    sceneId: 's09-open-loop',
    at: 102.1,
    triggerCueId: 'cue-18',
    triggerText: '动作后果',
    triggerConcept: 'consequence-first',
    targetSelector: '#u-consequence',
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: '标注第一条可迁移判断',
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.48,
    holdUntil: duration,
  },
];

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const underline = (id, text, className = '') =>
  `<span class="underline-target ${className}" data-underline-target="${id}">${escapeHtml(text)}<span id="${id}" class="semantic-underline" aria-hidden="true"></span></span>`;

const pack = (group, file, id, className, alt, entrance) =>
  `<img id="${id}" class="picture-element ${className}" src="assets/pack/sprites/${group}/${file}.png" alt="${escapeHtml(
    alt,
  )}" data-entrance="${entrance}" />`;

const generated = (src, id, className, alt, entrance) =>
  `<img id="${id}" class="picture-element generated-art ${className}" src="${src}" alt="${escapeHtml(
    alt,
  )}" data-entrance="${entrance}" />`;

const sceneMarkup = {
  's01-question': `
    <div class="question-wrap">
      <div class="question-line">让 Agent 自动炒股，</div>
      <div class="question-line">能${underline('u-question-money', '直接动真金白银')}吗？</div>
    </div>
    ${pack('agent', 'ask-front', 'q-agent', 'question-agent', '提出问题的 Tiny Agent', 'from-bottom')}
  `,
  's02-source-risk': `
    <div class="source-layout">
      <div class="eyebrow">OPENAI · 权限边界</div>
      <div class="display-copy">真正的危险，<br />是不可信信息能不能碰到<br />${underline(
        'u-high-risk-tools',
        '高风险工具',
      )}</div>
      <div class="source-note">别只盯着可疑文字，要限制信息能触达的能力。</div>
    </div>
    ${pack('props', 'shield', 'source-shield', 'source-shield', '高风险工具防护盾', 'from-top')}
  `,
  's03-story-loss': `
    ${generated(
      'assets/generated/scene-art/owner-and-agent-simulated-portfolio.png',
      'story-art',
      'full-art',
      '一人公司老板和 Tiny Agent 检查模拟投资账户',
      'from-right',
    )}
    <div class="art-copy art-copy-left">
      <div class="eyebrow">固定母案例 · 模拟投资账户</div>
      <div class="display-copy compact">没有权限边界，<br />错误就可能变成<br />${underline(
        'u-real-loss',
        '真金白银的损失',
      )}</div>
    </div>
  `,
  's04-matrix-preview': `
    <div class="section-title">${underline('u-permission-matrix', '三级行动权限矩阵')}</div>
    <div class="tier-grid">
      <div class="tier tier-auto">
        ${pack('props', 'spreadsheet', 'matrix-auto', 'tier-icon', '自动执行的模拟表格', 'from-left')}
        <div class="tier-name">自动</div>
        <div class="tier-desc">公开研究<br />模拟计算</div>
      </div>
      <div class="tier tier-confirm">
        ${pack('props', 'approval', 'matrix-confirm', 'tier-icon', '等待老板确认', 'from-bottom')}
        <div class="tier-name">确认</div>
        <div class="tier-desc">真实下单<br />敏感传输</div>
      </div>
      <div class="tier tier-block">
        ${pack('props', 'stop', 'matrix-block', 'tier-icon', '直接阻断危险请求', 'fade')}
        <div class="tier-name">阻断</div>
        <div class="tier-desc">陌生地址<br />越权请求</div>
      </div>
    </div>
  `,
  's05-follow-save': `
    <div class="follow-copy">
      <div class="display-copy compact">${underline('u-high-value', '干货高价值')}<br />成为更擅长使用 AI 的人</div>
      <div class="follow-sub">内容较长，点点关注收藏不迷路</div>
    </div>
    <div class="follow-characters">
      ${pack('human', 'approve', 'follow-human', 'follow-human', '点头认可的一人公司老板', 'from-left')}
      ${pack('agent', 'success', 'follow-agent', 'follow-agent', '成功状态的 Tiny Agent', 'from-right')}
      ${pack('props', 'book', 'follow-bookmark', 'follow-bookmark', '收藏内容的知识手册', 'from-top')}
    </div>
  `,
  's06-automatic': `
    <div class="section-title small-title">先看动作会带来什么后果</div>
    <div class="auto-process">
      ${pack('agent', 'read-front', 'auto-agent', 'auto-agent', '读取公开信息的 Tiny Agent', 'from-bottom')}
      <div class="process-arrow">→</div>
      ${pack('props', 'document-stack', 'auto-sheet', 'auto-prop', '公开财报和证据', 'from-left')}
      <div class="process-arrow">→</div>
      ${pack('props', 'trend-up', 'auto-chart', 'auto-prop', '模拟计算结果', 'from-right')}
    </div>
    <div class="bottom-conclusion">后果小、可逆、留在本地 → ${underline(
      'u-auto-execute',
      '自动执行',
      'conclusion-key',
    )}</div>
  `,
  's07-confirm': `
    ${generated(
      'assets/generated/scene-art/simulation-versus-real-order-gate.png',
      'confirm-art',
      'full-art',
      '模拟账户与真实订单确认门',
      'from-bottom',
    )}
    <div class="art-copy art-copy-top-left">
      <div class="eyebrow">确认层 · 改变真实状态</div>
      <div class="display-copy compact">${underline('u-real-order', '真实下单')}<br />必须看清再确认</div>
    </div>
  `,
  's08-block': `
    ${generated(
      'assets/generated/scene-art/evidence-versus-rumor.png',
      'block-art',
      'full-art',
      'Tiny Agent 区分公开证据和未核实消息',
      'from-left',
    )}
    <div class="art-copy art-copy-right">
      <div class="eyebrow">阻断层 · 目标冲突且不可逆</div>
      <div class="display-copy compact">索取账户凭据<br />转向陌生地址<br />${underline(
        'u-block-now',
        '直接阻断',
      )}</div>
    </div>
  `,
  's09-open-loop': `
    <div class="takeaway-layout">
      <div>
        <div class="eyebrow">第一条判断</div>
        <div class="display-copy takeaway-copy">别先问它聪不聪明，<br />先看${underline(
          'u-consequence',
          '动作后果',
        )}</div>
        <div class="open-question">下一步：它怎么分清证据、观点和越权陷阱？</div>
      </div>
      ${pack('agent', 'reason-front', 'loop-agent', 'loop-agent', '继续推理的 Tiny Agent', 'fade')}
    </div>
  `,
};

const sceneHtml = scenes
  .map(
    (scene) => `
      <section
        id="${scene.id}"
        class="clip scene ${scene.layout}"
        data-start="${scene.start}"
        data-duration="${(scene.end - scene.start).toFixed(3)}"
        data-track-index="1"
        data-scene-role="${scene.role}"
      >
        ${scene.id === 's01-question' ? '' : '<div class="grid-bg"></div><div class="header"><span>Tiny Agent</span><span>AI 智能体行动权限 · 开头预览</span></div>'}
        ${sceneMarkup[scene.id]}
      </section>
    `,
  )
  .join('\n');

const captionHtml = cues
  .slice(1)
  .map(
    (cue, index) => `
      <div
        id="caption-${cue.id}"
        class="clip caption-box"
        data-start="${Math.max(QUESTION_END, cue.start).toFixed(3)}"
        data-duration="${Math.max(0.1, cue.end - Math.max(QUESTION_END, cue.start)).toFixed(3)}"
        data-track-index="${20 + index}"
      >${escapeHtml(cue.text)}</div>
    `,
  )
  .join('\n');

const boundaries = scenes.slice(1).map((scene) => scene.start);
const transitionHtml = boundaries
  .map(
    (at, index) => `
      <div
        id="transition-${index + 1}"
        class="clip transition-cover"
        data-start="${(at - 0.21).toFixed(3)}"
        data-duration="0.420"
        data-track-index="90"
      ></div>
    `,
  )
  .join('\n');

const animationJs = effects
  .map((effect) => {
    if (effect.effectType === 'text-underline') {
      return `tl.fromTo(${JSON.stringify(effect.targetSelector)}, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, transformOrigin: "left center", duration: ${effect.duration}, ease: "power2.out" }, ${effect.at});`;
    }
    const from = JSON.stringify(effect.fromState);
    const to = JSON.stringify({ ...effect.toState, duration: effect.duration, ease: 'power3.out' });
    return `tl.fromTo(${JSON.stringify(effect.targetSelector)}, ${from}, ${to}, ${effect.at});`;
  })
  .join('\n      ');

const transitionJs = boundaries
  .map(
    (at, index) => `
      tl.fromTo("#transition-${index + 1}", { x: -1920 }, { x: 0, duration: 0.21, ease: "power2.in" }, ${
        at - 0.21
      });
      tl.to("#transition-${index + 1}", { x: 1920, duration: 0.21, ease: "power2.out" }, ${at});`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="zh-CN" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face {
        font-family: "ZCOOL KuaiLe";
        src: url("assets/fonts/ZCOOLKuaiLe-Regular.ttf") format("truetype");
        font-display: block;
      }
      @font-face {
        font-family: "Hiragino Sans GB";
        src: url("assets/fonts/Hiragino-Sans-GB.ttc") format("truetype");
        font-display: block;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; background: #ECECEA; }
      body { font-family: "Hiragino Sans GB", Montserrat, sans-serif; color: #111413; }
      #root {
        position: relative;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background: #ECECEA;
      }
      .scene {
        position: absolute;
        inset: 0;
        width: 1920px;
        height: 1080px;
        background: #ECECEA;
      }
      .grid-bg {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(17,20,19,.055) 2px, transparent 2px),
          linear-gradient(90deg, rgba(17,20,19,.055) 2px, transparent 2px);
        background-size: 72px 72px;
      }
      .header {
        position: absolute;
        left: 56px;
        right: 56px;
        top: 34px;
        height: 58px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 4px solid #111413;
        font-size: 30px;
        font-weight: 800;
        letter-spacing: .02em;
      }
      .header span:first-child { color: #117ABD; }
      .eyebrow {
        font-family: "JetBrains Mono", monospace;
        font-size: 30px;
        font-weight: 700;
        color: #117ABD;
        margin-bottom: 24px;
      }
      .display-copy {
        font-size: 88px;
        line-height: 1.2;
        font-weight: 900;
        letter-spacing: -.04em;
      }
      .display-copy.compact { font-size: 78px; }
      .underline-target {
        position: relative;
        display: inline-block;
        white-space: nowrap;
      }
      .semantic-underline {
        position: absolute;
        display: block;
        left: 0;
        right: 0;
        bottom: -10px;
        width: 100%;
        height: 13px;
        border-radius: 999px;
        background: #F4C542;
        transform: scaleX(0);
        transform-origin: left center;
        will-change: transform;
      }
      .picture-element { display: block; object-fit: contain; will-change: transform, opacity; }
      .question {
        background-image:
          linear-gradient(rgba(17,20,19,.06) 2px, transparent 2px),
          linear-gradient(90deg, rgba(17,20,19,.06) 2px, transparent 2px);
        background-size: 72px 72px;
      }
      .question-wrap {
        position: absolute;
        left: 56px;
        right: 56px;
        top: 170px;
        height: 560px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-family: "ZCOOL KuaiLe", "Hiragino Sans GB", Montserrat, sans-serif;
        font-size: 162px;
        line-height: 1.2;
        text-align: center;
        letter-spacing: -.03em;
      }
      .question-line { white-space: nowrap; }
      .question-agent {
        position: absolute;
        width: 245px;
        height: 330px;
        right: 92px;
        bottom: 54px;
      }
      .source-layout {
        position: absolute;
        left: 110px;
        top: 170px;
        width: 1240px;
      }
      .source-layout .source-note {
        margin-top: 44px;
        font-size: 42px;
        line-height: 1.4;
        font-weight: 700;
        max-width: 1110px;
      }
      .source-shield {
        position: absolute;
        width: 390px;
        height: 520px;
        right: 120px;
        top: 210px;
      }
      .full-art {
        position: absolute;
        left: 0;
        top: 92px;
        width: 1920px;
        height: 748px;
        object-fit: contain;
      }
      .art-copy {
        position: absolute;
        z-index: 2;
      }
      .art-copy-left { left: 82px; top: 170px; width: 690px; }
      .art-copy-top-left { left: 76px; top: 132px; width: 930px; }
      .art-copy-right { right: 80px; top: 190px; width: 660px; }
      .detail-list {
        margin-top: 38px;
        width: 920px;
        font-size: 34px;
        font-weight: 800;
        line-height: 1.5;
      }
      .section-title {
        position: absolute;
        left: 90px;
        right: 90px;
        top: 138px;
        text-align: center;
        font-size: 92px;
        line-height: 1.15;
        font-weight: 900;
      }
      .small-title { font-size: 78px; }
      .tier-grid {
        position: absolute;
        left: 100px;
        right: 100px;
        top: 320px;
        height: 500px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 46px;
      }
      .tier {
        position: relative;
        border: 6px solid #111413;
        border-radius: 36px;
        padding: 24px 30px 30px;
        display: grid;
        grid-template-rows: 230px 96px 1fr;
        justify-items: center;
        align-items: center;
        background: #ECECEA;
      }
      .tier-auto { box-shadow: inset 0 18px 0 #A8D8F0; }
      .tier-confirm { box-shadow: inset 0 18px 0 #F4C542; }
      .tier-block { box-shadow: inset 0 18px 0 #E25644; }
      .tier-icon { width: 225px; height: 225px; }
      .tier-name { font-size: 66px; font-weight: 900; }
      .tier-desc { font-size: 34px; font-weight: 800; line-height: 1.3; text-align: center; }
      .follow-copy {
        position: absolute;
        left: 92px;
        top: 210px;
        width: 1040px;
      }
      .follow-sub { margin-top: 52px; font-size: 44px; line-height: 1.4; font-weight: 800; }
      .follow-characters {
        position: absolute;
        right: 72px;
        top: 170px;
        width: 650px;
        height: 620px;
      }
      .follow-human { position: absolute; left: 0; bottom: 0; width: 350px; height: 560px; }
      .follow-agent { position: absolute; right: 0; bottom: 0; width: 320px; height: 500px; }
      .follow-bookmark { position: absolute; right: 248px; top: 4px; width: 170px; height: 170px; }
      .auto-process {
        position: absolute;
        left: 120px;
        right: 120px;
        top: 330px;
        height: 420px;
        display: grid;
        grid-template-columns: 360px 120px 340px 120px 340px;
        align-items: center;
        justify-content: center;
        gap: 20px;
      }
      .auto-agent { width: 320px; height: 420px; justify-self: center; }
      .auto-prop { width: 310px; height: 310px; justify-self: center; }
      .process-arrow { font-size: 88px; font-weight: 900; color: #117ABD; text-align: center; }
      .bottom-conclusion {
        position: absolute;
        left: 110px;
        right: 110px;
        bottom: 300px;
        font-size: 52px;
        line-height: 1.35;
        font-weight: 900;
        text-align: center;
      }
      .bottom-conclusion .semantic-underline { bottom: -8px; }
      .takeaway-layout {
        position: absolute;
        left: 90px;
        right: 90px;
        top: 150px;
        bottom: 180px;
        display: grid;
        grid-template-columns: 1fr 430px;
        align-items: center;
        gap: 68px;
      }
      .takeaway-copy { font-size: 92px; }
      .open-question {
        margin-top: 72px;
        font-size: 42px;
        line-height: 1.5;
        font-weight: 800;
        color: #117ABD;
        max-width: 1160px;
      }
      .loop-agent { width: 410px; height: 590px; }
      .caption-box {
        position: absolute;
        left: 100px;
        right: 100px;
        bottom: 76px;
        min-height: 114px;
        padding: 18px 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        border: 5px solid #111413;
        border-radius: 24px;
        background: #ECECEA;
        font-size: 40px;
        line-height: 1.35;
        font-weight: 800;
        z-index: 70;
      }
      .chapter-rail {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 52px;
        display: grid;
        grid-template-columns: ${((46.64 - QUESTION_END) / (duration - QUESTION_END)) * 100}% 1fr;
        gap: 4px;
        background: #ECECEA;
        z-index: 75;
      }
      .rail-part {
        position: relative;
        height: 52px;
        background: #DDE0DA;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 800;
      }
      .rail-fill {
        position: absolute;
        inset: 0;
        background: #A8D8F0;
        transform: scaleX(0);
        transform-origin: left center;
      }
      .rail-label { position: relative; z-index: 2; }
      .transition-cover {
        position: absolute;
        inset: 0;
        width: 1920px;
        height: 1080px;
        background: #ECECEA;
        z-index: 90;
        will-change: transform;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${duration}"
      data-width="1920"
      data-height="1080"
    >
      ${sceneHtml}
      <audio
        id="narration"
        src="audio/narration.zh-CN.mp3"
        data-start="0"
        data-duration="${duration}"
        data-track-index="10"
        data-volume="1"
      ></audio>
      ${captionHtml}
      <div
        id="chapter-rail"
        class="clip chapter-rail"
        data-start="${QUESTION_END}"
        data-duration="${(duration - QUESTION_END).toFixed(3)}"
        data-track-index="75"
      >
        <div class="rail-part"><span id="rail-fill-intro" class="rail-fill"></span><span class="rail-label">1. 前言</span></div>
        <div class="rail-part"><span id="rail-fill-body" class="rail-fill"></span><span class="rail-label">2. 行动后果</span></div>
      </div>
      ${transitionHtml}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${animationJs}
      tl.fromTo("#rail-fill-intro", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: ${
        46.64 - QUESTION_END
      }, ease: "none" }, ${QUESTION_END});
      tl.fromTo("#rail-fill-body", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: ${
        duration - 46.64
      }, ease: "none" }, 46.64);
      ${transitionJs}
      window.__timelines["main"] = tl;
      window.__hyperframesAudit = {
        durationSeconds: ${duration},
        fullQuestionVisibleAtZero: true,
        questionEndsAt: 3.852,
        questionCardEndsAt: ${QUESTION_END},
        fullQuestionHoldSeconds: ${(QUESTION_END - 3.852).toFixed(3)},
        voice: "zh-CN-YunxiaNeural",
        rate: "+20%",
        textBodyAnimationCount: 0,
        picturePostEntranceMotionCount: 0
      };
    </script>
  </body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), html);
fs.writeFileSync(path.join(root, 'scene-plan.json'), `${JSON.stringify({ version: 1, durationSeconds: duration, scenes }, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'animation-plan.json'), `${JSON.stringify({ version: 1, durationSeconds: duration, effects }, null, 2)}\n`);
fs.writeFileSync(
  path.join(root, 'timing-map.json'),
  `${JSON.stringify(
    {
      version: 1,
      locale: 'zh-CN',
      durationSeconds: duration,
      question: {
        sceneStart: 0,
        narrationStart: cues[0].start,
        narrationEnd: cues[0].end,
        underlineStart: 2.22,
        underlineEnd: 2.74,
        cardEnd: QUESTION_END,
        fullQuestionHoldSeconds: Number((QUESTION_END - cues[0].end).toFixed(3)),
      },
      scenes: scenes.map(({ id, start, end }) => ({ id, start, end })),
      cues,
    },
    null,
    2,
  )}\n`,
);

const generatedPrompts = [
  {
    id: 'owner-and-agent-simulated-portfolio',
    path: 'assets/generated/scene-art/owner-and-agent-simulated-portfolio.png',
    sha256: '5b9013780f2c4996729c719d8295e6f5f41f7f973dd95d78c9e38fab8a58a1db',
    usedInScenes: ['s03-story-loss'],
    promptSummary: 'One-person-company owner and Tiny Agent jointly reviewing a simulated investment dashboard.',
  },
  {
    id: 'evidence-versus-rumor',
    path: 'assets/generated/scene-art/evidence-versus-rumor.png',
    sha256: 'a2a8f75c5c28c2c78f02c45a10c37816fefcedf1d2df5092e77b1b70991c9cae',
    usedInScenes: ['s08-block'],
    promptSummary: 'Tiny Agent comparing trustworthy public evidence with an unverified viral rumor.',
  },
  {
    id: 'simulation-versus-real-order-gate',
    path: 'assets/generated/scene-art/simulation-versus-real-order-gate.png',
    sha256: '3ec3f54a553c94e4c80fbdfe77eb6870bb720366357811f2a9f395023958f45c',
    usedInScenes: ['s07-confirm'],
    promptSummary: 'Simulated-account path separated from a locked real-money order gate requiring owner approval.',
  },
].map((asset) => ({
  ...asset,
  generatorType: 'image-model',
  provider: 'OpenAI built-in imagegen',
  referenceAsset: 'assets/pack/sprites/agent/*.png',
  qaStatus: 'pass',
}));

fs.mkdirSync(path.join(root, 'assets/generated/scene-art'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'assets/generated/scene-art/provenance.json'),
  `${JSON.stringify({ version: 1, assets: generatedPrompts }, null, 2)}\n`,
);

const assetFiles = [
  'assets/fonts/ZCOOLKuaiLe-Regular.ttf',
  'assets/fonts/Hiragino-Sans-GB.ttc',
  'assets/pack/sprites/agent/ask-front.png',
  'assets/pack/sprites/agent/reason-front.png',
  'assets/pack/sprites/props/shield.png',
  'assets/generated/scene-art/owner-and-agent-simulated-portfolio.png',
  'assets/pack/sprites/props/spreadsheet.png',
  'assets/pack/sprites/props/approval.png',
  'assets/pack/sprites/props/stop.png',
  'assets/pack/sprites/human/approve.png',
  'assets/pack/sprites/agent/success.png',
  'assets/pack/sprites/props/book.png',
  'assets/pack/sprites/agent/read-front.png',
  'assets/pack/sprites/props/document-stack.png',
  'assets/pack/sprites/props/trend-up.png',
  'assets/generated/scene-art/simulation-versus-real-order-gate.png',
  'assets/generated/scene-art/evidence-versus-rumor.png',
  'audio/narration.zh-CN.mp3',
];
const assets = assetFiles.map((relativePath) => {
  const data = fs.readFileSync(path.join(root, relativePath));
  return {
    path: relativePath,
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };
});
fs.writeFileSync(path.join(root, 'assets-manifest.json'), `${JSON.stringify({ version: 1, assets }, null, 2)}\n`);

const storyBoard = `# Storyboard

This video tells one-person-company owners that an Agent may automate research and simulated operations, but real-money state changes require explicit owner approval.

| Frame | Beat | On screen | Why |
| --- | --- | --- | --- |
${scenes
  .map(
    (scene, index) =>
      `| ${String(index + 1).padStart(2, '0')} — ${scene.title} | ${scene.role} · ${(scene.end - scene.start).toFixed(
        1,
      )}s | ${scene.layout} | ${scene.role === 'open-question' ? 'Leaves the next knowledge gap open.' : `Advances the ${scene.role} job without changing the mother case.`} |`,
  )
  .join('\n')}

Style: paper-gray whiteboard, large native Chinese typography, one-time picture entrances, left-to-right yellow semantic underlines.

Duration: ${duration.toFixed(3)} seconds from locale-final TTS/VTT.
`;
fs.writeFileSync(path.join(root, 'STORYBOARD.md'), storyBoard);

console.log(JSON.stringify({ status: 'built', durationSeconds: duration, scenes: scenes.length, effects: effects.length }));
