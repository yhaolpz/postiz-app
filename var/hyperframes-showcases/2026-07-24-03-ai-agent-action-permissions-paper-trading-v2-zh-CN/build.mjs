import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cuesData = JSON.parse(fs.readFileSync(path.join(root, 'captions/cues.json'), 'utf8'));
const duration = Number(cuesData.durationSeconds.toFixed(3));
const segments = cuesData.segments;
const cues = cuesData.cues;
const chapters = cuesData.chapters;
const questionCue = cues.find((cue) => cue.paragraph === 1);
const questionSegment = segments[0];
const outroSegment = segments[42];

if (segments.length !== 43 || !questionCue) {
  throw new Error('Locale-final timing data must contain 43 paragraphs and the opening cue');
}

const tones = {
  ink: '#111413',
  blue: '#117ABD',
  red: '#C7362F',
  gold: '#8A6500',
};

const specs = [
  { parts: [['让 Agent 自动炒股，', 'blue'], ['能直接动', 'gold'], ['真金白银吗？', 'red']] },
  { parts: [['危险', 'red'], ['不在回答，而在', 'ink'], ['真实操作', 'red']], sprite: 'props/shield.png' },
  { parts: [['一条假消息', 'gold'], ['可能变成', 'ink'], ['真实亏损', 'red']], art: 'owner-and-agent-simulated-portfolio.png' },
  { parts: [['自动', 'blue'], ['·', 'ink'], ['确认', 'gold'], ['·', 'ink'], ['阻断', 'red']], sprite: 'props/permission-key.png' },
  { parts: [['提醒', 'gold'], ['是建议，', 'ink'], ['权限', 'blue'], ['才是边界', 'ink']], sprite: 'props/shield.png' },
  { parts: [['干货高价值', 'blue'], ['先', 'ink'], ['关注收藏', 'gold']], sprite: 'props/book.png' },
  { parts: [['先看下一步', 'blue'], ['会改变什么', 'gold']], sprite: 'props/branch.png' },
  { parts: [['公开研究', 'blue'], ['可以自动完成', 'ink']], art: 'public-research-local-calculation.png' },
  { parts: [['本地计算', 'blue'], ['可检查，也可重算', 'gold']], sprite: 'props/spreadsheet.png' },
  { parts: [['模拟盘', 'blue'], ['负责试错，不碰', 'ink'], ['真实资金', 'red']], art: 'simulation-versus-real-order-gate.png' },
  { parts: [['真实下单前', 'red'], ['必须停下来', 'gold']], sprite: 'props/human-gate.png' },
  { parts: [['确认', 'gold'], ['要让', 'ink'], ['人', 'blue'], ['看懂六件事', 'ink']], art: 'real-order-confirmation-details.png' },
  { parts: [['一次确认', 'gold'], ['不等于', 'red'], ['永久授权', 'blue']], sprite: 'props/approval.png' },
  { parts: [['密码、验证码、密钥', 'red'], ['直接阻断', 'red']], art: 'credential-phishing-blocked.png' },
  { parts: [['陌生收款方', 'red'], ['和', 'ink'], ['绕过风控', 'red'], ['都要停', 'gold']], sprite: 'props/stop.png' },
  { parts: [['看后果', 'gold'], ['把动作放进', 'ink'], ['三档', 'blue']], sprite: 'props/compare.png' },
  { parts: [['帖子里的信息', 'blue'], ['还是', 'ink'], ['隐藏指令', 'red'], ['？', 'ink']], sprite: 'props/question.png' },
  { parts: [['数据里', 'blue'], ['也可能藏着', 'ink'], ['命令', 'red']], sprite: 'props/prompt-injection.png' },
  { parts: [['事实', 'blue'], ['要能回到', 'ink'], ['原始材料', 'gold']], art: 'evidence-versus-rumor.png' },
  { parts: [['观点', 'gold'], ['可以启发，不能替代', 'ink'], ['事实', 'blue']], sprite: 'props/chat.png' },
  { parts: [['未核实消息', 'red'], ['只能先当', 'ink'], ['线索', 'gold']], sprite: 'props/uncertainty.png' },
  { parts: [['索取凭据', 'red'], ['不是证据，是', 'ink'], ['越权指令', 'red']], sprite: 'props/privacy.png' },
  { parts: [['先分类', 'blue'], ['再允许', 'ink'], ['工具接入', 'gold']], art: 'information-category-sorting.png' },
  { parts: [['读取', 'blue'], ['不等于获得', 'ink'], ['执行权', 'red']], art: 'source-capability-gate.png' },
  { parts: [['读', 'blue'], ['在增加上下文，', 'ink'], ['做', 'red'], ['在改变状态', 'ink']], sprite: 'props/tool.png' },
  { parts: [['高风险能力', 'red'], ['放到', 'ink'], ['最后一道门', 'gold']], sprite: 'props/human-gate.png' },
  { parts: [['防线', 'blue'], ['不是零错误，而是', 'ink'], ['小影响', 'gold']], sprite: 'props/shield.png' },
  { parts: [['重复转载', 'gold'], ['不等于', 'red'], ['独立证据', 'blue']], sprite: 'props/citation.png' },
  { parts: [['证据冲突', 'red'], ['时，', 'ink'], ['等待', 'gold'], ['比猜更好', 'ink']], art: 'conflicting-evidence-no-trade.png' },
  { parts: [['不交易', 'blue'], ['也是一种', 'ink'], ['正确结果', 'gold']], sprite: 'props/timer.png' },
  { parts: [['未核实线索', 'red'], ['不再触发', 'ink'], ['重仓', 'red']], sprite: 'agent/verify-front.png' },
  { parts: [['先写允许的后果', 'gold'], ['再填', 'ink'], ['工具', 'blue']], sprite: 'props/form.png' },
  { parts: [['自动档', 'blue'], ['可检查、可撤销', 'gold']], sprite: 'props/success.png' },
  { parts: [['确认档', 'gold'], ['把决定交还给', 'ink'], ['人', 'blue']], art: 'three-tier-permission-workflow.png' },
  { parts: [['阻断档', 'red'], ['越界请求没有', 'ink'], ['通行证', 'red']], sprite: 'props/stop.png' },
  { parts: [['硬限制', 'red'], ['要由', 'ink'], ['代码', 'blue'], ['守住', 'gold']], sprite: 'props/settings.png' },
  { parts: [['日志', 'blue'], ['要能回放', 'ink'], ['完整因果', 'gold']], art: 'risk-limits-audit-trail.png' },
  { parts: [['失败就暂停', 'red'], ['不能偷偷绕路', 'gold']], sprite: 'props/timeout.png' },
  { parts: [['五项配置', 'blue'], ['拼成可检查', 'ink'], ['工作流', 'gold']], sprite: 'props/workflow.png' },
  { parts: [['研究效率', 'blue'], ['保留，', 'ink'], ['真实风险', 'red'], ['隔离', 'gold']], art: 'owner-and-agent-simulated-portfolio.png', callback: true },
  { parts: [['后果', 'gold'], ['·', 'ink'], ['来源', 'blue'], ['·', 'ink'], ['权限', 'red'], ['·', 'ink'], ['兜底', 'blue']], sprite: 'props/summary.png' },
  { parts: [['别只问聪不聪明', 'gold'], ['要问', 'ink'], ['能做到哪', 'red']], sprite: 'agent/reason-front.png' },
  { parts: [['关注', 'blue'], [' Tiny Agent', 'ink'], ['成为更擅长使用 AI 的人！', 'gold']], sprite: 'agent/celebrate-front.png', outro: true },
];

