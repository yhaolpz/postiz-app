import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cueData = JSON.parse(fs.readFileSync(path.join(root, 'captions/cues.json'), 'utf8'));
const cues = cueData.cues;
const duration = Number(cueData.durationSeconds.toFixed(3));
const question = '让 Agent 自动炒股，哪些动作必须由人确认？';

const paragraphWindows = new Map();
for (const cue of cues) {
  const current = paragraphWindows.get(cue.paragraph) ?? {
    paragraph: cue.paragraph,
    start: cue.start,
    end: cue.end,
    text: '',
  };
  current.start = Math.min(current.start, cue.start);
  current.end = Math.max(current.end, cue.end);
  current.text += cue.text;
  paragraphWindows.set(cue.paragraph, current);
}
const paragraphs = [...paragraphWindows.values()].sort((a, b) => a.paragraph - b.paragraph);
const p = (number) => paragraphs.find((item) => item.paragraph === number);
const sceneStart = (paragraph) => p(paragraph).start;
const sceneEndBefore = (paragraph) => sceneStart(paragraph);
const questionSceneEnd = sceneStart(2);
const questionNarrationStart = p(1).start;
const questionNarrationEnd = p(1).end;
const questionRevealStart = Math.max(0, questionNarrationStart - 0.1);
const questionRevealEnd = questionNarrationEnd;
const chapterStarts = [questionSceneEnd, sceneStart(7), sceneStart(8)];
const chapterEnds = [sceneStart(7), sceneStart(8), duration];
const chapterDurations = chapterStarts.map((start, index) => Number((chapterEnds[index] - start).toFixed(3)));

const scenes = [
  {
    id: 's01-question',
    start: 0,
    end: questionSceneEnd,
    role: 'hook',
    layout: 'opening-question',
    title: question,
    storyReturn: true,
  },
  {
    id: 's02-authority',
    start: sceneStart(2),
    end: sceneEndBefore(3),
    role: 'authority',
    layout: 'pair',
    title: '真正要限制的，是高风险工具',
    storyReturn: false,
  },
  {
    id: 's03-mother-case',
    start: sceneStart(3),
    end: sceneEndBefore(4),
    role: 'mother-case',
    layout: 'pair',
    title: '一人公司的模拟投资账户',
    storyReturn: true,
    generatedArt: 'assets/generated/scene-art/person-agent-portfolio.png',
  },
  {
    id: 's04-concrete-loss',
    start: sceneStart(4),
    end: sceneEndBefore(5),
    role: 'concrete-loss',
    layout: 'pair',
    title: '一条假消息，怎么碰到真金白银',
    storyReturn: true,
  },
  {
    id: 's05-matrix',
    start: sceneStart(5),
    end: sceneEndBefore(6),
    role: 'tool-preview',
    layout: 'matrix',
    title: '只看动作后果与可逆性',
    storyReturn: true,
  },
  {
    id: 's06-follow-save',
    start: sceneStart(6),
    end: sceneEndBefore(7),
    role: 'intro-follow-save',
    layout: 'pair',
    title: '干货高价值，先关注收藏',
    storyReturn: false,
  },
  {
    id: 's07-automatic',
    start: sceneStart(7),
    end: sceneEndBefore(8),
    role: 'automatic-tier',
    layout: 'pair',
    title: '低风险、可逆：可以自动执行',
    storyReturn: true,
    generatedArt: 'assets/generated/scene-art/agent-safe-research.png',
  },
  {
    id: 's08-confirm',
    start: sceneStart(8),
    end: sceneEndBefore(10),
    role: 'confirm-tier',
    layout: 'pair',
    title: '真实下单：必须由人确认',
    storyReturn: true,
    generatedArt: 'assets/generated/scene-art/real-order-approval-gate.png',
  },
  {
    id: 's09-block',
    start: sceneStart(10),
    end: sceneEndBefore(11),
    role: 'block-tier',
    layout: 'pair',
    title: '索取凭据或陌生转账：直接阻断',
    storyReturn: true,
  },
  {
    id: 's10-summary',
    start: sceneStart(11),
    end: duration,
    role: 'open-loop',
    layout: 'summary',
    title: '自动、确认、阻断',
    storyReturn: true,
  },
];

const cueMatching = (fragment, fallbackParagraph) =>
  cues.find((cue) => cue.text.includes(fragment)) ??
  cues.find((cue) => cue.paragraph === fallbackParagraph) ??
  cues[0];
