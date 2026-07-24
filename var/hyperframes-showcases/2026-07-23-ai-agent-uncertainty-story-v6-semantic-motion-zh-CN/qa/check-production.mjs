import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const mode = process.argv[2] || 'all';
const timing = JSON.parse(readFileSync(path.join(projectDir, 'timing-map.json'), 'utf8'));
const plan = JSON.parse(readFileSync(path.join(projectDir, 'scene-plan.json'), 'utf8'));
const profile = JSON.parse(readFileSync(path.join(projectDir, 'production-profile.json'), 'utf8'));
const episode = JSON.parse(readFileSync(path.join(projectDir, 'episode.json'), 'utf8'));
const html = readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const visualReport = JSON.parse(readFileSync(path.join(qaDir, 'visual-variation-report.json'), 'utf8'));
const motionReport = JSON.parse(readFileSync(path.join(qaDir, 'motion-report.json'), 'utf8'));
const generatedArtReport = JSON.parse(readFileSync(path.join(qaDir, 'generated-art-report.json'), 'utf8'));
const longTermRuleSourceReport = JSON.parse(readFileSync(path.join(qaDir, 'long-term-rule-source-report.json'), 'utf8'));
const progressReport = JSON.parse(readFileSync(path.join(qaDir, 'progress-report.json'), 'utf8'));
const narrativeTransitionReport = JSON.parse(readFileSync(path.join(qaDir, 'narrative-transition-report.json'), 'utf8'));
const highlightReport = JSON.parse(readFileSync(path.join(qaDir, 'highlight-layout-report.json'), 'utf8'));
const internalPropReport = JSON.parse(readFileSync(path.join(qaDir, 'internal-prop-style-report.json'), 'utf8'));
const cognitiveLoadReport = JSON.parse(readFileSync(path.join(qaDir, 'cognitive-load-report.json'), 'utf8'));
const scenes = plan.chapters.flatMap((chapter) => chapter.scenes);
const failures = [];