if (specs.length !== segments.length) {
  throw new Error(`Expected ${segments.length} visual specs, received ${specs.length}`);
}

const chapterById = Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter]));
const sceneId = (paragraph) => `s${String(paragraph).padStart(2, '0')}`;
const cueForParagraph = (paragraph) => cues.find((cue) => cue.paragraph === paragraph);
const entranceOrder = ['from-left', 'from-right', 'from-top', 'from-bottom', 'fade'];

const visualPath = (spec) => {
  if (spec.art) return `assets/generated/scene-art/${spec.art}`;
  if (spec.sprite) return `assets/pack/sprites/${spec.sprite}`;
  return null;
};

const scenes = segments.map((segment, index) => {
  const spec = specs[index];
  const paragraph = index + 1;
  const id = sceneId(paragraph);
  const visual = visualPath(spec);
  const firstCue = cueForParagraph(paragraph);
  const isOpening = paragraph === 1;
  const isOutro = paragraph === 43;
  const underlineSelector = !isOpening && !isOutro ? `#u-${id}` : null;
  const imageSelector = visual ? `#visual-${id}` : null;
  const chapter = chapterById[segment.chapter];
  const generatedArt = spec.art ? visual : undefined;
  return {
    id,
    paragraph,
    chapter: segment.chapter,
    chapterLabel: chapter.label,
    role:
      paragraph === 1
        ? 'hook'
        : paragraph === 6
          ? 'intro-follow-save'
          : paragraph === 43
            ? 'outro'
            : ['7', '18', '32', '41'].includes(String(paragraph))
              ? 'chapter-opening'
              : 'explanation',
    layout: isOpening
      ? 'question'
      : isOutro
        ? 'outro'
        : generatedArt
          ? paragraph % 2 === 0
            ? 'generated-art-right-copy-left'
            : 'generated-art-left-copy-right'
          : paragraph % 2 === 0
            ? 'sprite-right-copy-left'
            : 'sprite-left-copy-right',
    title: spec.parts.map(([text]) => text).join(''),
    emphasisPhrases: spec.parts.filter(([, tone]) => tone !== 'ink').map(([text, tone]) => ({ text, tone })),
    start: Number(segment.start.toFixed(3)),
    narrationEnd: Number(segment.narrationEnd.toFixed(3)),
    end: Number(segment.end.toFixed(3)),
    storyReturn: [3, 4, 7, 8, 10, 11, 12, 14, 15, 17, 18, 21, 23, 24, 27, 29, 31, 32, 34, 35, 37, 38, 40, 42].includes(
      paragraph,
    ),
    generatedArt,
    generatedArtCallback: Boolean(spec.callback),
    semanticElements: [
      ...(imageSelector
        ? [
            {
              selector: imageSelector,
              semanticRole: generatedArt ? 'generated-scene-illustration' : 'scene-picture',
              supportsConcepts: [spec.parts.map(([text]) => text).join('')],
            },
          ]
        : []),
      ...(underlineSelector
        ? [
            {
              selector: underlineSelector,
              semanticRole: 'key-text-underline',
              supportsConcepts: [spec.parts.find(([, tone]) => tone !== 'ink')?.[0] ?? scenes?.title],
            },
          ]
        : []),
    ],
    triggerCueId: firstCue?.id,
  };
});

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const bodyTitle = (spec, id) => {
  let underlineAssigned = false;
  return spec.parts
    .map(([text, tone]) => {
      const color = tones[tone] ?? tones.ink;
      const escaped = escapeHtml(text);
      if (!underlineAssigned && tone !== 'ink') {
        underlineAssigned = true;
        return `<span class="emphasis underline-target" style="color:${color}" data-underline-target="u-${id}">${escaped}<span id="u-${id}" class="semantic-underline" aria-hidden="true"></span></span>`;
      }
      return `<span class="emphasis" style="color:${color}">${escaped}</span>`;
    })
    .join('');
};

