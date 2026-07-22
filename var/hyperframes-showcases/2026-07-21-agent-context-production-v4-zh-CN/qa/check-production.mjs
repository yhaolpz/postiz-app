import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const mode = process.argv[2] || 'all';
const timing = JSON.parse(readFileSync(path.join(projectDir, 'timing-map.json'), 'utf8'));
const plan = JSON.parse(readFileSync(path.join(projectDir, 'scene-plan.json'), 'utf8'));
const profile = JSON.parse(readFileSync(path.join(projectDir, 'production-profile.json'), 'utf8'));
const html = readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const visualReport = JSON.parse(readFileSync(path.join(qaDir, 'visual-variation-report.json'), 'utf8'));
const motionReport = JSON.parse(readFileSync(path.join(qaDir, 'motion-report.json'), 'utf8'));
const progressReport = JSON.parse(readFileSync(path.join(qaDir, 'progress-report.json'), 'utf8'));
const recapReport = JSON.parse(readFileSync(path.join(qaDir, 'recap-report.json'), 'utf8'));
const recapPrefixReport = JSON.parse(readFileSync(path.join(qaDir, 'recap-spoken-prefix-report.json'), 'utf8'));
const scenes = plan.chapters.flatMap((chapter) => chapter.scenes);
const failures = [];

const checks = {
  transitions() {
    scenes.forEach((scene, index) => {
      if (index && Math.abs(scene.start - scenes[index - 1].end) > 0.001) failures.push(`scene boundary gap at ${scene.id}`);
      if (scene.end <= scene.start) failures.push(`non-positive duration at ${scene.id}`);
    });
    if (timing.checkpoints.maximumInterUtteranceGap > profile.opening.maximumOrdinaryGapSeconds) failures.push('ordinary narration gap exceeds the approved maximum');
    if (timing.duration < 300 || timing.duration > 480) failures.push('duration is outside 5-8 minutes');
    if (timing.rate !== '+35%') failures.push('Chinese voice rate is not +35%');
    if (timing.checkpoints.coverHardCut - timing.checkpoints.firstSentenceEnd > 1 / 30 + 0.0001) failures.push('cover cut misses first-sentence frame boundary');
    const ctaFrame = Math.ceil(timing.checkpoints.ctaStart * 30) / 30;
    if (ctaFrame - timing.checkpoints.ctaStart > 1 / 30 + 0.0001) failures.push('outro misses CTA frame boundary');
  },
  semantics() {
    scenes.forEach((scene) => {
      if (!scene.props.length || scene.props.length > 2) failures.push(`${scene.id} has an invalid core-object count`);
      if (!scene.agent || !scene.agentDirection || !scene.human || !scene.humanDirection) failures.push(`${scene.id} lacks actor direction metadata`);
      if (!scene.headline || !scene.narration) failures.push(`${scene.id} lacks a judgement or narration`);
      if (scene.layout === 'two-props' && scene.props.length !== 2) failures.push(`${scene.id} is a two-prop layout without two props`);
    });
    if (!html.includes('关注 Tiny Agent') || !html.includes('成为更擅长</span><span>使用 AI 的人！')) failures.push('fixed Chinese outro copy missing');
    plan.chapters.slice(1, 6).forEach((chapter) => {
      if (chapter.scenes[0]?.type !== 'chapter-intro') failures.push(`${chapter.label} lacks a chapter introduction`);
      if (!chapter.scenes.slice(-3).every((scene) => scene.type === 'recap')) failures.push(`${chapter.label} lacks a three-point recap`);
      if (!chapter.scenes.at(-3)?.narration.startsWith(profile.audio.chapterRecapSpokenPrefix)) failures.push(`${chapter.label} recap lacks the fixed spoken prefix`);
    });
    if (!visualReport.pass || visualReport.generatedRatio < 0.15) failures.push('temporary generated scene-art ratio is below 15%');
    if (!motionReport.pass || motionReport.typeCount < profile.visual.motionTypeMinimum || motionReport.beatCount < profile.visual.motionBeatMinimum) failures.push('motion type/beat minimum is not met');
    if (!recapReport.pass || !recapPrefixReport.pass) failures.push('chapter recap report failed');
  },
  balance() {
    const tokens = [
      'font-size:92px',
      'font-size:46px',
      'border:6px solid var(--ink)',
      'height:610px',
      'width:720px;height:720px',
      '--paper:#ECECEA',
      '--ink:#111413',
      'background:var(--blue)',
      'font-size:60px',
      'font-weight:900',
      '.label-line{display:block;white-space:nowrap}',
      '.solo-stage .actor-wrap{position:relative;top:-72px',
      '.generated-art{width:720px;height:720px;object-fit:contain;border:0;border-radius:0;box-shadow:none}'
    ];
    tokens.forEach((token) => { if (!html.includes(token)) failures.push(`missing visual token ${token}`); });
    if (!html.includes('height:52px') || !html.includes('--played:#A8D8F0') || !html.includes('--rest:#DDE0DA')) failures.push('chapter bar tokens missing');
    if (!progressReport.pass || progressReport.visibleAt !== timing.checkpoints.coverTimelineCutAt || progressReport.playedColor !== '#A8D8F0') failures.push('chapter rail does not appear at the cover cut with the light-blue played state');
    if (!html.includes(`tl.set("#chapter-progress",{autoAlpha:1},${timing.checkpoints.coverTimelineCutAt.toFixed(3)})`)) failures.push('chapter rail timeline trigger is not the cover cut');
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
