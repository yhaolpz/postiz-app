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

const pauseAfter = [1.4, 0.1, 0.1, 0.1, 0.25, 0.4, 0.125, 0.125, 0.125, 0.125, 0.25, 0];
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
  return options.capture ? `${result.stdout ?? ''}${result.stderr ?? ''}` : result.stdout ?? '';
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
    '--rate=+25%',
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
const rawNarrationPath = path.join(audioDir, 'narration.raw.zh-CN.mp3');
const finalNarrationPath = path.join(audioDir, 'narration.zh-CN.mp3');
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
  rawNarrationPath,
]);

const rawDuration = Number(
  run(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nw=1:nk=1',
      rawNarrationPath,
    ],
    { capture: true },
  ).trim(),
);

const silenceLog = run(
  'ffmpeg',
  ['-hide_banner', '-i', rawNarrationPath, '-af', 'silencedetect=n=-50dB:d=0.35', '-f', 'null', '-'],
  { capture: true },
);
const silenceStarts = [...silenceLog.matchAll(/silence_start:\s*([\d.]+)/g)].map((match) => Number(match[1]));
const silenceEnds = [...silenceLog.matchAll(/silence_end:\s*([\d.]+)/g)].map((match) => Number(match[1]));
const detectedSilences = silenceStarts
  .map((start, index) => ({
    start,
    end: silenceEnds[index],
    duration: silenceEnds[index] - start,
  }))
  .filter((silence) => Number.isFinite(silence.end));
const questionBoundary = durations[0] + pauseAfter[0];
const compressedSilences = detectedSilences
  .filter((silence) => silence.start >= questionBoundary - 0.2 && silence.duration >= 0.45)
  .map((silence) => {
    const keepDuration = silence.duration * 0.5;
    const removedDuration = silence.duration - keepDuration;
    return {
      ...silence,
      keepDuration,
      removedDuration,
      removeStart: silence.start + keepDuration / 2,
      removeEnd: silence.end - keepDuration / 2,
    };
  });

const keepIntervals = [];
let keepStart = 0;
for (const silence of compressedSilences) {
  keepIntervals.push({ start: keepStart, end: silence.removeStart });
  keepStart = silence.removeEnd;
}
keepIntervals.push({ start: keepStart, end: rawDuration });
const compressionFilters = keepIntervals.map(
  (interval, index) =>
    `[0:a]atrim=start=${interval.start.toFixed(6)}:end=${interval.end.toFixed(6)},asetpts=PTS-STARTPTS[k${index}]`,
);
compressionFilters.push(
  `${keepIntervals.map((_, index) => `[k${index}]`).join('')}concat=n=${keepIntervals.length}:v=0:a=1[out]`,
);
run('ffmpeg', [
  '-y',
  '-i',
  rawNarrationPath,
  '-filter_complex',
  compressionFilters.join(';'),
  '-map',
  '[out]',
  '-c:a',
  'libmp3lame',
  '-b:a',
  '128k',
  finalNarrationPath,
]);

const removedBefore = (time) =>
  compressedSilences.reduce(
    (sum, silence) => sum + Math.max(0, Math.min(time, silence.removeEnd) - silence.removeStart),
    0,
  );
const compressedCues = allCues.map((cue) => ({
  ...cue,
  start: cue.start - removedBefore(cue.start),
  end: cue.end - removedBefore(cue.end),
}));
const finalDuration = Number(
  run(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', finalNarrationPath],
    { capture: true },
  ).trim(),
);

const vtt = [
  'WEBVTT',
  '',
  ...compressedCues.flatMap((cue, index) => [
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
      rate: '+25%',
      durationSeconds: finalDuration,
      pausesAfterSeconds: pauseAfter,
      silenceCompression: {
        policy: 'keep opening question hold; compress later detected sentence gaps to 50%',
        thresholdDb: -50,
        minimumDetectedSilenceSeconds: 0.35,
        compressedSilenceCount: compressedSilences.length,
        rawDurationSeconds: rawDuration,
        removedDurationSeconds: compressedSilences.reduce((sum, silence) => sum + silence.removedDuration, 0),
        detectedSilences,
        compressedSilences,
      },
      cues: compressedCues,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify({
    paragraphs: paragraphs.length,
    cues: compressedCues.length,
    rawDurationSeconds: rawDuration,
    durationSeconds: finalDuration,
    compressedSilenceCount: compressedSilences.length,
  }),
);