const checks = {
  transitions() {
    scenes.forEach((scene, index) => {
      if (index && Math.abs(scene.start - scenes[index - 1].end) > 0.001) failures.push(`scene boundary gap at ${scene.id}`);
      if (scene.end <= scene.start) failures.push(`non-positive duration at ${scene.id}`);
    });
    if (timing.checkpoints.maximumInterUtteranceGap > profile.opening.maximumOrdinaryGapSeconds) failures.push('ordinary narration gap exceeds the approved maximum');
    if (timing.duration < profile.duration.minimumSeconds || timing.duration > profile.duration.maximumSeconds) failures.push('duration is outside the approved deep-content range');
    if (timing.rate !== profile.audio.rate) failures.push(`voice rate is not ${profile.audio.rate}`);
    if (timing.checkpoints.maximumVisualLeadSeconds <= 0 || timing.checkpoints.maximumVisualLeadSeconds > profile.opening.visualLeadSeconds + 0.001) failures.push('kinetic hook visual lead is outside the approved range');
    if (timing.checkpoints.fullQuestionHoldSeconds < 1) failures.push('complete question does not hold for at least one second before the cut');
    const ctaFrame = Math.ceil(timing.checkpoints.ctaStart * 30) / 30;
    if (ctaFrame - timing.checkpoints.ctaStart > 1 / 30 + 0.0001) failures.push('outro misses CTA frame boundary');
    if (!html.includes('clipPath:"inset(') || !html.includes('duration:0.75') || !html.includes('duration:0.48') || !html.includes('duration:0.53')) failures.push('semantic mask transition language is incomplete');
  },
  semantics() {
    scenes.forEach((scene) => {
      if (!scene.props.length || scene.props.length > 2) failures.push(`${scene.id} has an invalid core-object count`);
      if (!scene.agent || !scene.agentDirection || !scene.human || !scene.humanDirection) failures.push(`${scene.id} lacks actor direction metadata`);
      if (!scene.headline || !scene.narration) failures.push(`${scene.id} lacks a judgement or narration`);
      if (scene.layout === 'two-props' && scene.props.length !== 2) failures.push(`${scene.id} is a two-prop layout without two props`);
    });
    if (!html.includes(episode.outro.title) || !episode.outro.lines.every((line) => html.includes(line))) failures.push('fixed localized outro copy missing');
    if (!html.includes('id="hook" class="hook"') || html.includes('assets/cover.png')) failures.push('voice-synced kinetic hook is missing or a cover asset remains in the opening');
    if (/hook-voice|voice-fill|>\s*VOICE\s*</i.test(html)) failures.push('opening still contains the deprecated VOICE progress UI');
    plan.chapters.slice(1, -1).forEach((chapter) => {
      if (chapter.scenes[0]?.type !== 'chapter-intro') failures.push(`${chapter.label} lacks a story-led module opening`);
      if (chapter.scenes.some((scene) => scene.type === 'recap')) failures.push(`${chapter.label} still contains a formal spoken recap`);
    });
    if (!plan.chapters.slice(1, -2).every((chapter) => chapter.scenes.at(-1)?.type === 'transition')) failures.push('substantive modules do not hand off through story questions');
    if (!visualReport.pass
      || visualReport.generatedRatio < profile.visual.temporaryGeneratedSceneRatioMinimum
      || visualReport.generatedDurationRatio < profile.visual.temporaryGeneratedDurationRatioMinimum) failures.push('temporary generated scene-art coverage is below the active scene or duration threshold');
    if (!generatedArtReport.pass
      || generatedArtReport.generatorType !== 'image-model'
      || generatedArtReport.uniqueGeneratedAssetCount < profile.visual.temporaryGeneratedUniqueMinimum
      || generatedArtReport.provenanceFailures.length) failures.push('generated scene art lacks model provenance, uniqueness, or semantic QA');
    const [motionMinimum, motionMaximum] = profile.visual.semanticActionsPerMinuteHard;
    if (!motionReport.pass
      || motionReport.semanticNodesPerMinute < motionMinimum
      || motionReport.semanticNodesPerMinute > motionMaximum
      || motionReport.maximumStaticGapSeconds > profile.visual.maximumStaticGapSeconds
      || motionReport.entranceOnlyLongSceneCount
      || motionReport.missingFieldNodeCount
      || motionReport.unboundNodeCount
      || motionReport.maximumRepeatedActionRun > profile.visual.maximumRepeatedActionRun) failures.push('semantic motion density, binding, variation, or static-gap gate failed');
    if (!longTermRuleSourceReport.pass || longTermRuleSourceReport.conversationContextUsed !== false || longTermRuleSourceReport.productionMode !== 'long-term-rules-only') failures.push('long-term-only source verification failed');
    if (!narrativeTransitionReport.pass || narrativeTransitionReport.mode !== profile.cognitiveLoad.requiredTransitionMode) failures.push('narrative transition report failed');
    if (!highlightReport.pass) failures.push('generated-art side alternation or highlight line-fit report failed');
    if (!internalPropReport.pass) failures.push('internal prop frame removal report failed');
    if (!cognitiveLoadReport.pass) failures.push('cognitive-load report failed');
  },
  balance() {
    const tokens = [
      'font-size:92px',
      'font-size:46px',
      'border:6px solid var(--ink)',
      'height:610px',
      '--paper:#ECECEA',
      '--ink:#111413',
      'background:var(--blue)',
      'font-size:60px',
      'font-weight:900',
      '.label-line{display:block;white-space:nowrap}',
      '.solo-stage .actor-wrap{position:relative;top:-72px',
      '.featured-object{width:600px;min-height:500px;display:grid;grid-template-rows:390px auto;place-items:center;padding:0 14px 10px;border:0;border-radius:0;background:transparent;box-shadow:none}',
      '.generated-stage.art-left{grid-template-columns:minmax(0,1fr) 660px;grid-template-areas:"art label"}',
      '.generated-stage.art-right{grid-template-columns:660px minmax(0,1fr);grid-template-areas:"label art"}',
      '.generated-art{width:720px;height:680px;object-fit:contain;border:0;border-radius:0;box-shadow:none;mix-blend-mode:darken}',
      '.generated-label{grid-area:label;position:static;width:660px',
      '.yellow-highlight{box-sizing:border-box;min-width:0;max-width:100%}'
    ];
    tokens.forEach((token) => { if (!html.includes(token)) failures.push(`missing visual token ${token}`); });
    if (!html.includes('.hook-question{position:absolute;left:58px;top:116px;width:1804px;font-size:190px')) failures.push('opening question does not use the enlarged full-frame typography');
    if (!html.includes('height:52px') || !html.includes('--played:#A8D8F0') || !html.includes('--rest:#DDE0DA')) failures.push('chapter bar tokens missing');
    if (!progressReport.pass || progressReport.visibleAt !== timing.checkpoints.hookTimelineCutAt || progressReport.playedColor !== '#A8D8F0' || progressReport.unplayedColor !== '#DDE0DA') failures.push('chapter rail does not appear at the hook cut with correct played and unplayed colors');
    if (!html.includes(`tl.set("#chapter-progress",{autoAlpha:1},${timing.checkpoints.hookTimelineCutAt.toFixed(3)})`)) failures.push('chapter rail timeline trigger is not the hook cut');
  }
};

if (!checks[mode]) throw new Error(`Unknown production check: ${mode}`);
checks[mode]();
const report = { pass: failures.length === 0, mode, checkedScenes: scenes.length, failures };
writeFileSync(path.join(qaDir, `${mode}-report.json`), `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`${mode}: pass (${scenes.length} scenes)\n`);