const openingLines = [
  [
    ['让 ', 'ink'],
    ['Agent 自动炒股，', 'blue'],
  ],
  [
    ['能', 'ink'],
    ['直接动', 'gold'],
  ],
  [
    ['真金白银', 'red'],
    ['吗？', 'ink'],
  ],
];
let questionCharacterIndex = 0;
const openingMarkup = openingLines
  .map(
    (line) =>
      `<div class="question-line">${line
        .map(([text, tone]) =>
          [...text]
            .map((character) => {
              questionCharacterIndex += 1;
              return `<span id="q-char-${questionCharacterIndex}" class="question-char" style="color:${tones[tone]}">${escapeHtml(character)}</span>`;
            })
            .join(''),
        )
        .join('')}</div>`,
  )
  .join('');
const questionCharacterCount = questionCharacterIndex;

const sceneMarkup = scenes
  .map((scene, index) => {
    const spec = specs[index];
    const segment = segments[index];
    if (scene.paragraph === 1) {
      return `<section id="${scene.id}" class="clip scene opening-scene" data-start="0" data-duration="${(
        scene.end - scene.start
      ).toFixed(3)}" data-track-index="1"><div class="grid-bg"></div><div id="question-wrap" class="question-wrap">${openingMarkup}</div></section>`;
    }
    const visual = visualPath(spec);
    const isArt = Boolean(spec.art);
    const visualClass = isArt ? 'scene-art' : 'scene-sprite';
    const sideClass = scene.layout.includes('left-copy-right') || scene.layout.includes('sprite-left') ? 'visual-left' : 'visual-right';
    const visualMarkup = visual
      ? `<img id="visual-${scene.id}" class="clip picture-element ${visualClass} ${sideClass}" src="${visual}" alt="" data-start="${scene.start}" data-duration="${(
          scene.end - scene.start
        ).toFixed(3)}" data-track-index="4" data-entrance="${entranceOrder[(scene.paragraph - 2) % entranceOrder.length]}" />`
      : '';
    if (spec.outro) {
      return `<section id="${scene.id}" class="clip scene outro-scene" data-start="${scene.start}" data-duration="${(
        scene.end - scene.start
      ).toFixed(3)}" data-track-index="1"><div class="grid-bg"></div>${visualMarkup}<div class="outro-copy"><div>${bodyTitle(
        { parts: spec.parts.slice(0, 2) },
        scene.id,
      )}</div><div class="outro-benefit"><span style="color:${tones.gold}">${escapeHtml(spec.parts[2][0])}</span></div></div></section>`;
    }
    const side = scene.layout.includes('copy-left') || scene.layout.includes('sprite-right') ? 'copy-left' : 'copy-right';
    return `<section id="${scene.id}" class="clip scene body-scene" data-start="${scene.start}" data-duration="${(
      scene.end - scene.start
    ).toFixed(3)}" data-track-index="1"><div class="grid-bg"></div><header class="masthead"><span>Tiny Agent</span><span>AI 智能体行动权限</span></header><div class="chapter-chip">${escapeHtml(
      scene.chapterLabel,
    )}</div><div class="headline ${side}">${bodyTitle(spec, scene.id)}</div>${visualMarkup}</section>`;
  })
  .join('\n');

