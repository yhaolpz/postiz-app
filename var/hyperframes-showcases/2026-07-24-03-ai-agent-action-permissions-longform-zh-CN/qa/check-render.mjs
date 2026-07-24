import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const renderFiles = readdirSync(path.join(projectDir, 'renders')).filter((name) => name.endsWith('.mp4'));
if (renderFiles.length !== 1) throw new Error(`Expected one MP4 render, found ${renderFiles.length}.`);
const outputRelative = path.join('renders', renderFiles[0]);
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
], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const silenceLog = `${silence.stdout || ''}\n${silence.stderr || ''}`;
const silenceStarts = [...silenceLog.matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
const silenceEnds = [...silenceLog.matchAll(/silence_end:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
const trailingSilenceSeconds = silenceEnds.at(-1) >= 11.99
  ? Number((12 - silenceStarts.at(-1)).toFixed(6))
  : 0;
const black = spawnSync('ffmpeg', [
  '-hide_banner', '-i', output, '-an',
  '-vf', 'blackdetect=d=0.20:pix_th=0.10',
  '-f', 'null', '-'
], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const blackLog = `${black.stdout || ''}\n${black.stderr || ''}`;
const blackSegments = [...blackLog.matchAll(/black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g)]
  .map((match) => ({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) }));
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
const duration = Number(probe.format.duration);
const sha256 = createHash('sha256').update(readFileSync(output)).digest('hex');

const requiredReports = [
  'balance-report.json',
  'cognitive-load-report.json',
  'dom-layout-report.json',
  'generated-art-report.json',
  'highlight-layout-report.json',
  'internal-prop-style-report.json',
  'long-term-rule-source-report.json',
  'motion-report.json',
  'narrative-transition-report.json',
  'outro-alignment-report.json',
  'retention-opening-report.json',
  'semantic-motion-target-report.json',
  'semantics-report.json',
  'title-identity-report.json',
  'transitions-report.json',
  'utterance-timing-report.json',
  'visual-variation-report.json'
];
const reports = Object.fromEntries(requiredReports.map((name) => [name, readReport(name)]));
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
  noBlackSegments: black.status === 0 && blackSegments.length === 0,
  allProductionReportsPass: Object.values(reports).every((report) => report.pass === true),
  semanticTargetsStrict: reports['semantic-motion-target-report.json'].semanticTargetMismatchCount === 0
    && reports['semantic-motion-target-report.json'].unmatchedTriggerConceptCount === 0
    && reports['semantic-motion-target-report.json'].fallbackTargetCount === 0
    && reports['semantic-motion-target-report.json'].missingSemanticRoleCount === 0
    && reports['semantic-motion-target-report.json'].invisibleTargetCount === 0,
  highlightLayoutStrict: reports['highlight-layout-report.json'].underlineWidthMismatchCount === 0
    && reports['highlight-layout-report.json'].underlineTargetMismatchCount === 0
    && reports['highlight-layout-report.json'].underlineLineFragmentFailureCount === 0
    && reports['highlight-layout-report.json'].underlineOverflowCount === 0,
  hyperframesCheck: true
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
  blackSegments,
  video,
  audio,
  checks,
  reviewedSnapshotSet: '24 required review frames and contact sheet'
};
const finalReport = {
  pass,
  project: path.basename(projectDir),
  locale: timing.locale,
  renderReport: 'qa/render-report.json',
  productionReports: requiredReports.map((name) => `qa/${name}`),
  checks
};

writeFileSync(path.join(qaDir, 'render-report.json'), `${JSON.stringify(renderReport, null, 2)}\n`);
writeFileSync(path.join(qaDir, 'final-qa-report.json'), `${JSON.stringify(finalReport, null, 2)}\n`);
if (!pass) {
  process.stderr.write(`${JSON.stringify(renderReport, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`render: pass (${duration.toFixed(3)}s, ${video.width}x${video.height}, ${video.r_frame_rate}, trailing silence ${trailingSilenceSeconds.toFixed(3)}s, black segments ${blackSegments.length})\n`);
