import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const mode = process.argv[2] || 'all';
const timing = JSON.parse(readFileSync(path.join(projectDir, 'timing-map.json'), 'utf8'));
const plan = JSON.parse(readFileSync(path.join(projectDir, 'scene-plan.json'), 'utf8'));
const html = readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const scenes = plan.chapters.flatMap((chapter) => chapter.scenes);
const failures = [];

const checks = {
  transitions() {
    scenes.forEach((scene, index) => {
      if (index && Math.abs(scene.start - scenes[index - 1].end) > 0.001) failures.push(`scene boundary gap at ${scene.id}`);
      if (scene.end <= scene.start) failures.push(`non-positive duration at ${scene.id}`);
    });
    if (timing.checkpoints.maximumInterUtteranceGap > 0.2) failures.push('ordinary narration gap exceeds 0.20s');
    if (timing.duration < 300 || timing.duration > 480) failures.push('duration is outside 5-8 minutes');
    if (timing.rate !== '+40%') failures.push('Chinese voice rate is not +40%');
    if (timing.checkpoints.coverHardCut - timing.checkpoints.firstSentenceEnd > 1 / 30 + 0.0001) failures.push('cover cut misses first-sentence frame boundary');
    const ctaFrame = Math.ceil(timing.checkpoints.ctaStart * 30) / 30;
    if (ctaFrame - timing.checkpoints.ctaStart > 1 / 30 + 0.0001) failures.push('outro misses CTA frame boundary');
  },
  semantics() {
    scenes.forEach((scene) => {
      if (scene.props.length !== 1 || scene.coreObjectCount !== 1) failures.push(`${scene.id} does not have exactly one core object`);
      if (!scene.agent || !scene.agentDirection) failures.push(`${scene.id} lacks Agent direction metadata`);
      if (!scene.headline || !scene.narration) failures.push(`${scene.id} lacks a judgement or narration`);
    });
    if (!html.includes('关注 Tiny Agent') || !html.includes('成为更擅长</span><span>使用 AI 的人！')) failures.push('fixed Chinese outro copy missing');
    plan.chapters.slice(1, 6).forEach((chapter) => {
      if (chapter.scenes[0]?.type !== 'chapter-intro') failures.push(`${chapter.label} lacks a chapter introduction`);
      if (!chapter.scenes.slice(-3).every((scene) => scene.type === 'recap')) failures.push(`${chapter.label} lacks a three-point recap`);
    });
  },
  balance() {
    const tokens = ['font-size:92px', 'font-size:46px', 'border:6px solid var(--ink)', 'height:620px', 'width:480px;height:480px', '--paper:#ECECEA', '--ink:#111413'];
    tokens.forEach((token) => { if (!html.includes(token)) failures.push(`missing visual token ${token}`); });
    if (!html.includes('height:52px') || !html.includes('--played:#C9CBC5') || !html.includes('--rest:#DDE0DA')) failures.push('chapter bar tokens missing');
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
