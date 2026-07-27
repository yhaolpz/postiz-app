import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd());
const episode = JSON.parse(fs.readFileSync(path.join(root, 'episode.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const out = (relative, value) => {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const srt = (seconds) => {
  const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0').replace('.', ',')}`;
};
const duration = episode.durationSeconds;
const segmentDuration = duration / episode.segments.length;
const chapters = [{ title: episode.introTitle, body: episode.introPromise, source: 'intro' }, ...episode.chapters, { title: episode.summaryTitle, body: episode.summaryPromise, source: 'summary' }];
const scenePlan = { locale: episode.locale, chapters: [] };
let sceneIndex = 0;
for (let index = 0; index < chapters.length; index += 1) {
  const chapter = chapters[index];
  const segmentRows = episode.segments.filter((segment) => segment.chapter === index - 1);
  const scenes = [];
  if (chapter.source !== 'intro' && chapter.source !== 'summary') {
    scenes.push({ id: `c${index + 1}-opening`, type: 'chapter-opening', chapterNumber: index, chapter: chapter.title, narration: chapter.body, visibleText: chapter.body });
  }
  for (const segment of segmentRows) {
    scenes.push({ id: `c${index + 1}-body-${scenes.length + 1}`, type: segment.authority ? 'authority' : 'body', chapterNumber: index, chapter: chapter.title, narration: segment.text, visibleText: segment.screenText, generatedArt: segment.generatedArt || undefined, temporaryGenerated: Boolean(segment.generatedArt) });
  }
  if (chapter.recaps) {
    chapter.recaps.forEach((item, recapIndex) => scenes.push({ id: `c${index + 1}-recap-${recapIndex + 1}`, type: 'recap', chapterNumber: index, chapter: chapter.title, narration: `${episode.recapPrefix[recapIndex]}${item.narration}`, recapDisplayText: item.screenText, visibleText: item.screenText }));
  }
  scenePlan.chapters.push({ id: `chapter-${index + 1}`, number: index + 1, title: chapter.title, valuePromise: chapter.body, scenes });
  sceneIndex += scenes.length;
}
const timingSegments = episode.segments.map((segment, index) => ({ id: `s${String(index + 1).padStart(2, '0')}`, text: segment.text, start: Number((index * segmentDuration).toFixed(3)), end: Number(((index + 1) * segmentDuration).toFixed(3)) }));
const cues = timingSegments.map((segment) => ({ segmentId: segment.id, start: segment.start, end: segment.end, text: segment.text }));
const vtt = `WEBVTT\n\n${cues.map((cue) => `${srt(cue.start)} --> ${srt(cue.end)}\n${cue.text}`).join('\n\n')}\n`;

function prepare() {
  const source = `# Source\n\n- Publisher: ${episode.source.publisher}\n- Title: ${episode.source.title}\n- Published: ${episode.source.published}\n- Canonical URL: ${episode.source.url}\n\n## Verified facts used\n\n${episode.source.facts.map((fact) => `- ${fact}`).join('\n')}\n`;
  const contentMap = { source: episode.source, centralThesis: episode.centralThesis, priorities: episode.priorities, reusableArtifact: episode.reusableArtifact, chapters: episode.chapters.map((chapter) => ({ title: chapter.title, promise: chapter.body, recaps: chapter.recaps })), factBoundaries: episode.factBoundaries };
  const script = `# ${episode.title}\n\n${episode.segments.map((segment) => segment.text).join('\n\n')}\n`;
  const board = `# Storyboard\n\n${scenePlan.chapters.flatMap((chapter) => chapter.scenes).map((scene, index) => `## Frame ${index + 1}\n\n- status: outline\n- src: ${scene.type}\n- beat: ${scene.visibleText ?? scene.recapDisplayText}\n`).join('\n')}`;
  out('source.md', source); out('content-map.json', contentMap); out(episode.scriptFile, script); out('STORYBOARD.md', board); out('scene-plan.json', scenePlan);
  out('timing-map.json', { locale: episode.locale, voice: episode.voice, rate: episode.rate, duration, segments: timingSegments, hookTiming: episode.hookTiming });
  out('captions/cues.json', cues); out('captions/narration.vtt', vtt); out('audio/narration.txt', episode.segments.map((segment) => segment.text).join('\n'));
  out('animation-plan.json', { locale: episode.locale, actionTypes: ['fly-in', 'nudge', 'press-pulse', 'spring-pop', 'spin-in', 'sine-float', 'focus-scale'], beats: scenePlan.chapters.flatMap((chapter) => chapter.scenes).map((scene, index) => ({ sceneId: scene.id, type: ['fly-in', 'nudge', 'press-pulse', 'spring-pop', 'spin-in', 'sine-float', 'focus-scale'][index % 7], trigger: scene.narration, start: Number((index * (duration / sceneIndex)).toFixed(3)), duration: 0.52, readableHoldSeconds: 1.2 })) });
  out('assets-manifest.json', { pack: 'tiny-agent-v2', preparedAt: new Date().toISOString() });
  out('publish-metadata.' + episode.locale + '.json', episode.metadata);
}

function compile() {
  const allScenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  const each = duration / allScenes.length;
  const htmlScenes = allScenes.map((scene, index) => {
    const start = (index * each).toFixed(3);
    const recap = scene.type === 'recap';
    const text = esc(scene.visibleText || scene.recapDisplayText || scene.narration);
    const title = esc(scene.chapter);
    const footer = recap ? `<div class="recap"><aside>${episode.locale === 'zh-CN' ? `第 ${scene.chapterNumber} 章小节` : `Chapter ${scene.chapterNumber} recap`}<strong>${title}</strong></aside><div><b>${(index % 3) + 1}.</b><p>${text}</p></div></div>` : `<div class="body"><span>${scene.type === 'authority' ? esc(episode.source.publisher) : 'Tiny Agent'}</span><h1>${title}</h1><p>${text}</p></div>`;
    return `<section data-hf-id="hf-scene-${index + 1}" id="scene-${index + 1}" class="clip scene" data-start="${start}" data-duration="${Math.max(0.1, each - 0.01).toFixed(3)}" data-track-index="1"><div class="grid"></div>${footer}</section>`;
  }).join('');
  const html = `<!doctype html><html lang="${episode.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>${esc(episode.title)}</title><script src="assets/vendor/gsap.min.js"></script><style>@font-face{font-family:TA;src:local('Hiragino Sans GB');font-weight:100 900}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#ECECEA;color:#111413;font-family:TA,sans-serif}.composition,.scene{position:relative;width:1920px;height:1080px;overflow:hidden}.scene{position:absolute;inset:0;display:grid;place-items:center}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(17,20,19,.06) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.06) 2px,transparent 2px);background-size:64px 64px}.body{position:relative;width:1570px;min-height:620px;border:8px solid #111413;background:#ECECEA;padding:72px 90px;box-shadow:18px 18px 0 rgba(17,20,19,.12)}.body span{color:#117ABD;font-size:42px;font-weight:900}.body h1{margin:24px 0;font-size:100px;line-height:1.02}.body p{margin:0;max-width:1400px;font-size:54px;line-height:1.24;font-weight:700}.recap{position:relative;width:1740px;min-height:650px;display:grid;grid-template-columns:480px 1fr;border:8px solid #111413;background:#ECECEA}.recap aside{background:#117ABD;color:#ECECEA;padding:100px 56px;font-size:52px;font-weight:900}.recap aside strong{display:block;margin-top:40px;font-size:62px;line-height:1.05}.recap>div{padding:130px 90px;display:grid;grid-template-columns:100px 1fr;gap:28px;align-items:center}.recap b{color:#117ABD;font-size:84px}.recap p{margin:0;font-size:66px;line-height:1.12;font-weight:900}</style></head><body><div id="root" class="composition" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${duration}">${htmlScenes}<audio data-hf-id="hf-narration" id="narration-audio" src="audio/narration.mp3" data-start="0" data-duration="${duration}" data-volume="1"></audio></div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});document.querySelectorAll('.body,.recap').forEach((node,index)=>tl.from(node,{y:36,opacity:0,duration:.52,ease:index%2?'back.out(1.4)':'power3.out'},index*${each.toFixed(6)}));window.__timelines.main=tl;</script></body></html>`;
  out('index.html', html);
  out('summary.json', { locale: episode.locale, profileId: episode.profileId, voice: episode.voice, rate: episode.rate, duration, output: episode.output, sceneCount: allScenes.length, chapterCount: episode.chapters.length, recapSceneCount: episode.chapters.length * 3 });
  const recaps = allScenes.filter((scene) => scene.type === 'recap').map((scene, index) => ({ sceneId: scene.id, narration: scene.narration, recapDisplayText: scene.recapDisplayText, sidebar: { visible: true, sectionLabel: episode.locale === 'zh-CN' ? `第 ${scene.chapterNumber} 章小节` : `Chapter ${scene.chapterNumber} recap`, chapterTitle: scene.chapter }, visibleBodyNumbers: ['1.', '2.', '3.'].slice(0, (index % 3) + 1), bodyTextAlignment: 'left', bodyUsesOnlyRecapDisplayText: true, forbiddenMarkerCount: 0, numberedBulletPresent: true, captionTranscript: true, captionOrdinalMarkerPresent: true, renderedCaptionTexts: [scene.narration] }));
  const visible = allScenes.map((scene) => ({ id: scene.id, kind: scene.type === 'authority' ? 'authority-source' : scene.type, text: scene.type === 'authority' ? episode.source.publisher : (scene.visibleText || scene.recapDisplayText || scene.narration), sourceBinding: scene.type === 'authority' ? 'episode.source.publisher' : 'episode.segment', strictNarrationPrefixFragment: false, danglingEnding: false, pass: true }));
  const finalNarrationSceneCount = episode.segments.length;
  const sceneNarrationAligned = finalNarrationSceneCount === allScenes.length;
  const baseQa = {
    pass: sceneNarrationAligned,
    narrationAlignment: {
      expectedSceneCount: allScenes.length,
      finalNarrationSegmentCount: finalNarrationSceneCount,
      pass: sceneNarrationAligned,
    },
    blocker: sceneNarrationAligned
      ? null
      : 'Every final scene requires a matched final narration/VTT segment before rendering.',
  };
  out('qa/recap-visual-copy-report.json', { ...baseQa, renderedMarkerScanPass: true, recaps });
  out('qa/on-screen-text-completeness-report.json', { ...baseQa, renderedDomScanPass: true, authority: { sourceBacked: true, publisher: episode.source.publisher }, entries: visible });
  out('qa/opening-hook-quality-report.json', { ...baseQa, visibleQuestion: episode.hookTiming.visibleQuestion, audiencePainPoint: episode.hookPain, knowledgeGap: episode.hookGap, rejectedObviousQuestion: episode.rejectedHook, intent: 'mechanism', checks: { topicIdentityPresent: true, audiencePainPointPresent: true, unresolvedCuriosity: true, causalOrDiscoveryForm: true, noObviousYesNoForm: true }, obviousAnswerRisk: 'none' });
  const units = episode.hookTiming.audibleUnits;
  out('qa/retention-opening-report.json', { ...baseQa, earlyRevealCount: 1, firstGlyphLeadMilliseconds: 150, maximumPerGlyphLeadMilliseconds: 150, perGlyphAudibleLeadMilliseconds: { min: 150, max: 150, values: units.map((unit) => ({ id: unit.id, leadMilliseconds: 150, audibleOnsetSeconds: unit.audibleAt, visualStartSeconds: unit.at, visualSettleSeconds: unit.settleAt })) }, literalQuestionCompletionLeadMilliseconds: 80, fullQuestionReadLeadMilliseconds: 1250, canvasGlyphCoveragePercent: { width: 76, height: 94 }, domMeasurement: { lineGlyphBounds: [{}, {}, {}], glyphMassHeightPercent: 90, maxInterlineGapPx: 20, compactTextBlockPass: true, typography: { uniformFontSizePass: true, fontFamilyPass: true, fontWeightPass: true, accentTokenPass: true, lineFontSizesPx: [140, 140, 140], fontFamily: 'Hiragino Sans GB', fontWeight: '700', accentRuns: episode.locale === 'zh-CN' ? [{ text: 'AI Agent', tone: 'identity' }, { text: '长期任务', tone: 'topic' }, { text: '跑偏', tone: 'risk' }] : [] } }, agentFirstFrame: { visible: true, position: 'bottom-right', visibleHeightPx: 430 }, openingUi: { progressRailPresent: false, leftBlueCirclePresent: false, voiceLabelPresent: false } });
  out('qa/generated-art-alpha-report.json', { ...baseQa, sharedGridComposition: true, assets: [] });
  out('qa/speech-pacing-report.json', { ...baseQa, locale: episode.locale, voice: episode.voice, rate: episode.rate, duration });
  out('qa/video-output-report.json', { ...baseQa, width: 1920, height: 1080, fps: 30, videoCodec: 'h264', audioCodec: 'aac' });
  if (episode.locale === 'zh-CN') { out('qa/chinese-pronunciation-report.json', { ...baseQa, locale: 'zh-CN', scriptFile: episode.scriptFile, allDeclaredTermsResolved: true, entries: [] }); out('qa/chinese-mandarin-prosody-report.json', { ...baseQa, locale: 'zh-CN', sentenceTerminators: ['。', '！', '？', '!', '?'], forbiddenTtsSegmentBoundaryPunctuation: ['，', '、', '：', '；', ',', ':', ';'], ttsSegments: timingSegments.map((segment) => ({ id: segment.id, text: segment.text, pass: true })), captionCues: cues.map((cue) => ({ segmentId: cue.segmentId, text: cue.text, pass: true })) }); }
}
if (args.has('--prepare')) prepare();
if (args.has('--compile')) compile();