const clampEffectAt = (sceneId, requested) => {
  const scene = scenes.find((item) => item.id === sceneId);
  return Number(Math.min(scene.end - 0.8, Math.max(scene.start + 0.1, requested)).toFixed(3));
};
const pictureEffect = ({
  id,
  sceneId,
  selector,
  paragraph,
  fragment,
  concept,
  role,
  entrance,
  atOffset = 0.16,
  durationSeconds = 0.62,
}) => {
  const scene = scenes.find((item) => item.id === sceneId);
  const cue = cueMatching(fragment, paragraph);
  const distance = entrance === 'fade' ? 0 : entrance === 'from-top' || entrance === 'from-bottom' ? 180 : 200;
  const states = {
    'from-left': [{ autoAlpha: 0, x: -distance }, { autoAlpha: 1, x: 0 }],
    'from-right': [{ autoAlpha: 0, x: distance }, { autoAlpha: 1, x: 0 }],
    'from-top': [{ autoAlpha: 0, y: -distance }, { autoAlpha: 1, y: 0 }],
    'from-bottom': [{ autoAlpha: 0, y: distance }, { autoAlpha: 1, y: 0 }],
    fade: [{ autoAlpha: 0 }, { autoAlpha: 1 }],
  };
  return {
    id,
    sceneId,
    at: clampEffectAt(sceneId, Math.max(scene.start + atOffset, cue.start)),
    triggerCueId: cue.id,
    triggerText: cue.text,
    triggerConcept: concept,
    targetSelector: selector,
    targetSemanticRole: role,
    targetMatchEvidence: `旁白首次呈现“${concept}”时引入对应图片`,
    effectType: 'picture-entrance',
    entranceType: entrance,
    direction:
      entrance === 'from-left'
        ? 'left-to-right'
        : entrance === 'from-right'
          ? 'right-to-left'
          : entrance === 'from-top'
            ? 'top-to-bottom'
            : entrance === 'from-bottom'
              ? 'bottom-to-top'
              : 'none',
    distance,
    fromState: states[entrance][0],
    toState: states[entrance][1],
    semanticPurpose: 'introduce-new-information',
    duration: durationSeconds,
    holdUntil: scene.end,
  };
};
const underlineEffect = ({ id, sceneId, selector, paragraph, fragment, concept, atOffset = 0.18 }) => {
  const scene = scenes.find((item) => item.id === sceneId);
  const cue = cueMatching(fragment, paragraph);
  return {
    id,
    sceneId,
    at: clampEffectAt(sceneId, Math.max(scene.start + atOffset, cue.start + 0.06)),
    triggerCueId: cue.id,
    triggerText: cue.text,
    triggerConcept: concept,
    targetSelector: selector,
    targetSemanticRole: 'key-text-underline',
    targetMatchEvidence: `黄色标注线强调旁白中的“${concept}”`,
    effectType: 'text-underline',
    direction: 'left-to-right',
    fromState: { scaleX: 0, transformOrigin: 'left center' },
    toState: { scaleX: 1, transformOrigin: 'left center' },
    semanticPurpose: 'mark-key-emphasis',
    duration: 0.5,
    holdUntil: scene.end,
  };
};