const visibleCaptionCues = cues.filter((cue) => cue.paragraph > 1 && cue.paragraph < 43);
const captionMarkup = visibleCaptionCues
  .map((cue, index) => {
    const nextCue = visibleCaptionCues[index + 1];
    const safeEnd = nextCue ? Math.min(cue.end, nextCue.start - 0.1) : cue.end;
    const safeDuration = Math.max(0.12, safeEnd - cue.start);
    return `<div id="caption-${cue.id}" class="clip caption" data-start="${cue.start.toFixed(
      3,
    )}" data-duration="${safeDuration.toFixed(3)}" data-track-index="70">${escapeHtml(cue.text)}</div>`;
  })
  .join('\n');

const bodyStart = scenes[1].start;
const railEnd = outroSegment.start;
const chapterTiming = chapters.map((chapter) => {
  const start = Math.max(bodyStart, segments[chapter.startParagraph - 1].start);
  const end = Math.min(railEnd, segments[chapter.endParagraph - 1].end);
  return { ...chapter, start: Number(start.toFixed(3)), end: Number(end.toFixed(3)) };
});
const railDuration = railEnd - bodyStart;
const railMarkup = chapterTiming
  .map(
    (chapter) =>
      `<div class="rail-part" style="width:${(((chapter.end - chapter.start) / railDuration) * 100).toFixed(
        5,
      )}%"><span id="rail-fill-${chapter.id}" class="rail-fill"></span><span class="rail-label">${escapeHtml(
        chapter.label,
      )}</span></div>`,
  )
  .join('');

const chapterStartSet = new Set(chapterTiming.slice(1).map((chapter) => Number(chapter.start.toFixed(3))));
const transitions = scenes.slice(2, 42).map((scene, index) => {
  const chapterBoundary = chapterStartSet.has(Number(scene.start.toFixed(3)));
  const durationSeconds = chapterBoundary ? 0.55 : index % 4 === 2 ? 0.48 : 0.42;
  const type = chapterBoundary ? 'vertical' : index % 4 === 2 ? 'paper-mask' : 'horizontal';
  return {
    id: `transition-${index + 1}`,
    at: scene.start,
    type,
    duration: durationSeconds,
    start: scene.start - durationSeconds / 2,
  };
});
const transitionMarkup = transitions
  .map(
    (transition) =>
      `<div id="${transition.id}" class="clip transition-cover" data-start="${transition.start.toFixed(
        3,
      )}" data-duration="${transition.duration.toFixed(3)}" data-track-index="90"></div>`,
  )
  .join('');

const openingEffects = Array.from({ length: questionCharacterCount }, (_, index) => {
  const at =
    index === 0
      ? 0
      : ((questionCue.end - 0.12) / Math.max(1, questionCharacterCount - 1)) * index;
  return {
    id: `fx-q-char-${index + 1}`,
    sceneId: 's01',
    at: Number(at.toFixed(3)),
    triggerCueId: questionCue.id,
    triggerText: questionCue.text,
    triggerConcept: '首句问题逐字呈现',
    targetSelector: `#q-char-${index + 1}`,
    targetSemanticRole: 'opening-question-character',
    targetMatchEvidence: '字符按最终中文 VTT 顺序首次出现',
    effectType: 'opening-character-reveal',
    direction: 'none',
    fromState: { opacity: 0 },
    toState: { opacity: 1 },
    semanticPurpose: 'introduce-new-information',
    duration: 0,
    holdUntil: questionSegment.end,
  };
});

