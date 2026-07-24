import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const audioDir = path.join(root, 'audio');
const captionDir = path.join(root, 'captions');
const segmentDir = path.join(audioDir, 'segments');
const captionSegmentDir = path.join(captionDir, 'segments');
fs.mkdirSync(segmentDir, { recursive: true });
fs.mkdirSync(captionSegmentDir, { recursive: true });

const paragraphs = fs
  .readFileSync(path.join(root, 'narration.txt'), 'utf8')
  .trim()
  .split(/\n\s*\n/)
  .map((text) => text.trim())
  .filter(Boolean);

const pauseAfter = [1.4, 0.18, 0.18, 0.22, 0.5, 0.22, 0.25, 0.25, 0.25, 0.25, 0];
if (paragraphs.length !== pauseAfter.length) {
  throw new Error(`Expected ${pauseAfter.length} narration paragraphs, received ${paragraphs.length}`);
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
};

const parseTime = (raw) => {
  const match = raw.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) throw new Error(`Invalid VTT time ${raw}`);
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4].padEnd(3, '0').slice(0, 3)) / 1000
  );
};

const formatTime = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

const parseVtt = (text) => {
  const lines = text.replace(/\r/g, '').split('\n');
  const cues = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes('-->')) continue;
    const [startRaw, endRaw] = lines[index].split('-->').map((part) => part.trim());
    const content = [];
    for (let cursor = index + 1; cursor < lines.length && lines[cursor].trim(); cursor += 1) {
      content.push(lines[cursor].trim());
    }
    cues.push({ start: parseTime(startRaw), end: parseTime(endRaw), text: content.join(' ') });
  }
  return cues;
};

const durations = [];
const allCues = [];
let offset = 0;

for (let index = 0; index < paragraphs.length; index += 1) {
  const id = `p${String(index + 1).padStart(2, '0')}`;
  const mediaPath = path.join(segmentDir, `${id}.mp3`);
  const vttPath = path.join(captionSegmentDir, `${id}.vtt`);
  run('uvx', [
    '--from',
    'edge-tts',
    'edge-tts',
    '--voice',
    'zh-CN-YunxiaNeural',
    '--rate=+20%',
    '--text',
    paragraphs[index],
    '--write-media',
    mediaPath,
    '--write-subtitles',
    vttPath,
  ]);
  const duration = Number(
    run(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mediaPath],
      { capture: true },
    ).trim(),
  );
  durations.push(duration);
  const segmentCues = parseVtt(fs.readFileSync(vttPath, 'utf8'));
  for (const cue of segmentCues) {
    allCues.push({
      id: `cue-${allCues.length + 1}`,
      start: cue.start + offset,
      end: cue.end + offset,
      text: cue.text,
      paragraph: index + 1,
    });
  }
  offset += duration + pauseAfter[index];
}

const inputs = [];
const filters = [];
const concatLabels = [];
for (let index = 0; index < paragraphs.length; index += 1) {
  const id = `p${String(index + 1).padStart(2, '0')}`;
  inputs.push('-i', path.join(segmentDir, `${id}.mp3`));
  filters.push(`[${index}:a]aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono[a${index}]`);
  concatLabels.push(`[a${index}]`);
  if (pauseAfter[index] > 0) {
    const silenceId = `s${index}`;
    filters.push(`anullsrc=r=24000:cl=mono:d=${pauseAfter[index]}[${silenceId}]`);
    concatLabels.push(`[${silenceId}]`);
  }
}
filters.push(`${concatLabels.join('')}concat=n=${concatLabels.length}:v=0:a=1[out]`);
run('ffmpeg', [
  '-y',
  ...inputs,
  '-filter_complex',
  filters.join(';'),
  '-map',
  '[out]',
  '-c:a',
  'libmp3lame',
  '-b:a',
  '128k',
  path.join(audioDir, 'narration.zh-CN.mp3'),
]);

const finalDuration = Number(
  run(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nw=1:nk=1',
      path.join(audioDir, 'narration.zh-CN.mp3'),
    ],
    { capture: true },
  ).trim(),
);

const vtt = [
  'WEBVTT',
  '',
  ...allCues.flatMap((cue, index) => [
    String(index + 1),
    `${formatTime(cue.start)} --> ${formatTime(cue.end)}`,
    cue.text,
    '',
  ]),
].join('\n');
fs.writeFileSync(path.join(captionDir, 'narration.vtt'), vtt);
fs.writeFileSync(
  path.join(captionDir, 'cues.json'),
  `${JSON.stringify(
    {
      version: 1,
      locale: 'zh-CN',
      voice: 'zh-CN-YunxiaNeural',
      rate: '+20%',
      durationSeconds: finalDuration,
      pausesAfterSeconds: pauseAfter,
      cues: allCues,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ paragraphs: paragraphs.length, cues: allCues.length, durationSeconds: finalDuration }));