const effects = [
  pictureEffect({
    id: 'fx-authority-shield',
    sceneId: 's02-authority',
    selector: '#authority-shield',
    paragraph: 2,
    fragment: '高风险工具',
    concept: '高风险工具',
    role: 'risk-control',
    entrance: 'from-top',
  }),
  underlineEffect({
    id: 'fx-authority-underline',
    sceneId: 's02-authority',
    selector: '#u-high-risk',
    paragraph: 2,
    fragment: '高风险工具',
    concept: '高风险工具',
  }),
  pictureEffect({
    id: 'fx-mother-case-art',
    sceneId: 's03-mother-case',
    selector: '#mother-case-art',
    paragraph: 3,
    fragment: '模拟投资账户',
    concept: '人和 Agent 共用模拟投资账户',
    role: 'generated-mother-case',
    entrance: 'from-right',
  }),
  underlineEffect({
    id: 'fx-simulation-underline',
    sceneId: 's03-mother-case',
    selector: '#u-simulation',
    paragraph: 3,
    fragment: '模拟盘',
    concept: '模拟盘执行',
  }),
  pictureEffect({
    id: 'fx-rumor-warning',
    sceneId: 's04-concrete-loss',
    selector: '#rumor-warning',
    paragraph: 4,
    fragment: '稳赚',
    concept: '诱导重仓的小道消息',
    role: 'rumor-warning',
    entrance: 'from-left',
  }),
  underlineEffect({
    id: 'fx-money-underline',
    sceneId: 's04-concrete-loss',
    selector: '#u-real-money',
    paragraph: 4,
    fragment: '真金白银',
    concept: '真金白银',
  }),
  pictureEffect({
    id: 'fx-matrix-auto',
    sceneId: 's05-matrix',
    selector: '#matrix-auto',
    paragraph: 5,
    fragment: '自动',
    concept: '自动',
    role: 'automatic-tier',
    entrance: 'from-left',
  }),
  pictureEffect({
    id: 'fx-matrix-confirm',
    sceneId: 's05-matrix',
    selector: '#matrix-confirm',
    paragraph: 5,
    fragment: '确认',
    concept: '确认',
    role: 'confirm-tier',
    entrance: 'from-bottom',
    atOffset: 1.25,
  }),
  pictureEffect({
    id: 'fx-matrix-block',
    sceneId: 's05-matrix',
    selector: '#matrix-block',
    paragraph: 5,
    fragment: '阻断',
    concept: '阻断',
    role: 'block-tier',
    entrance: 'fade',
    atOffset: 2.4,
    durationSeconds: 0.54,
  }),
  underlineEffect({
    id: 'fx-matrix-underline',
    sceneId: 's05-matrix',
    selector: '#u-two-questions',
    paragraph: 5,
    fragment: '两个问题',
    concept: '两个问题',
  }),
  pictureEffect({
    id: 'fx-follow-person',
    sceneId: 's06-follow-save',
    selector: '#follow-person',
    paragraph: 6,
    fragment: '干货高价值',
    concept: '更擅长使用 AI 的人',
    role: 'viewer',
    entrance: 'from-left',
  }),
  pictureEffect({
    id: 'fx-follow-agent',
    sceneId: 's06-follow-save',
    selector: '#follow-agent',
    paragraph: 6,
    fragment: '关注收藏',
    concept: '关注收藏',
    role: 'tiny-agent',
    entrance: 'from-right',
    atOffset: 1.1,
  }),
  underlineEffect({
    id: 'fx-value-underline',
    sceneId: 's06-follow-save',
    selector: '#u-high-value',
    paragraph: 6,
    fragment: '干货高价值',
    concept: '干货高价值',
  }),
  pictureEffect({
    id: 'fx-research-art',
    sceneId: 's07-automatic',
    selector: '#research-art',
    paragraph: 7,
    fragment: '读取财报',
    concept: '读取财报和模拟计算',
    role: 'generated-safe-research',
    entrance: 'from-top',
  }),
  underlineEffect({
    id: 'fx-auto-underline',
    sceneId: 's07-automatic',
    selector: '#u-auto',
    paragraph: 7,
    fragment: '自动执行',
    concept: '自动执行',
  }),
  pictureEffect({
    id: 'fx-confirm-art',
    sceneId: 's08-confirm',
    selector: '#confirm-art',
    paragraph: 8,
    fragment: '真实订单',
    concept: '真实订单的人类确认门',
    role: 'generated-confirmation-gate',
    entrance: 'from-bottom',
  }),
  underlineEffect({
    id: 'fx-human-confirm-underline',
    sceneId: 's08-confirm',
    selector: '#u-human-confirm',
    paragraph: 9,
    fragment: '明确确认',
    concept: '人明确确认',
  }),
  pictureEffect({
    id: 'fx-credential-risk',
    sceneId: 's09-block',
    selector: '#credential-risk',
    paragraph: 10,
    fragment: '账户凭据',
    concept: '索取账户凭据',
    role: 'credential-risk',
    entrance: 'from-right',
  }),
  pictureEffect({
    id: 'fx-block-stop',
    sceneId: 's09-block',
    selector: '#block-stop',
    paragraph: 10,
    fragment: '直接阻断',
    concept: '直接阻断',
    role: 'block-action',
    entrance: 'fade',
    atOffset: 1.6,
    durationSeconds: 0.52,
  }),
  underlineEffect({
    id: 'fx-block-underline',
    sceneId: 's09-block',
    selector: '#u-block',
    paragraph: 10,
    fragment: '直接阻断',
    concept: '直接阻断',
  }),
  pictureEffect({
    id: 'fx-summary-agent',
    sceneId: 's10-summary',
    selector: '#summary-agent',
    paragraph: 11,
    fragment: '矩阵',
    concept: '三级行动权限结论',
    role: 'tiny-agent-summary',
    entrance: 'from-bottom',
  }),
  underlineEffect({
    id: 'fx-summary-underline',
    sceneId: 's10-summary',
    selector: '#u-summary-confirm',
    paragraph: 11,
    fragment: '人确认',
    concept: '真实交易由人确认',
  }),
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
const generated = (file, id, className, alt, entrance) =>
  `<img id="${id}" class="picture-element generated-art ${className}" src="assets/generated/scene-art/${file}.png" alt="${escapeHtml(
    alt,
  )}" data-entrance="${entrance}" />`;

const questionRows = ['让 Agent 自动炒股，', '哪些动作必须由人', '确认？'];
let glyphIndex = 0;
const colorForGlyph = (absoluteIndex) => {
  const joined = questionRows.join('');
  const before = joined.slice(0, absoluteIndex);
  const tail = joined.slice(absoluteIndex);
  if (tail.startsWith('Agent') || (before.includes('Agent') && !before.includes('Agent 自动炒股，'))) return 'blue';
  if (before.includes('Agent') && !before.includes('，')) return 'blue';
  if (tail.startsWith('自动炒股')) return 'blue';
  if (before.endsWith('自动') || before.endsWith('自动炒') || before.endsWith('自动炒股')) return 'blue';
  if (tail.startsWith('必须') || before.endsWith('必')) return 'red';
  if (tail.startsWith('人确认') || before.endsWith('人') || before.endsWith('人确')) return 'gold';
  return 'ink';
};
const questionMarkup = questionRows
  .map((row) => {
    const glyphs = [...row]
      .map((char) => {
        const absoluteIndex = glyphIndex;
        const result = `<span class="glyph glyph-${colorForGlyph(absoluteIndex)}" data-glyph-index="${absoluteIndex}">${escapeHtml(char)}</span>`;
        glyphIndex += 1;
        return result;
      })
      .join('');
    return `<div class="question-line">${glyphs}</div>`;
  })
  .join('');
const glyphCount = glyphIndex;
const glyphRevealTimes = Array.from({ length: glyphCount }, (_, index) =>
  Number((questionRevealStart + ((questionRevealEnd - questionRevealStart) * index) / Math.max(1, glyphCount - 1)).toFixed(3)),
);

const sceneMarkup = {
  's01-question': `
    <div class="question-wrap" aria-label="${question}">${questionMarkup}</div>
    ${pack('agent', 'ask-front', 'opening-agent', 'opening-agent', '静止的 Tiny Agent', 'none')}
  `,
  's02-authority': `
    <div class="content pair-layout">
      <div class="copy-block">
        <div class="body-title"><span class="blue">危险</span>不只在信息真假</div>
        <div class="body-copy">关键是：不可信内容<br />能不能碰到${underline('u-high-risk', '高风险工具', 'red')}</div>
      </div>
      <div class="art-slot">${pack('props', 'shield', 'authority-shield', 'pack-art tall-art', '隔离高风险工具的盾牌', 'from-top')}</div>
    </div>
  `,
  's03-mother-case': `
    <div class="content pair-layout">
      <div class="copy-block">
        <div class="body-title">一人公司把账户交给 <span class="blue">Agent</span></div>
        <div class="body-copy">先读公开信息、做计算<br />再在${underline('u-simulation', '模拟盘执行', 'blue')}</div>
      </div>
      <div class="art-slot">${generated('person-agent-portfolio', 'mother-case-art', 'wide-art', '人和 Tiny Agent 查看模拟投资账户', 'from-right')}</div>
    </div>
  `,
  's04-concrete-loss': `
    <div class="content pair-layout reverse">
      <div class="art-slot">${pack('props', 'warning', 'rumor-warning', 'pack-art square-art', '诱导重仓的警告消息', 'from-left')}</div>
      <div class="copy-block">
        <div class="body-title">“稳赚”消息催它<span class="red">立刻重仓</span></div>
        <div class="body-copy">权限没分清<br />假消息就会碰到${underline('u-real-money', '真金白银', 'red')}</div>
      </div>
    </div>
  `,
  's05-matrix': `
    <div class="content matrix-layout">
      <div class="body-title centered">只问${underline('u-two-questions', '两个问题', 'blue')}：会改什么？能撤回吗？</div>
      <div class="matrix-grid">
        <div class="matrix-card auto-card">
          ${pack('props', 'spreadsheet', 'matrix-auto', 'matrix-icon', '可自动执行的研究', 'from-left')}
          <div class="matrix-name blue">自动</div>
          <div class="matrix-desc">低风险<br />可逆</div>
        </div>
        <div class="matrix-card confirm-card">
          ${pack('props', 'human-gate', 'matrix-confirm', 'matrix-icon', '需要人确认的行动门', 'from-bottom')}
          <div class="matrix-name gold">确认</div>
          <div class="matrix-desc">真实状态<br />先暂停</div>
        </div>
        <div class="matrix-card block-card">
          ${pack('props', 'error', 'matrix-block', 'matrix-icon', '直接阻断的危险动作', 'fade')}
          <div class="matrix-name red">阻断</div>
          <div class="matrix-desc">越权<br />不可逆</div>
        </div>
      </div>
    </div>
  `,
  's06-follow-save': `
    <div class="content pair-layout">
      <div class="copy-block">
        <div class="body-title">${underline('u-high-value', '干货高价值', 'blue')}</div>
        <div class="body-copy">成为更擅长使用 <span class="blue">AI</span> 的人<br /><span class="gold">关注收藏</span>不迷路</div>
      </div>
      <div class="duo-art">
        ${pack('human', 'approve', 'follow-person', 'duo-human', '认可内容的人', 'from-left')}
        ${pack('agent', 'success', 'follow-agent', 'duo-agent', '成功状态的 Tiny Agent', 'from-right')}
      </div>
    </div>
  `,
  's07-automatic': `
    <div class="content pair-layout reverse">
      <div class="art-slot">${generated('agent-safe-research', 'research-art', 'wide-art', 'Tiny Agent 阅读财报并进行模拟计算', 'from-top')}</div>
      <div class="copy-block">
        <div class="body-title"><span class="blue">读取、比较、计算</span></div>
        <div class="body-copy">结果留在本地，随时能重算<br />低风险、可逆 → ${underline('u-auto', '自动执行', 'blue')}</div>
      </div>
    </div>
  `,
  's08-confirm': `
    <div class="content pair-layout">
      <div class="copy-block">
        <div class="body-title"><span class="red">真实订单</span>必须暂停</div>
        <div class="body-copy">标的、方向、数量、价格、风险<br />完整摆在人面前<br />${underline('u-human-confirm', '人明确确认', 'gold')}，Agent 才能继续</div>
      </div>
      <div class="art-slot">${generated('real-order-approval-gate', 'confirm-art', 'wide-art', 'Tiny Agent 停在真实订单的人类确认门前', 'from-bottom')}</div>
    </div>
  `,
  's09-block': `
    <div class="content pair-layout reverse">
      <div class="risk-art">
        ${pack('props', 'prompt-injection', 'credential-risk', 'risk-prop', '索取账户凭据的越权请求', 'from-right')}
        ${pack('props', 'stop', 'block-stop', 'risk-stop', '直接阻断危险请求', 'fade')}
      </div>
      <div class="copy-block">
        <div class="body-title"><span class="red">凭据</span>与<span class="red">陌生转账</span></div>
        <div class="body-copy">不要送进确认流程<br />而要${underline('u-block', '直接阻断', 'red')}</div>
      </div>
    </div>
  `,
  's10-summary': `
    <div class="content summary-layout">
      <div>
        <div class="body-title">三级权限，一句话记住</div>
        <div class="summary-row"><span class="blue">可逆研究自动做</span><span>真实交易${underline(
          'u-summary-confirm',
          '由人确认',
          'gold',
        )}</span><span class="red">越权转账直接阻断</span></div>
        <div class="next-question">下一步：越权怎么识别？</div>
      </div>
      ${pack('agent', 'reason-front', 'summary-agent', 'summary-agent', '思考下一问题的 Tiny Agent', 'from-bottom')}
    </div>
  `,
};

const contentSceneHtml = scenes
  .slice(1)
  .map(
    (scene) => `
      <section
        id="${scene.id}"
        class="clip body-scene ${scene.layout}"
        data-start="${scene.start.toFixed(3)}"
        data-duration="${(scene.end - scene.start).toFixed(3)}"
        data-track-index="3"
        data-scene-role="${scene.role}"
      >${sceneMarkup[scene.id]}</section>
    `,
  )
  .join('\n');

const animationJs = effects
  .map((effect) => {
    if (effect.effectType === 'text-underline') {
      return `tl.fromTo(${JSON.stringify(effect.targetSelector)}, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, transformOrigin: "left center", duration: ${effect.duration}, ease: "power2.out" }, ${effect.at});`;
    }
    return `tl.fromTo(${JSON.stringify(effect.targetSelector)}, ${JSON.stringify(effect.fromState)}, ${JSON.stringify({
      ...effect.toState,
      duration: effect.duration,
      ease: 'power3.out',
    })}, ${effect.at});`;
  })
  .join('\n      ');
const glyphAnimationJs = glyphRevealTimes
  .map((at, index) => `tl.set('[data-glyph-index="${index}"]', { autoAlpha: 1 }, ${at});`)
  .join('\n      ');

const html = `<!doctype html>
<html lang="zh-CN" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face {
        font-family: "Hiragino Sans GB";
        src: url("assets/fonts/Hiragino-Sans-GB.ttc") format("truetype");
        font-display: block;
        font-weight: 600 900;
      }
      @font-face {
        font-family: "Hiragino Sans GB W6";
        src: url("assets/fonts/Hiragino-Sans-GB.ttc") format("truetype");
        font-display: block;
        font-weight: 600 900;
      }
      :root {
        --ink: #111413;
        --paper: #ECECEA;
        --blue: #117ABD;
        --gold: #A96F00;
        --red: #D43C32;
        --yellow: #F4C542;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background: var(--paper);
        color: var(--ink);
        font-family: "Hiragino Sans GB W6", "Hiragino Sans GB", sans-serif;
      }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--paper); }
      .clip { position: absolute; }
      .opening-question {
        inset: 0;
        width: 1920px;
        height: 1080px;
        background-color: var(--paper);
        background-image:
          linear-gradient(rgba(17,20,19,.055) 2px, transparent 2px),
          linear-gradient(90deg, rgba(17,20,19,.055) 2px, transparent 2px);
        background-size: 72px 72px;
        z-index: 5;
      }
      .question-wrap {
        position: absolute;
        left: 70px;
        top: 88px;
        width: 1780px;
        height: 720px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 200px;
        line-height: 1.16;
        font-weight: 900;
        letter-spacing: -.035em;
        text-align: center;
      }
      .question-line { display: flex; justify-content: center; white-space: nowrap; }
      .glyph { display: inline-block; opacity: 0; visibility: hidden; }
      .glyph-ink { color: var(--ink); }
      .glyph-blue { color: var(--blue); }
      .glyph-gold { color: var(--gold); }
      .glyph-red { color: var(--gold); }
      .opening-agent {
        position: absolute;
        right: 82px;
        bottom: 46px;
        width: 184px;
        height: 246px;
        object-fit: contain;
      }
      .body-shell {
        left: 0;
        top: 0;
        width: 1920px;
        height: 1080px;
        background-color: var(--paper);
        background-image:
          linear-gradient(rgba(17,20,19,.055) 2px, transparent 2px),
          linear-gradient(90deg, rgba(17,20,19,.055) 2px, transparent 2px);
        background-size: 72px 72px;
        z-index: 1;
      }
      .masthead {
        position: absolute;
        left: 140px;
        right: 140px;
        top: 36px;
        height: 58px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 4px solid var(--ink);
        font-size: 28px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: .01em;
      }
      .masthead-brand { color: var(--blue); }
      .body-scene {
        left: 0;
        top: 94px;
        width: 1920px;
        height: 890px;
        z-index: 3;
      }
      .content {
        position: absolute;
        left: 220px;
        top: 26px;
        width: 1480px;
        height: 700px;
      }
      .pair-layout {
        display: grid;
        grid-template-columns: 720px 620px;
        gap: 140px;
        align-items: center;
      }
      .pair-layout.reverse { grid-template-columns: 620px 720px; }
      .copy-block { width: 720px; }
      .body-title {
        font-size: 78px;
        line-height: 1.18;
        font-weight: 900;
        letter-spacing: -.035em;
        margin-bottom: 36px;
      }
      .body-title.centered { text-align: center; margin-bottom: 32px; }
      .body-copy {
        font-size: 50px;
        line-height: 1.46;
        font-weight: 800;
        letter-spacing: -.02em;
      }
      .blue { color: var(--blue); }
      .gold { color: var(--gold); }
      .red { color: var(--red); }
      .underline-target { position: relative; display: inline-block; white-space: nowrap; }
      .semantic-underline {
        position: absolute;
        display: block;
        left: 0;
        bottom: -9px;
        width: 100%;
        height: 12px;
        border-radius: 999px;
        background: var(--yellow);
        transform: scaleX(0);
        transform-origin: left center;
      }
      .picture-element { display: block; object-fit: contain; will-change: transform, opacity; }
      .art-slot {
        width: 620px;
        height: 650px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pair-layout:not(.reverse) .art-slot,
      .pair-layout.reverse .art-slot { justify-content: center; }
      #s02-authority .art-slot { position: relative; left: -32px; }
      .wide-art { width: 620px; height: 600px; object-fit: contain; }
      .pack-art { width: 460px; height: 500px; }
      .tall-art { width: 450px; height: 540px; }
      .square-art { width: 480px; height: 480px; }
      .matrix-layout { display: block; }
      .matrix-grid {
        width: 1480px;
        height: 510px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 56px;
      }
      .matrix-card {
        height: 510px;
        border: 6px solid var(--ink);
        border-radius: 34px;
        background: rgba(236,236,234,.94);
        padding: 26px 28px;
        display: grid;
        grid-template-rows: 260px 94px 1fr;
        justify-items: center;
        align-items: center;
      }
      .auto-card { box-shadow: inset 0 18px 0 #A8D8F0; }
      .confirm-card { box-shadow: inset 0 18px 0 var(--yellow); }
      .block-card { box-shadow: inset 0 18px 0 #E25644; }
      .matrix-icon { width: 235px; height: 235px; }
      .matrix-name { font-size: 62px; line-height: 1; font-weight: 900; }
      .matrix-desc { font-size: 34px; line-height: 1.3; font-weight: 800; text-align: center; }
      .duo-art { position: relative; width: 620px; height: 650px; }
      #s06-follow-save .duo-art { left: -100px; }
      .duo-human { position: absolute; left: 0; bottom: 40px; width: 330px; height: 520px; }
      .duo-agent { position: absolute; left: 296px; bottom: 40px; width: 310px; height: 500px; }
      .risk-art { position: relative; width: 620px; height: 650px; }
      #s09-block .copy-block { position: relative; left: 100px; }
      .risk-prop { position: absolute; left: 0; top: 90px; width: 450px; height: 450px; }
      .risk-stop { position: absolute; right: 0; bottom: 72px; width: 280px; height: 280px; }
      .summary-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 110px;
        align-items: center;
      }
      .summary-row {
        display: flex;
        flex-direction: column;
        gap: 30px;
        font-size: 58px;
        line-height: 1.25;
        font-weight: 900;
      }
      .next-question {
        margin-top: 50px;
        color: var(--blue);
        font-size: 38px;
        line-height: 1.35;
        font-weight: 900;
      }
      .summary-agent { width: 300px; height: 470px; }
      .progress-rail {
        left: 0;
        right: 0;
        bottom: 0;
        height: 52px;
        display: grid;
        grid-template-columns: ${chapterDurations[0]}fr ${chapterDurations[1]}fr ${chapterDurations[2]}fr;
        gap: 4px;
        background: var(--paper);
        z-index: 7;
      }
      .rail-part {
        position: relative;
        height: 52px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #DDE0DA;
      }
      .rail-fill {
        position: absolute;
        inset: 0;
        background: #A8D8F0;
        transform: scaleX(0);
        transform-origin: left center;
      }
      .rail-label { position: relative; z-index: 2; color: var(--ink); font-size: 20px; line-height: 1; font-weight: 800; }
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
      <section
        id="s01-question"
        class="clip opening-question"
        data-start="0"
        data-duration="${questionSceneEnd.toFixed(3)}"
        data-track-index="5"
        data-scene-role="hook"
      >${sceneMarkup['s01-question']}</section>
      <div
        id="body-shell"
        class="clip body-shell"
        data-start="${questionSceneEnd.toFixed(3)}"
        data-duration="${(duration - questionSceneEnd).toFixed(3)}"
        data-track-index="1"
      >
        <div class="masthead"><span class="masthead-brand">Tiny Agent</span><span>Agent 自动炒股：行动权限</span></div>
      </div>
      ${contentSceneHtml}
      <div
        id="progress-rail"
        class="clip progress-rail"
        data-start="${questionSceneEnd.toFixed(3)}"
        data-duration="${(duration - questionSceneEnd).toFixed(3)}"
        data-track-index="7"
      >
        <div class="rail-part"><span id="rail-fill-1" class="rail-fill"></span><span class="rail-label">判断动作</span></div>
        <div class="rail-part"><span id="rail-fill-2" class="rail-fill"></span><span class="rail-label">自动执行</span></div>
        <div class="rail-part"><span id="rail-fill-3" class="rail-fill"></span><span class="rail-label">确认与阻断</span></div>
      </div>
      <audio
        id="narration"
        src="audio/narration.zh-CN.mp3"
        data-start="0"
        data-duration="${duration}"
        data-track-index="10"
        data-volume="1"
      ></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      gsap.set(".glyph", { autoAlpha: 0 });
      ${glyphAnimationJs}
      ${animationJs}
      tl.fromTo("#rail-fill-1", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, transformOrigin: "left center", duration: ${
        chapterDurations[0]
      }, ease: "none" }, ${chapterStarts[0]});
      tl.fromTo("#rail-fill-2", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, transformOrigin: "left center", duration: ${
        chapterDurations[1]
      }, ease: "none" }, ${chapterStarts[1]});
      tl.fromTo("#rail-fill-3", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, transformOrigin: "left center", duration: ${
        chapterDurations[2]
      }, ease: "none" }, ${chapterStarts[2]});
      window.__timelines.main = tl;
      window.__hyperframesAudit = {
        durationSeconds: ${duration},
        voice: "zh-CN-YunxiaNeural",
        rate: "+25%",
        question: ${JSON.stringify(question)},
        questionGlyphCount: ${glyphCount},
        firstGlyphRevealAt: ${glyphRevealTimes[0]},
        lastGlyphRevealAt: ${glyphRevealTimes.at(-1)},
        questionNarrationStart: ${questionNarrationStart},
        questionNarrationEnd: ${questionNarrationEnd},
        fullQuestionHoldSeconds: ${(questionSceneEnd - questionRevealEnd).toFixed(3)},
        openingAgentStatic: true,
        bodyMastheadPersistent: true,
        bodyProgressPersistent: true,
        bodySceneTransitionEffectCount: 0,
        textBodyAnimationCount: 0,
        picturePostEntranceMotionCount: 0
      };
    </script>
  </body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), html);
fs.writeFileSync(path.join(root, 'scene-plan.json'), `${JSON.stringify({ version: 2, durationSeconds: duration, scenes }, null, 2)}\n`);
fs.writeFileSync(
  path.join(root, 'animation-plan.json'),
  `${JSON.stringify(
    {
      version: 2,
      durationSeconds: duration,
      openingGlyphReveal: {
        elementCount: glyphCount,
        firstRevealAt: glyphRevealTimes[0],
        lastRevealAt: glyphRevealTimes.at(-1),
        times: glyphRevealTimes,
      },
      effects,
    },
    null,
    2,
  )}\n`,
);
fs.writeFileSync(
  path.join(root, 'timing-map.json'),
  `${JSON.stringify(
    {
      version: 2,
      locale: 'zh-CN',
      durationSeconds: duration,
      question: {
        sceneStart: 0,
        narrationStart: questionNarrationStart,
        narrationEnd: questionNarrationEnd,
        firstGlyphRevealAt: glyphRevealTimes[0],
        lastGlyphRevealAt: glyphRevealTimes.at(-1),
        cardEnd: questionSceneEnd,
        fullQuestionHoldSeconds: Number((questionSceneEnd - questionRevealEnd).toFixed(3)),
      },
      scenes: scenes.map(({ id, start, end }) => ({ id, start, end })),
      paragraphs,
      cues,
    },
    null,
    2,
  )}\n`,
);

const generatedAssets = [
  {
    id: 'person-agent-portfolio',
    path: 'assets/generated/scene-art/person-agent-portfolio.png',
    chromaSource: 'assets/generated/chroma-source/person-agent-portfolio.png',
    usedInScenes: ['s03-mother-case'],
    promptSummary: 'A person and Tiny Agent jointly review a simulated investment portfolio on a compact office laptop.',
  },
  {
    id: 'agent-safe-research',
    path: 'assets/generated/scene-art/agent-safe-research.png',
    chromaSource: 'assets/generated/chroma-source/agent-safe-research.png',
    usedInScenes: ['s07-automatic'],
    promptSummary: 'Tiny Agent reads public reports, calculates, and compares unlabeled simulation charts.',
  },
  {
    id: 'real-order-approval-gate',
    path: 'assets/generated/scene-art/real-order-approval-gate.png',
    chromaSource: 'assets/generated/chroma-source/real-order-approval-gate.png',
    usedInScenes: ['s08-confirm'],
    promptSummary: 'Tiny Agent waits at a locked real-order gate while a person reviews an approval card.',
  },
].map((asset) => ({
  ...asset,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset.path))).digest('hex'),
  generatorType: 'image-model',
  provider: 'OpenAI built-in imagegen',
  referenceAsset: 'assets/pack/sprites/agent/ask-front.png',
  backgroundProcessing: 'built-in imagegen chroma source + local chroma removal + alpha trim + 48px transparent padding',
  qaStatus: 'pending-runtime-validation',
}));
fs.writeFileSync(
  path.join(root, 'assets/generated/scene-art/provenance.json'),
  `${JSON.stringify({ version: 2, assets: generatedAssets }, null, 2)}\n`,
);

const assetFiles = [
  'assets/fonts/Hiragino-Sans-GB.ttc',
  'assets/pack/sprites/agent/ask-front.png',
  'assets/pack/sprites/agent/success.png',
  'assets/pack/sprites/agent/reason-front.png',
  'assets/pack/sprites/human/approve.png',
  'assets/pack/sprites/props/shield.png',
  'assets/pack/sprites/props/warning.png',
  'assets/pack/sprites/props/spreadsheet.png',
  'assets/pack/sprites/props/human-gate.png',
  'assets/pack/sprites/props/error.png',
  'assets/pack/sprites/props/stop.png',
  'assets/pack/sprites/props/prompt-injection.png',
  ...generatedAssets.map((asset) => asset.path),
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
fs.writeFileSync(path.join(root, 'assets-manifest.json'), `${JSON.stringify({ version: 2, assets }, null, 2)}\n`);

const scriptText = fs.readFileSync(path.join(root, 'narration.txt'), 'utf8').trim();
fs.writeFileSync(
  path.join(root, 'SCRIPT.zh-CN.md'),
  `# 让 Agent 自动炒股，哪些动作必须由人确认？\n\n${paragraphs
    .map((paragraph) => `## ${paragraph.start.toFixed(3)}s–${paragraph.end.toFixed(3)}s\n\n${paragraph.text}`)
    .join('\n\n')}\n\n> 说明：这是模拟投资账户的权限设计示例，不构成投资建议；真实资金和真实订单始终需要人明确确认。\n`,
);
fs.writeFileSync(
  path.join(root, 'BRIEF.md'),
  `# Tiny Agent 中文前 90 秒检查版\n\n- 主题：让 Agent 自动炒股，哪些动作必须由人确认？\n- 语言：简体中文\n- 画幅：1920×1080，16:9\n- 时长：${duration.toFixed(3)} 秒\n- 语音：zh-CN-YunxiaNeural，+25%\n- 范围：仅本地检查，不发布，不覆盖已通过的完整成片\n- 结构：逐字问题开场 → 风险来源 → 模拟账户母案例 → 三级权限矩阵 → 自动 / 确认 / 阻断\n- 视觉：首屏静止小 Agent；正文固定顶部标题与底部进度条；只切换中间内容；透明紧裁切临时插图；图片只做一次入场；文字只做黄色从左到右标注线\n\n旁白正文共 ${scriptText.length} 个字符。\n`,
);
fs.writeFileSync(
  path.join(root, 'STORYBOARD.md'),
  `# Storyboard\n\n| # | Time | Viewer-facing beat | Layout | Generated art |\n| --- | --- | --- | --- | --- |\n${scenes
    .map(
      (scene, index) =>
        `| ${String(index + 1).padStart(2, '0')} | ${scene.start.toFixed(3)}–${scene.end.toFixed(3)} | ${scene.title} | ${scene.layout} | ${
          scene.generatedArt ?? '—'
        } |`,
    )
    .join('\n')}\n\nAll body scenes reuse the same persistent masthead and progress rail. There are no full-frame transition covers.\n`,
);

console.log(
  JSON.stringify({
    status: 'built',
    durationSeconds: duration,
    scenes: scenes.length,
    pictureEffects: effects.filter((effect) => effect.effectType === 'picture-entrance').length,
    underlineEffects: effects.filter((effect) => effect.effectType === 'text-underline').length,
    glyphs: glyphCount,
  }),
);