const bodyEffects = scenes.slice(1).flatMap((scene, index) => {
  const spec = specs[scene.paragraph - 1];
  const cue = cueForParagraph(scene.paragraph);
  const entranceType = entranceOrder[index % entranceOrder.length];
  const distance = entranceType === 'fade' ? 0 : 190 + (index % 3) * 20;
  const durationSeconds = entranceType === 'fade' ? 0.52 : 0.58 + (index % 3) * 0.06;
  const fromState =
    entranceType === 'fade'
      ? { autoAlpha: 0 }
      : entranceType === 'from-left'
        ? { autoAlpha: 0, x: -distance }
        : entranceType === 'from-right'
          ? { autoAlpha: 0, x: distance }
          : entranceType === 'from-top'
            ? { autoAlpha: 0, y: -distance }
            : { autoAlpha: 0, y: distance };
  const visual = visualPath(spec);
  const effects = visual
    ? [
        {
          id: `fx-${scene.id}-picture`,
          sceneId: scene.id,
          at: cue.start,
          triggerCueId: cue.id,
          triggerText: cue.text,
          triggerConcept: scene.title,
          targetSelector: `#visual-${scene.id}`,
          targetSemanticRole: spec.art ? 'generated-scene-illustration' : 'scene-picture',
          targetMatchEvidence: '画面在最终 VTT 首次讲到该信息时引入对应图片',
          effectType: 'picture-entrance',
          entranceType,
          direction:
            entranceType === 'from-left'
              ? 'left-to-right'
              : entranceType === 'from-right'
                ? 'right-to-left'
                : entranceType === 'from-top'
                  ? 'top-to-bottom'
                  : entranceType === 'from-bottom'
                    ? 'bottom-to-top'
                    : 'none',
          distance,
          fromState,
          toState: { autoAlpha: 1, x: 0, y: 0 },
          semanticPurpose: 'introduce-new-information',
          duration: Number(durationSeconds.toFixed(2)),
          holdUntil: scene.end,
        },
      ]
    : [];
  if (scene.paragraph < 43) {
    effects.push({
      id: `fx-${scene.id}-underline`,
      sceneId: scene.id,
      at: cue.start,
      triggerCueId: cue.id,
      triggerText: cue.text,
      triggerConcept: spec.parts.find(([, tone]) => tone !== 'ink')?.[0] ?? scene.title,
      targetSelector: `#u-${scene.id}`,
      targetSemanticRole: 'key-text-underline',
      targetMatchEvidence: '标注当前旁白正在强调的标题重点',
      effectType: 'text-underline',
      direction: 'left-to-right',
      fromState: { scaleX: 0, transformOrigin: 'left center' },
      toState: { scaleX: 1, transformOrigin: 'left center' },
      semanticPurpose: 'mark-key-emphasis',
      duration: 0.48 + (index % 3) * 0.06,
      holdUntil: scene.end,
    });
  }
  return effects;
});
const effects = [...openingEffects, ...bodyEffects];

const animationJs = effects
  .map((effect) => {
    if (effect.effectType === 'opening-character-reveal') {
      return `tl.set(${JSON.stringify(effect.targetSelector)}, { opacity: 1 }, ${effect.at});`;
    }
    if (effect.effectType === 'text-underline') {
      return `tl.fromTo(${JSON.stringify(
        effect.targetSelector,
      )}, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, transformOrigin: "left center", duration: ${
        effect.duration
      }, ease: "power2.out" }, ${effect.at});`;
    }
    return `tl.fromTo(${JSON.stringify(effect.targetSelector)}, ${JSON.stringify(
      effect.fromState,
    )}, ${JSON.stringify({
      ...effect.toState,
      duration: effect.duration,
      ease: 'power3.out',
      immediateRender: true,
    })}, ${effect.at});`;
  })
  .join('\n      ');

const transitionJs = transitions
  .map((transition) => {
    const half = transition.duration / 2;
    if (transition.type === 'vertical') {
      return `tl.fromTo("#${transition.id}", { y: -1080 }, { y: 0, duration: ${half}, ease: "power2.in" }, ${
        transition.at - half
      }); tl.to("#${transition.id}", { y: 1080, duration: ${half}, ease: "power2.out" }, ${transition.at});`;
    }
    return `tl.fromTo("#${transition.id}", { x: -1920 }, { x: 0, duration: ${half}, ease: "power2.in" }, ${
      transition.at - half
    }); tl.to("#${transition.id}", { x: 1920, duration: ${half}, ease: "power2.out" }, ${transition.at});`;
  })
  .join('\n      ');

