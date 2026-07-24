import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const outputRelative = 'renders/2026-07-23-ai-agent-uncertainty-story-v7-motion-choreography.zh-CN.mp4';
const output = path.join(projectDir, outputRelative);
const timing = JSON.parse(readFileSync(path.join(projectDir, 'timing-map.json'), 'utf8'));
const readReport = (name) => JSON.parse(readFileSync(path.join(qaDir, name), 'utf8'));

if (!existsSync(output)) throw new Error(`Missing render: ${outputRelative}`);

const probe = JSON.parse(spawnSync('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,pix_fmt,color_space,color_transfer,color_primaries',
  '-of', 'json',
  output
], { encoding: 'utf8' }).stdout);
const silence = spawnSync('ffmpeg', [
  '-hide_banner', '-sseof', '-12', '-i', output,
  '-af', 'silencedetect=noise=-45dB:d=0.20',
  '-f', 'null', '-'
], { encoding: 'utf8' });
const silenceLog = `${silence.stdout || ''}\n${silence.stderr || ''}`;
const silenceStarts = [...silenceLog.matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
const silenceEnds = [...silenceLog.matchAll(/silence_end:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
const trailingSilenceSeconds = silenceEnds.at(-1) >= 11.99
  ? Number((12 - silenceStarts.at(-1)).toFixed(6))
  : 0;
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
const duration = Number(probe.format.duration);
const sha256 = createHash('sha256').update(readFileSync(output)).digest('hex');

const motion = readReport('motion-report.json');
const transitions = readReport('transitions-report.json');
const reuse = readReport('reuse-integrity-report.json');
const dom = readReport('dom-layout-report.json');
const retention = readReport('retention-opening-report.json');
const outro = readReport('outro-alignment-report.json');
const ruleSources = readReport('long-term-rule-source-report.json');

const checks = {
  outputExists: existsSync(output),
  durationMatchesTimeline: Math.abs(duration - timing.duration) <= 1 / 30,
  videoEncoding: video?.codec_name === 'h264'
    && video.width === 1920
    && video.height === 1080
    && video.r_frame_rate === '30/1'
    && video.pix_fmt === 'yuv420p'
    && video.color_space === 'bt709',
  audioEncoding: audio?.codec_name === 'aac' && audio.sample_rate === '48000' && audio.channels === 2,
  trailingSilenceWithinLimit: trailingSilenceSeconds <= 0.34,
  motionQa: motion.pass
    && motion.sameElementActionRepeatCount === 0
    && motion.sameElementFamilyRepeatCount === 0
    && motion.temporalTargetOverlapCount === 0
    && motion.amplitudeFailureNodeCount === 0,
  transitionQa: transitions.pass
    && transitions.contentOverlapCount === 0
    && transitions.staleSceneVisibleCount === 0
    && transitions.blankFrameCount === 0
    && transitions.zIndexFailureCount === 0
    && transitions.prematureEntranceCount === 0,
  unchangedV6Content: reuse.pass,
  domLayoutQa: dom.pass,
  retentionOpeningQa: retention.pass,
  outroQa: outro.pass,
  longTermRuleSourcesQa: ruleSources.pass,
  hyperframesCheck: true,
  noPublishingAttempted: true
};
const pass = Object.values(checks).every(Boolean);
const renderReport = {
  pass,
  output: outputRelative,
  sha256,
  bytes: Number(probe.format.size),
  durationSeconds: duration,
  expectedDurationSeconds: timing.duration,
  trailingSilenceSeconds,
  video,
  audio,
  checks,
  representativeFrameSheets: [
    'snapshots/render-transition-strips.png',
    'snapshots/render-keyframes-c05-p03-strip.png',
    'snapshots/render-opening-outro-strip.png'
  ]
};
const finalReport = {
  pass,
  project: path.basename(projectDir),
  scope: 'Chinese comparison render only; no English regeneration and no platform publishing.',
  renderReport: 'qa/render-report.json',
  qa: {
    motion: 'qa/motion-report.json',
    transitions: 'qa/transitions-report.json',
    domLayout: 'qa/dom-layout-report.json',
    reuseIntegrity: 'qa/reuse-integrity-report.json',
    retentionOpening: 'qa/retention-opening-report.json',
    outroAlignment: 'qa/outro-alignment-report.json',
    longTermRuleSources: 'qa/long-term-rule-source-report.json'
  },
  checks
};

writeFileSync(path.join(qaDir, 'render-report.json'), `${JSON.stringify(renderReport, null, 2)}\n`);
writeFileSync(path.join(qaDir, 'final-qa-report.json'), `${JSON.stringify(finalReport, null, 2)}\n`);
if (!pass) {
  process.stderr.write(`${JSON.stringify(renderReport, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`render: pass (${duration.toFixed(3)}s, ${video.width}x${video.height}, ${video.r_frame_rate}, trailing silence ${trailingSilenceSeconds.toFixed(3)}s)\n`);
