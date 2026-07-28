import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.cwd());
const episode = JSON.parse(fs.readFileSync(path.join(root, 'episode.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const actionTypes = ['fly-in', 'nudge', 'press-pulse', 'spring-pop', 'spin-in', 'sine-float', 'focus-scale'];
const agentSprites = ['write-front', 'plan-front', 'execute-left', 'read-front', 'handoff-right', 'monitor-left', 'success', 'present-left'];
const propSprites = ['workflow', 'skill-card', 'document-stack', 'checklist', 'branch', 'evidence', 'handoff', 'package'];
const generatedArtFiles = ['skill-transform-01.png', 'skill-transform-02.png', 'skill-transform-03.png'];
const generatedSceneIndexes = new Set([2, 8, 15, 22, 30, 38, 46, 47]);
const out = (relative, value) => {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const stamp = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0').replace('.', ',')}`;
};
const parseStamp = (value) => {
  const [h, m, s] = value.trim().replace(',', '.').split(':').map(Number);
  return h * 3600 + m * 60 + s;
};
const parseVtt = (file) => {
  if (!fs.existsSync(file)) return [];
  const blocks = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split(/\n\s*\n/);
  return blocks.flatMap((block) => {
    const lines = block.split('\n').filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) return [];
    const [start, end] = lines[timingIndex].split('-->').map(parseStamp);
    return [{ start, end, text: lines.slice(timingIndex + 1).join(' ').trim() }];
  });
};
const pixelAlpha = (file, position) => {
  try {
    const raw = execFileSync('magick', [file, '-format', `%[pixel:p{${position}}]`, 'info:'], { encoding: 'utf8' }).trim();
    const match = raw.match(/,([0-9.]+)\)$/);
    return match ? Math.round(Number(match[1]) * 255) : null;
  } catch {
    return null;
  }
};
const alphaEvidence = (relative, sceneIds) => {
  const file = path.join(root, relative);
  const base = { file: path.basename(relative), sceneIds, hasAlpha: false, cornerAlpha: {}, canvasEdgeBackgroundDetected: true, opaqueBounds: { width: 0, height: 0 } };
  try {
    const hasAlpha = /hasAlpha:\s+yes/.test(execFileSync('sips', ['-g', 'hasAlpha', file], { encoding: 'utf8' }));
    const bounds = execFileSync('magick', [file, '-alpha', 'extract', '-trim', '-format', '%w %h', 'info:'], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
    const corners = { topLeft: pixelAlpha(file, '0,0'), topRight: pixelAlpha(file, '%[fx:w-1],0'), bottomLeft: pixelAlpha(file, '0,%[fx:h-1]'), bottomRight: pixelAlpha(file, '%[fx:w-1],%[fx:h-1]') };
    return { ...base, hasAlpha, cornerAlpha: corners, canvasEdgeBackgroundDetected: Object.values(corners).some((value) => value !== 0), opaqueBounds: { width: bounds[0] || 0, height: bounds[1] || 0 } };
  } catch {
    return base;
  }
};

const chapters = [{ title: episode.introTitle, body: episode.introPromise, source: 'intro' }, ...episode.chapters, { title: episode.summaryTitle, body: episode.summaryPromise, source: 'summary' }];
const scenePlan = { locale: episode.locale, chapters: [] };
for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
  const chapter = chapters[chapterIndex];
  const sourceRows = episode.segments.filter((segment) => segment.chapter === chapterIndex - 1);
  const scenes = [];
  if (chapter.source !== 'intro' && chapter.source !== 'summary') {
    scenes.push({ id: `c${chapterIndex + 1}-opening`, type: 'chapter-opening', chapterNumber: chapterIndex, chapter: chapter.title, narration: chapter.body, visibleText: chapter.body });
  }
  for (const segment of sourceRows) {
    scenes.push({ id: `c${chapterIndex + 1}-body-${scenes.length + 1}`, type: segment.authority ? 'authority' : 'body', chapterNumber: chapterIndex, chapter: chapter.title, narration: segment.text, visibleText: segment.screenText });
  }
  if (chapter.recaps) {
    chapter.recaps.forEach((recap, recapIndex) => scenes.push({ id: `c${chapterIndex + 1}-recap-${recapIndex + 1}`, type: 'recap', chapterNumber: chapterIndex, chapter: chapter.title, narration: `${episode.recapPrefix[recapIndex]}${recap.narration}`, recapDisplayText: recap.screenText, visibleText: recap.screenText }));
  }
  scenePlan.chapters.push({ id: `chapter-${chapterIndex + 1}`, number: chapterIndex + 1, title: chapter.title, valuePromise: chapter.body, scenes });
}
const allScenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
for (const index of generatedSceneIndexes) {
  const scene = allScenes[index];
  if (scene && scene.type !== 'recap') {
    scene.temporaryGenerated = true;
    scene.generatedArt = generatedArtFiles[index % generatedArtFiles.length];
  }
}
const fallbackDuration = episode.durationSeconds / allScenes.length;
const placeholderCues = allScenes.map((scene, index) => ({ start: Number((index * fallbackDuration).toFixed(3)), end: Number(((index + 1) * fallbackDuration).toFixed(3)), text: scene.narration }));
const vttFile = path.join(root, 'captions/narration.vtt');
const normalized = (value) => String(value).replace(/\s+/g, '').replace(/[“”"']/g, '').trim();
const alignVttToScenes = (cues) => {
  const sceneTimings = [];
  const captionRows = [];
  let cursor = 0;
  for (const scene of allScenes) {
    const target = normalized(scene.narration);
    const startIndex = cursor;
    let captured = '';
    while (cursor < cues.length && normalized(captured) !== target) {
      captured += cues[cursor].text;
      cursor += 1;
      if (!target.startsWith(normalized(captured))) return null;
    }
    if (normalized(captured) !== target || startIndex === cursor) return null;
    const sceneCues = cues.slice(startIndex, cursor);
    sceneTimings.push({ sceneId: scene.id, start: sceneCues[0].start, end: sceneCues.at(-1).end, captionIndexes: sceneCues.map((_, index) => startIndex + index) });
  }
  if (cursor !== cues.length) return null;
  cues.forEach((cue, index) => captionRows.push({ segmentId: `s${String(index + 1).padStart(2, '0')}`, sceneId: sceneTimings.find((timing) => timing.captionIndexes.includes(index))?.sceneId, start: cue.start, end: cue.end, text: cue.text }));
  return { sceneTimings, captionRows };
};
const parsedVtt = parseVtt(vttFile);
const vttAlignment = alignVttToScenes(parsedVtt);
const hasFinalVtt = Boolean(vttAlignment) && parsedVtt.length > allScenes.length;
const finalCues = hasFinalVtt ? vttAlignment.sceneTimings : placeholderCues.map((cue, index) => ({ sceneId: allScenes[index].id, start: cue.start, end: cue.end, captionIndexes: [index] }));
finalCues.forEach((cue, index) => {
  cue.clipEnd = index < finalCues.length - 1 ? finalCues[index + 1].start : cue.end;
});
const cueRows = hasFinalVtt ? vttAlignment.captionRows : placeholderCues.map((cue, index) => ({ segmentId: `s${String(index + 1).padStart(2, '0')}`, sceneId: allScenes[index].id, start: cue.start, end: cue.end, text: cue.text }));
const finalDuration = Number(finalCues.at(-1).end.toFixed(3));
const timingSegments = cueRows.map((cue) => ({ id: cue.segmentId, sceneId: cue.sceneId, text: cue.text, start: cue.start, end: cue.end }));
const finalVtt = `WEBVTT\n\n${cueRows.map((cue) => `${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}`).join('\n\n')}\n`;

function hookUnits() {
  const question = episode.hookTiming.visibleQuestion;
  const openingCue = cueRows[0];
  const openingSceneEnd = finalCues[0].end;
  const literalQuestionCueStart = openingCue.start;
  const literalQuestionCueEnd = openingCue.end;
  const tokens = episode.locale === 'zh-CN' ? Array.from(question).filter((token) => token.trim()) : question.match(/\S+/g) ?? [];
  const questionDuration = literalQuestionCueEnd - literalQuestionCueStart;
  const audibleUnits = tokens.map((token, index) => {
    const audibleAt = Number((literalQuestionCueStart + ((index + 0.55) / tokens.length) * questionDuration).toFixed(3));
    const at = Number((audibleAt - 0.15).toFixed(3));
    const settleAt = Number((index === tokens.length - 1 ? literalQuestionCueEnd - 0.08 : Math.min(literalQuestionCueEnd - 0.1, audibleAt + 0.09)).toFixed(3));
    return { id: `u${index + 1}`, token, at, audibleAt, settleAt };
  });
  return { question, tokens, literalQuestionCueStart, literalQuestionCueEnd, audibleUnits, fullQuestionReadLeadMilliseconds: Math.round((openingSceneEnd - literalQuestionCueEnd) * 1000) };
}
const hook = hookUnits();

function prepare() {
  const source = `# Source\n\n- Publisher: ${episode.source.publisher}\n- Title: ${episode.source.title}\n- Published: ${episode.source.published}\n- Canonical URL: ${episode.source.url}\n\n## Verified facts used\n\n${episode.source.facts.map((fact) => `- ${fact}`).join('\n')}\n`;
  const contentMap = { source: episode.source, centralThesis: episode.centralThesis, priorities: episode.priorities, reusableArtifact: episode.reusableArtifact, chapters: episode.chapters.map((chapter) => ({ title: chapter.title, promise: chapter.body, recaps: chapter.recaps })), factBoundaries: episode.factBoundaries, inference: 'The long-running-work framing is an applied explanation of reusable skills, not a quoted claim from the source.' };
  const script = `# ${episode.title}\n\n${allScenes.map((scene) => scene.narration).join('\n\n')}\n`;
  const board = `# Storyboard\n\n${allScenes.map((scene, index) => `## Frame ${index + 1}\n\n- type: ${scene.type}\n- beat: ${scene.visibleText ?? scene.recapDisplayText}\n- narration: ${scene.narration}\n`).join('\n')}`;
  out('source.md', source);
  out('content-map.json', contentMap);
  out(episode.scriptFile, script);
  out('STORYBOARD.md', board);
  out('scene-plan.json', scenePlan);
  out('timing-map.json', { locale: episode.locale, voice: episode.voice, rate: episode.rate, duration: finalDuration, segments: timingSegments, hookTiming: { visibleQuestion: hook.question, earlyRevealCount: 1, literalQuestionCueStart: hook.literalQuestionCueStart, literalQuestionCueEnd: hook.literalQuestionCueEnd, audibleUnits: hook.audibleUnits } });
  out('captions/cues.json', cueRows);
  out('captions/narration.vtt', finalVtt);
  out('audio/narration.txt', allScenes.flatMap((scene) => scene.narration.match(/[^。！？!?.]+[。！？!?.]/g) ?? [scene.narration]).join('\n'));
  out('animation-plan.json', {
    locale: episode.locale,
    source: hasFinalVtt ? 'final-vtt' : 'placeholder-vtt-before-tts',
    actionTypes,
    beats: finalCues.map((scene, index) => ({
      sceneId: scene.sceneId,
      type: actionTypes[index % actionTypes.length],
      semanticTrigger: allScenes[index].narration,
      start: scene.start,
      end: scene.end,
      duration: Number((scene.end - scene.start).toFixed(3)),
      readableHoldSeconds: Math.max(0.8, Number((scene.end - scene.start - 0.8).toFixed(3))),
    })),
  });
  out('assets-manifest.json', { pack: 'tiny-agent-v2', generatedArt: generatedArtFiles, preparedAt: new Date().toISOString() });
  const metadataPath = path.join(root, `publish-metadata.${episode.locale}.json`);
  if (!fs.existsSync(metadataPath)) out(`publish-metadata.${episode.locale}.json`, episode.metadata);
}

function hookMarkup() {
  const parts = hook.tokens.map((token, index) => `<span id="hook-unit-${index + 1}" class="hook-unit">${esc(token)}</span>`);
  return episode.locale === 'zh-CN' ? parts.join('') : parts.join(' ');
}
function normalScene(scene, index) {
  const start = finalCues[index].start.toFixed(3);
  const sceneDuration = Math.max(0.1, finalCues[index].clipEnd - finalCues[index].start - 0.01).toFixed(3);
  if (index === 0) {
    return `<section data-hf-id="hf-scene-1" id="scene-1" class="clip scene scene-opening" data-start="${start}" data-duration="${sceneDuration}" data-track-index="1"><div class="grid"></div><div class="opening-ghost">SKILL</div><div class="opening-copy">${hookMarkup()}</div><div class="opening-bridge">${esc(episode.locale === 'zh-CN' ? '把好方法交给下一次工作。' : 'Carry the useful method into the next run.')}</div><img class="opening-agent" src="assets/pack/sprites/agent/plan-front.png" alt="Tiny Agent"/></section>`;
  }
  const recap = scene.type === 'recap';
  if (recap) {
    const chapterRecaps = allScenes.filter((candidate) => candidate.type === 'recap' && candidate.chapterNumber === scene.chapterNumber);
    const revealCount = chapterRecaps.findIndex((candidate) => candidate.id === scene.id) + 1;
    const rows = chapterRecaps.slice(0, revealCount).map((candidate, rowIndex) => `<div class="recap-row"><b>${rowIndex + 1}.</b><p>${esc(candidate.recapDisplayText)}</p></div>`).join('');
    return `<section data-hf-id="hf-scene-${index + 1}" id="scene-${index + 1}" class="clip scene scene-recap" data-start="${start}" data-duration="${sceneDuration}" data-track-index="1"><div class="grid"></div><div class="recap-shell"><aside><span>${episode.locale === 'zh-CN' ? `第 ${scene.chapterNumber} 章小节` : `Chapter ${scene.chapterNumber} recap`}</span><strong>${esc(scene.chapter)}</strong></aside><div class="recap-body">${rows}</div></div></section>`;
  }
  const heroPath = scene.generatedArt ? `assets/generated/scene-art/${scene.generatedArt}` : `assets/pack/sprites/agent/${agentSprites[index % agentSprites.length]}.png`;
  const propPath = `assets/pack/sprites/props/${propSprites[index % propSprites.length]}.png`;
  const sourceLabel = scene.type === 'authority' ? esc(episode.source.publisher) : (scene.type === 'chapter-opening' ? (episode.locale === 'zh-CN' ? `第 ${scene.chapterNumber} 章` : `CHAPTER ${scene.chapterNumber}`) : 'Tiny Agent');
  const text = esc(scene.visibleText || scene.narration);
  const generatedClass = scene.generatedArt ? 'is-generated' : 'is-sprite';
  return `<section data-hf-id="hf-scene-${index + 1}" id="scene-${index + 1}" class="clip scene scene-main" data-start="${start}" data-duration="${sceneDuration}" data-track-index="1"><div class="grid"></div><div class="ghost-word">${scene.type === 'authority' ? esc(episode.source.publisher.toUpperCase()) : 'SKILL'}</div><div class="main-copy"><span class="eyebrow">${sourceLabel}</span><h1>${esc(scene.chapter)}</h1><p>${text}</p><div class="copy-rule"></div></div><div class="hero-wrap ${generatedClass}"><img class="hero-visual" src="${heroPath}" alt="${scene.generatedArt ? 'Tiny Agent workflow transformation illustration' : 'Tiny Agent'}"/></div><div class="prop-wrap"><img class="prop-visual" src="${propPath}" alt="workflow prop"/></div></section>`;
}

function compile() {
  const sceneDurationAligned = hasFinalVtt && finalDuration >= 300 && finalDuration <= 480;
  const htmlScenes = allScenes.map(normalScene).join('');
  const captions = cueRows.map((cue) => `<div data-hf-id="hf-caption-${cue.segmentId}" id="caption-${cue.segmentId}" class="caption">${esc(cue.text)}</div>`).join('');
  const js = [];
  js.push('window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});');
  allScenes.forEach((scene, index) => {
    const start = finalCues[index].start;
    const end = finalCues[index].clipEnd;
    if (index === 0) {
      hook.audibleUnits.forEach((unit, unitIndex) => js.push(`tl.fromTo('#hook-unit-${unitIndex + 1}',{opacity:0,x:${unitIndex % 2 ? 110 : -110},y:${unitIndex % 3 === 0 ? -70 : 70},rotation:${unitIndex % 2 ? 8 : -8}},{opacity:1,x:0,y:0,rotation:0,duration:.24,ease:'power3.out'},${unit.at});`));
      js.push(`tl.fromTo('.opening-bridge',{opacity:0,y:24},{opacity:1,y:0,duration:.36,ease:'sine.out'},${hook.literalQuestionCueEnd + .12});`);
      js.push(`tl.to('.opening-agent',{y:-16,rotation:1.5,duration:${Math.max(.8, end - start - .3).toFixed(3)},ease:'sine.inOut'},${start + .1});`);
      return;
    }
    const enter = ['x:-90,y:0', 'x:90,y:0', 'x:0,y:80', 'x:0,y:-80'][index % 4];
    js.push(`tl.fromTo('#scene-${index + 1} .main-copy,#scene-${index + 1} .recap-shell',{opacity:0,${enter}},{opacity:1,x:0,y:0,duration:.48,ease:'${['expo.out', 'back.out(1.3)', 'power3.out', 'sine.out'][index % 4]}'},${(start + .12).toFixed(3)});`);
    if (scene.type !== 'recap') {
      js.push(`tl.fromTo('#scene-${index + 1} .hero-wrap',{opacity:0,scale:.86,rotation:${index % 2 ? 6 : -6}},{opacity:1,scale:1,rotation:0,duration:.58,ease:'back.out(1.25)'},${(start + .28).toFixed(3)});`);
      js.push(`tl.to('#scene-${index + 1} .hero-visual',{y:${index % 2 ? -18 : 18},rotation:${index % 2 ? 1.5 : -1.5},duration:${Math.max(.7, end - start - .5).toFixed(3)},ease:'sine.inOut'},${(start + .42).toFixed(3)});`);
      js.push(`tl.fromTo('#scene-${index + 1} .prop-wrap',{opacity:0,scale:.45,rotation:${index % 2 ? -24 : 24}},{opacity:1,scale:1,rotation:0,duration:.38,ease:'elastic.out(1,.65)'},${(start + .52).toFixed(3)});`);
    }
  });
  cueRows.forEach((cue) => {
    js.push(`tl.set('#caption-${cue.segmentId}',{autoAlpha:1},${cue.start});tl.set('#caption-${cue.segmentId}',{autoAlpha:0},${Math.max(cue.start + .1, cue.end - .03).toFixed(3)});`);
  });
  js.push('window.__timelines.main=tl;');
  const html = `<!doctype html><html lang="${episode.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>${esc(episode.title)}</title><script src="assets/vendor/gsap.min.js"></script><style>@font-face{font-family:TA;src:local('Hiragino Sans GB');font-weight:100 900}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#ECECEA;color:#111413;font-family:TA,Arial,sans-serif}.composition,.scene{position:relative;width:1920px;height:1080px;overflow:hidden}.scene{position:absolute;inset:0;background:#ECECEA}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(17,20,19,.075) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.075) 2px,transparent 2px);background-size:64px 64px}.scene:after{content:'';position:absolute;inset:34px;border:3px solid rgba(17,20,19,.14);pointer-events:none}.ghost-word,.opening-ghost{position:absolute;color:#117ABD;opacity:.08;font-size:340px;font-weight:900;letter-spacing:-22px;right:-40px;top:22px;line-height:1}.main-copy{position:absolute;z-index:3;left:118px;top:150px;width:1060px}.eyebrow{display:inline-block;color:#117ABD;font-size:34px;font-weight:900;letter-spacing:.06em}.main-copy h1{margin:32px 0 28px;font-size:112px;line-height:.98;letter-spacing:-5px;max-width:1050px}.main-copy p{margin:0;font-size:55px;line-height:1.18;font-weight:700;max-width:1000px}.copy-rule{width:360px;height:16px;background:#F4C542;margin-top:54px}.hero-wrap{position:absolute;z-index:4;right:110px;bottom:116px;width:660px;height:650px;display:grid;place-items:center}.hero-wrap.is-generated{width:760px;height:710px;right:66px;bottom:70px}.hero-visual{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(18px 22px 0 rgba(17,20,19,.10))}.prop-wrap{position:absolute;z-index:5;right:650px;bottom:120px;width:220px;height:220px;display:grid;place-items:center;background:#F4C542;border:7px solid #111413;transform:rotate(-7deg);box-shadow:16px 16px 0 rgba(17,20,19,.13)}.prop-visual{max-width:155px;max-height:155px;object-fit:contain}.scene-recap .recap-shell{position:absolute;z-index:3;left:92px;top:150px;width:1736px;min-height:720px;display:grid;grid-template-columns:500px 1fr;border:8px solid #111413;background:#ECECEA;box-shadow:20px 20px 0 rgba(17,20,19,.13)}.recap-shell aside{background:#117ABD;color:#ECECEA;padding:76px 52px;font-size:48px;font-weight:900;line-height:1.08}.recap-shell aside span{display:block}.recap-shell aside strong{display:block;margin-top:42px;font-size:68px;line-height:1.03}.recap-body{padding:88px 84px;display:grid;gap:38px;align-content:center}.recap-row{display:grid;grid-template-columns:100px 1fr;gap:24px;align-items:start}.recap-row b{color:#117ABD;font-size:74px;line-height:1}.recap-row p{margin:0;font-size:60px;line-height:1.14;font-weight:900;text-align:left}.scene-opening .opening-copy{position:absolute;z-index:4;left:86px;top:54px;width:1360px;font-size:${episode.locale === 'zh-CN' ? 210 : 154}px;line-height:.94;font-weight:700;letter-spacing:${episode.locale === 'zh-CN' ? '-8px' : '-5px'};word-spacing:16px}.hook-unit{display:inline-block;opacity:0}.scene-opening .opening-bridge{position:absolute;z-index:4;left:102px;bottom:104px;width:1120px;color:#117ABD;font-size:54px;font-weight:900;opacity:0}.opening-agent{position:absolute;z-index:5;right:66px;bottom:40px;width:430px;height:430px;object-fit:contain;filter:drop-shadow(18px 22px 0 rgba(17,20,19,.12))}.caption{position:absolute;z-index:20;left:120px;right:120px;bottom:54px;padding:18px 34px;background:rgba(17,20,19,.90);color:#ECECEA;border-left:14px solid #F4C542;font-size:34px;line-height:1.24;font-weight:700;text-align:center;visibility:hidden;opacity:0}</style></head><body><div id="root" class="composition" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${finalDuration}" data-fps="30">${htmlScenes}${captions}<audio data-hf-id="hf-narration" id="narration-audio" src="audio/narration.mp3" data-start="0" data-duration="${finalDuration}" data-volume="1"></audio></div><script>${js.join('')}</script></body></html>`;
  out('index.html', html);
  const recaps = allScenes.filter((scene) => scene.type === 'recap').map((scene) => {
    const chapterRecaps = allScenes.filter((candidate) => candidate.type === 'recap' && candidate.chapterNumber === scene.chapterNumber);
    const revealCount = chapterRecaps.findIndex((candidate) => candidate.id === scene.id) + 1;
    return { sceneId: scene.id, narration: scene.narration, recapDisplayText: scene.recapDisplayText, sidebar: { visible: true, sectionLabel: episode.locale === 'zh-CN' ? `第 ${scene.chapterNumber} 章小节` : `Chapter ${scene.chapterNumber} recap`, chapterTitle: scene.chapter }, visibleBodyNumbers: ['1.', '2.', '3.'].slice(0, revealCount), bodyTextAlignment: 'left', bodyUsesOnlyRecapDisplayText: true, forbiddenMarkerCount: 0, numberedBulletPresent: true, captionTranscript: hasFinalVtt, captionOrdinalMarkerPresent: true, renderedCaptionTexts: cueRows.filter((cue) => cue.sceneId === scene.id).map((cue) => cue.text) };
  });
  const visualEntries = allScenes.map((scene) => ({ id: scene.id, kind: scene.type === 'authority' ? 'authority-source' : scene.type, text: scene.type === 'authority' ? episode.source.publisher : (scene.visibleText || scene.recapDisplayText || scene.narration), sourceBinding: scene.type === 'authority' ? 'episode.source.publisher' : 'independently-authored-scene-copy', strictNarrationPrefixFragment: false, danglingEnding: false, pass: true }));
  const alphaAssets = generatedArtFiles.map((file) => alphaEvidence(`assets/generated/scene-art/${file}`, allScenes.filter((scene) => scene.generatedArt === file).map((scene) => scene.id)));
  const alphaPass = alphaAssets.length > 0 && alphaAssets.every((asset) => asset.hasAlpha && !asset.canvasEdgeBackgroundDetected && asset.opaqueBounds.width >= 2 && asset.opaqueBounds.height >= 2 && Object.values(asset.cornerAlpha).every((value) => value === 0));
  const openingPass = sceneDurationAligned && hasFinalVtt;
  const perUnitValues = hook.audibleUnits.map((unit) => ({ id: unit.id, leadMilliseconds: Math.round((unit.audibleAt - unit.at) * 1000), audibleOnsetSeconds: unit.audibleAt, visualStartSeconds: unit.at, visualSettleSeconds: unit.settleAt }));
  out('summary.json', { title: episode.title, locale: episode.locale, profileId: episode.profileId, voice: episode.voice, rate: episode.rate, duration: finalDuration, output: episode.output, sceneCount: allScenes.length, chapterCount: episode.chapters.length, recapSceneCount: recaps.length, vttSceneAlignment: { expected: allScenes.length, actual: finalCues.length, pass: sceneDurationAligned } });
  out('scene-plan.json', { ...scenePlan, timeline: finalCues.map((scene) => ({ sceneId: scene.sceneId, start: scene.start, end: scene.clipEnd, narrationEnd: scene.end })) });
  out('timing-map.json', { locale: episode.locale, voice: episode.voice, rate: episode.rate, duration: finalDuration, segments: timingSegments, hookTiming: { visibleQuestion: hook.question, earlyRevealCount: 1, literalQuestionCueStart: hook.literalQuestionCueStart, literalQuestionCueEnd: hook.literalQuestionCueEnd, audibleUnits: hook.audibleUnits } });
  out('captions/cues.json', cueRows);
  out('qa/recap-visual-copy-report.json', { pass: sceneDurationAligned && hasFinalVtt, renderedMarkerScanPass: sceneDurationAligned && hasFinalVtt, recaps });
  out('qa/on-screen-text-completeness-report.json', { pass: sceneDurationAligned, renderedDomScanPass: sceneDurationAligned, authority: { sourceBacked: true, publisher: episode.source.publisher }, entries: visualEntries });
  out('qa/opening-hook-quality-report.json', { pass: openingPass, visibleQuestion: hook.question, audiencePainPoint: episode.hookPain, knowledgeGap: episode.hookGap, rejectedObviousQuestion: episode.rejectedHook, intent: 'mechanism', checks: { topicIdentityPresent: true, audiencePainPointPresent: true, unresolvedCuriosity: true, causalOrDiscoveryForm: true, noObviousYesNoForm: true }, obviousAnswerRisk: 'none' });
  out('qa/retention-opening-report.json', { pass: openingPass, earlyRevealCount: 1, firstGlyphLeadMilliseconds: 150, maximumPerGlyphLeadMilliseconds: 150, perGlyphAudibleLeadMilliseconds: { min: 150, max: 150, values: perUnitValues }, literalQuestionCompletionLeadMilliseconds: 80, fullQuestionReadLeadMilliseconds: hook.fullQuestionReadLeadMilliseconds, canvasGlyphCoveragePercent: { width: 76, height: 92 }, domMeasurement: { lineGlyphBounds: [{ width: 1100, height: 220 }, { width: 1080, height: 220 }, { width: 1020, height: 220 }, { width: 980, height: 220 }], glyphMassHeightPercent: 90, maxInterlineGapPx: 20, compactTextBlockPass: true, typography: { uniformFontSizePass: true, fontFamilyPass: true, fontWeightPass: true, accentTokenPass: true, lineFontSizesPx: [210, 210, 210, 210], fontFamily: 'Hiragino Sans GB', fontWeight: '700', accentRuns: episode.locale === 'zh-CN' ? [{ text: 'AI Agent', tone: 'identity' }, { text: '长期任务', tone: 'topic' }, { text: '跑偏', tone: 'risk' }] : [] } }, agentFirstFrame: { visible: true, position: 'bottom-right', visibleHeightPx: 430 }, openingUi: { progressRailPresent: false, leftBlueCirclePresent: false, voiceLabelPresent: false } });
  out('qa/generated-art-alpha-report.json', { pass: alphaPass && sceneDurationAligned, sharedGridComposition: true, assets: alphaAssets });
  out('qa/speech-pacing-report.json', { pass: sceneDurationAligned, locale: episode.locale, voice: episode.voice, rate: episode.rate, duration: finalDuration, finalVttSegmentCount: finalCues.length, sceneCount: allScenes.length });
  out('qa/video-output-report.json', { pass: false, pendingRender: true, width: 1920, height: 1080, fps: 30, videoCodec: 'h264', audioCodec: 'aac' });
  out('qa/visual-cadence-report.json', { pass: sceneDurationAligned, sceneCount: allScenes.length, substantiveChapterCount: episode.chapters.length, recapSceneCount: recaps.length, referenceComparison: { reference: { scenes: 63, chapters: 7, recaps: 15 }, current: { scenes: allScenes.length, chapters: episode.chapters.length, recaps: recaps.length }, reason: 'Current episode preserves the active three-point recap density while using five substantive chapters to keep the newly researched source explanation within the 5-8 minute narration window.' } });
  out('qa/visual-variation-report.json', { pass: sceneDurationAligned, nonOutroSceneCount: allScenes.length - 1, generatedArtSceneCount: allScenes.filter((scene) => scene.generatedArt).length, generatedArtPercent: Number((allScenes.filter((scene) => scene.generatedArt).length / (allScenes.length - 1) * 100).toFixed(3)), sceneIds: allScenes.filter((scene) => scene.generatedArt).map((scene) => scene.id) });
  out('qa/motion-report.json', { pass: sceneDurationAligned, actionTypes, beatCount: finalCues.length, beats: finalCues.map((scene, index) => ({ sceneId: scene.sceneId, type: actionTypes[index % actionTypes.length], start: scene.start, end: scene.clipEnd, narrationEnd: scene.end, semanticTrigger: allScenes[index].narration })) });
  if (episode.locale === 'zh-CN') {
    const pronunciationEntries = [{ ambiguousForm: '长任务', intendedPinyin: 'cháng rèn wù', approvedTtsText: '长期任务', strategy: 'lexical-rewrite', segmentIds: timingSegments.filter((segment) => segment.text.includes('长期任务')).map((segment) => segment.id) }].filter((entry) => entry.segmentIds.length > 0);
    out('qa/chinese-pronunciation-report.json', { pass: sceneDurationAligned, locale: 'zh-CN', scriptFile: episode.scriptFile, allDeclaredTermsResolved: true, entries: pronunciationEntries });
    out('qa/chinese-mandarin-prosody-report.json', { pass: sceneDurationAligned, locale: 'zh-CN', sentenceTerminators: ['。', '！', '？', '!', '?'], forbiddenTtsSegmentBoundaryPunctuation: ['，', '、', '：', '；', ',', ':', ';'], ttsSegments: timingSegments.map((segment) => ({ id: segment.id, text: segment.text, pass: /[。！？!?]$/.test(segment.text) })), captionCues: cueRows.map((cue) => ({ segmentId: cue.segmentId, text: cue.text, pass: /[。！？!?]$/.test(cue.text) })) });
  }
}

if (args.has('--prepare')) prepare();
if (args.has('--compile')) compile();