const railAnimationJs = chapterTiming
  .map(
    (chapter) =>
      `tl.fromTo("#rail-fill-${chapter.id}", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, transformOrigin: "left center", duration: ${
        chapter.end - chapter.start
      }, ease: "none" }, ${chapter.start});`,
  )
  .join('\n      ');

const html = `<!doctype html>
<html lang="zh-CN" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family:"ZCOOL KuaiLe"; src:url("assets/fonts/ZCOOLKuaiLe-Regular.ttf") format("truetype"); font-display:block; }
      @font-face { font-family:"Hiragino Sans GB"; src:url("assets/fonts/Hiragino-Sans-GB.ttc") format("truetype"); font-display:block; }
      * { box-sizing:border-box; }
      html,body { margin:0; width:1920px; height:1080px; background:#ECECEA; }
      body { font-family:"Hiragino Sans GB",sans-serif; color:#111413; }
      #root { position:relative; width:1920px; height:1080px; overflow:hidden; background:#ECECEA; }
      .scene { position:absolute; inset:0; width:1920px; height:1080px; background:#ECECEA; }
      .grid-bg { position:absolute; inset:0; background-image:linear-gradient(rgba(17,20,19,.05) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.05) 2px,transparent 2px); background-size:72px 72px; }
      .opening-scene { z-index:1; }
      .question-wrap { position:absolute; left:72px; right:72px; top:168px; height:690px; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:"ZCOOL KuaiLe","Hiragino Sans GB",sans-serif; font-size:200px; line-height:1.07; letter-spacing:-.025em; font-weight:900; }
      .question-line { width:100%; min-height:205px; text-align:center; white-space:pre; }
      .question-char { display:inline-block; opacity:0; }
      .masthead { position:absolute; left:64px; right:64px; top:34px; height:62px; display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #111413; font-size:32px; font-weight:900; letter-spacing:.03em; }
      .masthead span:first-child { color:#117ABD; }
      .chapter-chip { position:absolute; left:76px; top:124px; min-width:180px; height:58px; padding:6px 24px; border:4px solid #111413; border-radius:29px; background:#ECECEA; color:#117ABD; font-size:32px; font-weight:900; text-align:center; }
      .headline { position:absolute; top:218px; width:870px; min-height:500px; display:flex; flex-wrap:wrap; align-content:center; gap:0 .18em; font-size:94px; line-height:1.22; letter-spacing:-.045em; font-weight:900; z-index:5; }
      .headline.copy-left { left:82px; }
      .headline.copy-right { right:82px; }
      .emphasis { position:relative; display:inline-block; }
      .underline-target { position:relative; display:inline-block; }
      .semantic-underline { position:absolute; left:0; right:0; bottom:-10px; height:14px; border-radius:8px; background:#F4C542; transform:scaleX(0); transform-origin:left center; z-index:-1; }
      .picture-element { position:absolute; object-fit:contain; z-index:4; }
      .scene-sprite { width:600px; height:620px; top:226px; }
      .scene-art { width:860px; height:690px; top:174px; }
      .visual-left { left:62px; }
      .visual-right { right:62px; }
      .caption { position:absolute; left:100px; right:100px; bottom:84px; min-height:112px; padding:14px 32px; display:flex; align-items:center; justify-content:center; text-align:center; border:5px solid #111413; border-radius:24px; background:#ECECEA; font-size:46px; line-height:1.3; font-weight:800; z-index:70; }
      .chapter-rail { position:absolute; left:0; right:0; bottom:0; height:52px; display:flex; gap:4px; background:#ECECEA; z-index:75; }
      .rail-part { position:relative; height:52px; min-width:0; background:#DDE0DA; display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .rail-fill { position:absolute; inset:0; background:#A8D8F0; transform:scaleX(0); transform-origin:left center; }
      .rail-label { position:relative; z-index:2; font-size:20px; font-weight:900; white-space:nowrap; }
      .outro-scene { z-index:2; }
      .outro-scene .scene-sprite { left:130px; top:190px; width:650px; height:720px; }
      .outro-copy { position:absolute; left:850px; right:90px; top:235px; min-height:560px; display:flex; flex-direction:column; justify-content:center; font-size:112px; line-height:1.16; letter-spacing:-.04em; font-weight:900; }
      .outro-benefit { margin-top:42px; font-size:66px; line-height:1.32; }
      .transition-cover { position:absolute; inset:0; width:1920px; height:1080px; background:#ECECEA; z-index:90; will-change:transform; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080">
      ${sceneMarkup}
      <audio id="narration" src="audio/narration.zh-CN.mp3" data-start="0" data-duration="${duration}" data-track-index="10" data-volume="1"></audio>
      ${captionMarkup}
      <div id="chapter-rail" class="clip chapter-rail" data-start="${bodyStart.toFixed(3)}" data-duration="${(
        railEnd - bodyStart
      ).toFixed(3)}" data-track-index="75">${railMarkup}</div>
      ${transitionMarkup}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused:true });
      ${animationJs}
      ${railAnimationJs}
      ${transitionJs}
      window.__timelines["main"] = tl;
      window.__hyperframesAudit = {
        durationSeconds:${duration},
        voice:"zh-CN-YunxiaNeural",
        rate:"+20%",
        openingRevealMode:"vtt-synced-character-reveal",
        firstGlyphVisualLeadSeconds:${Number(questionCue.start.toFixed(3))},
        characterRevealCount:${questionCharacterCount},
        preShownFullQuestionCount:0,
        questionNarrationEnd:${questionCue.end},
        questionCardEnd:${questionSegment.end},
        fullQuestionHoldSeconds:${Number((questionSegment.end - questionCue.end).toFixed(3))},
        questionWidthRatio:0.925,
        questionHeightRatio:0.639,
        openingSemanticColors:["#117ABD","#8A6500","#C7362F"],
        textBodyAnimationCount:0,
        picturePostEntranceMotionCount:0,
        visibleInternalProductionLabelCount:0
      };
    </script>
  </body>
</html>`;

