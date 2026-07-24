import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const videoPath = path.join(
  root,
  'renders/tiny-agent-action-permissions-paper-trading-v2.zh-CN.mp4',
);
const reportPath = path.join(root, 'qa/render-report.json');
const errors = [];

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
};

if (!fs.existsSync(videoPath)) {
  throw new Error(`Rendered video not found: ${videoPath}`);
}

const probe = JSON.parse(
  run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,pix_fmt,color_space,color_transfer,color_primaries',
    '-of',
    'json',
    videoPath,
  ]),
);
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
const durationSeconds = Number(probe.format.duration);
const fps = (() => {
  const [numerator, denominator] = String(video?.r_frame_rate ?? '0/1').split('/').map(Number);
  return denominator ? numerator / denominator : 0;
})();

if (durationSeconds < 540 || durationSeconds > 720) errors.push(`Duration ${durationSeconds}s is outside 540-720s`);
if (video?.codec_name !== 'h264') errors.push(`Video codec is ${video?.codec_name ?? 'missing'}, expected h264`);
if (video?.width !== 1920 || video?.height !== 1080) {
  errors.push(`Frame size is ${video?.width ?? 0}x${video?.height ?? 0}, expected 1920x1080`);
}
if (Math.abs(fps - 30) > 0.01) errors.push(`Frame rate is ${fps}, expected 30`);
if (audio?.codec_name !== 'aac') errors.push(`Audio codec is ${audio?.codec_name ?? 'missing'}, expected aac`);
if (video?.pix_fmt !== 'yuv420p') errors.push(`Pixel format is ${video?.pix_fmt ?? 'missing'}, expected yuv420p`);
if (
  video?.color_space !== 'bt709' ||
  video?.color_transfer !== 'bt709' ||
  video?.color_primaries !== 'bt709'
) {
  errors.push(
    `Color metadata is ${video?.color_space}/${video?.color_transfer}/${video?.color_primaries}, expected BT.709`,
  );
}

const blackLog = run('ffmpeg', [
  '-hide_banner',
  '-i',
  videoPath,
  '-vf',
  'blackdetect=d=0.2:pix_th=0.10',
  '-an',
  '-f',
  'null',
  '-',
]);
const blackSegments = [...blackLog.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g)].map(
  (match) => ({
    start: Number(match[1]),
    end: Number(match[2]),
    duration: Number(match[3]),
  }),
);
if (blackSegments.length) errors.push(`${blackSegments.length} black segment(s) at least 0.2s detected`);

const silenceLog = run('ffmpeg', [
  '-hide_banner',
  '-i',
  videoPath,
  '-af',
  'silencedetect=n=-50dB:d=0.5',
  '-vn',
  '-f',
  'null',
  '-',
]);
const trailingSilenceMatch = [...silenceLog.matchAll(/silence_start:\s*([\d.]+)[\s\S]*?silence_end:\s*([\d.]+)/g)].at(-1);
const trailingSilence =
  trailingSilenceMatch && durationSeconds - Number(trailingSilenceMatch[2]) < 0.15
    ? {
        start: Number(trailingSilenceMatch[1]),
        end: Number(trailingSilenceMatch[2]),
        duration: Number(trailingSilenceMatch[2]) - Number(trailingSilenceMatch[1]),
      }
    : null;
if (trailingSilence && trailingSilence.duration > 0.8) {
  errors.push(`Trailing silence is ${trailingSilence.duration.toFixed(3)}s`);
}

const sha256 = crypto.createHash('sha256').update(fs.readFileSync(videoPath)).digest('hex');
const report = {
  pass: errors.length === 0,
  file: path.relative(root, videoPath),
  sha256,
  durationSeconds,
  sizeBytes: Number(probe.format.size),
  bitRate: Number(probe.format.bit_rate),
  video: {
    codec: video?.codec_name,
    width: video?.width,
    height: video?.height,
    fps,
    pixelFormat: video?.pix_fmt,
    colorSpace: video?.color_space,
    colorTransfer: video?.color_transfer,
    colorPrimaries: video?.color_primaries,
  },
  audio: {
    codec: audio?.codec_name,
    sampleRate: Number(audio?.sample_rate),
    channels: audio?.channels,
  },
  blackSegments,
  trailingSilence,
  errors,
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