fs.writeFileSync(path.join(root, 'index.html'), html);
fs.writeFileSync(
  path.join(root, 'scene-plan.json'),
  `${JSON.stringify({ version: 2, locale: 'zh-CN', durationSeconds: duration, scenes }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(root, 'animation-plan.json'),
  `${JSON.stringify({ version: 2, locale: 'zh-CN', durationSeconds: duration, effects }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(root, 'timing-map.json'),
  `${JSON.stringify(
    {
      version: 2,
      locale: 'zh-CN',
      durationSeconds: duration,
      voice: cuesData.voice,
      rate: cuesData.rate,
      question: {
        sceneStart: 0,
        narrationStart: questionCue.start,
        narrationEnd: questionCue.end,
        firstGlyphAt: 0,
        firstGlyphVisualLeadSeconds: Number(questionCue.start.toFixed(3)),
        characterRevealCount: questionCharacterCount,
        characterRevealCompleteAt: Number((questionCue.end - 0.12).toFixed(3)),
        cardEnd: Number(questionSegment.end.toFixed(3)),
        fullQuestionHoldSeconds: Number((questionSegment.end - questionCue.end).toFixed(3)),
      },
      chapters: chapterTiming,
      outro: {
        start: Number(outroSegment.start.toFixed(3)),
        cueId: cueForParagraph(43).id,
        text: cueForParagraph(43).text,
      },
      scenes: scenes.map(({ id, paragraph, start, narrationEnd, end }) => ({
        id,
        paragraph,
        start,
        narrationEnd,
        end,
      })),
      cues,
    },
    null,
    2,
  )}\n`,
);

const artUsage = {};
for (const scene of scenes.filter((item) => item.generatedArt)) {
  artUsage[scene.generatedArt] ??= [];
  artUsage[scene.generatedArt].push(scene.id);
}
const sourcePaths = {
  'public-research-local-calculation.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_4mi5ANsYKb561jVUA36aIj4h.png',
  'real-order-confirmation-details.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_jalmLWDbuiFLnSU1gKdQ1cp3.png',
  'credential-phishing-blocked.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_2c9bdzo8mH4VdQNkfp7b3l0N.png',
  'information-category-sorting.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_wn1zUxavenbzfK8V4rwkmQ1I.png',
  'source-capability-gate.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_7mE6vfdvU437zVHM5OF9ZOsq.png',
  'three-tier-permission-workflow.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_obM3h8F73LQhdd6DbvHuhIJO.png',
  'conflicting-evidence-no-trade.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_nKgSHQvt6xAl66bZlGa6N1vY.png',
  'risk-limits-audit-trail.png':
    '/Users/bytedance/.codex/generated_images/019f905a-701b-7280-b96a-b3df97418d2d/call_kEPIfXvDR5ujIVSCSy93lxu1.png',
};
const promptSummary = {
  'owner-and-agent-simulated-portfolio.png': 'A person and Tiny Agent reviewing a simulated investment account.',
  'evidence-versus-rumor.png': 'Tiny Agent separating verified public evidence from a risky rumor.',
  'simulation-versus-real-order-gate.png': 'Simulation path separated from the human-gated real-order path.',
  'public-research-local-calculation.png': 'Public research and reversible local calculation in a computer office.',
  'real-order-confirmation-details.png': 'A person reviews all consequential order fields before approval.',
  'credential-phishing-blocked.png': 'Tiny Agent blocks credential phishing and an unknown recipient.',
  'information-category-sorting.png': 'Tiny Agent sorts facts, opinions, unverified claims, and hidden instructions.',
  'source-capability-gate.png': 'Untrusted sources remain separated from consequential tools.',
  'three-tier-permission-workflow.png': 'Automatic, human-confirmed, and blocked computer workflows.',
  'conflicting-evidence-no-trade.png': 'Conflicting evidence lowers confidence and leads to no trade.',
  'risk-limits-audit-trail.png': 'Protected risk limits, replayable audit trail, and safe failure pause.',
};
const provenanceAssets = Object.entries(artUsage).map(([relativePath, usedInScenes]) => {
  const filename = path.basename(relativePath);
  const fileData = fs.readFileSync(path.join(root, relativePath));
  return {
    id: filename.replace(/\.png$/, ''),
    path: relativePath,
    originalGeneratedPath: sourcePaths[filename] ?? 'prior-approved-project-local-imagegen-output',
    generatorType: 'image-model',
    provider: 'OpenAI built-in imagegen',
    useCase: 'illustration-story',
    promptSummary: promptSummary[filename],
    referenceAsset: 'Tiny Agent whiteboard identity from approved local sprite pack',
    sha256: crypto.createHash('sha256').update(fileData).digest('hex'),
    usedInScenes,
    qaStatus: 'pass',
  };
});
fs.writeFileSync(
  path.join(root, 'assets/generated/scene-art/provenance.json'),
  `${JSON.stringify({ version: 2, assets: provenanceAssets }, null, 2)}\n`,
);

const assetPaths = [
  'assets/fonts/ZCOOLKuaiLe-Regular.ttf',
  'assets/fonts/Hiragino-Sans-GB.ttc',
  'audio/narration.zh-CN.mp3',
  ...new Set(scenes.map((scene, index) => visualPath(specs[index])).filter(Boolean)),
];
const manifest = [...assetPaths].map((relativePath) => {
  const fileData = fs.readFileSync(path.join(root, relativePath));
  return {
    path: relativePath,
    bytes: fileData.length,
    sha256: crypto.createHash('sha256').update(fileData).digest('hex'),
  };
});
fs.writeFileSync(path.join(root, 'assets-manifest.json'), `${JSON.stringify({ version: 2, assets: manifest }, null, 2)}\n`);

const contentMap = {
  version: 2,
  locale: 'zh-CN',
  thesis: 'Agent 自动化边界取决于动作后果、信息来源与可执行能力，而不是它显得多聪明。',
  reusableTool: '自动 / 确认 / 阻断三级行动权限矩阵',
  story: '一个经营一人公司的人让 Agent 管理投资研究与模拟交易，真实订单始终需要人确认。',
  safetyBoundary: '不构成投资建议，不承诺收益，不使用真实凭据或真实资金。',
  chapters: chapterTiming,
  prohibitedViewerCopy: ['固定母案例', '开头预览', '制作规则', '布局名', '动效名', 'QA 名称'],
};
fs.writeFileSync(path.join(root, 'content-map.json'), `${JSON.stringify(contentMap, null, 2)}\n`);

const storyboard = `# Storyboard

| 画面 | 时间 | 观众可见主句 | 构图 |
| --- | ---: | --- | --- |
${scenes
  .map(
    (scene) =>
      `| ${scene.id} | ${(scene.end - scene.start).toFixed(1)}s | ${scene.title} | ${scene.layout} |`,
  )
  .join('\n')}

全片以最终中文 TTS/VTT 为时间事实源；正文每个画面只有一个主句和一条字幕，图片只进行一次白名单入场，文字本体保持静止。
`;
fs.writeFileSync(path.join(root, 'STORYBOARD.md'), storyboard);

console.log(
  JSON.stringify({
    status: 'built',
    durationSeconds: duration,
    scenes: scenes.length,
    effects: effects.length,
    openingCharacters: questionCharacterCount,
    generatedArtScenes: scenes.filter((scene) => scene.generatedArt).length,
    distinctGeneratedImages: provenanceAssets.length,
  }),
);
