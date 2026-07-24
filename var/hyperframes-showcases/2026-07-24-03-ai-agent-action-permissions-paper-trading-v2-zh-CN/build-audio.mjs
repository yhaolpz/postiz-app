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

if (paragraphs.length !== 43) {
  throw new Error(`Expected 43 narration paragraphs, received ${paragraphs.length}`);
}

const chapters = [
  { id: 'intro', label: '1. 前言', startParagraph: 1, endParagraph: 6 },
  { id: 'mechanism', label: '2. 看动作后果', startParagraph: 7, endParagraph: 17 },
  { id: 'diagnosis', label: '3. 分清信息与指令', startParagraph: 18, endParagraph: 31 },
  { id: 'action', label: '4. 写进工作流', startParagraph: 32, endParagraph: 40 },
  { id: 'summary', label: '5. 总结', startParagraph: 41, endParagraph: 43 },
];

const chapterFor = (paragraphNumber) =>
  chapters.find(
    (chapter) => paragraphNumber >= chapter.startParagraph && paragraphNumber <= chapter.endParagraph,
  );

const pauseAfter = paragraphs.map((_, index) => {
  const paragraphNumber = index + 1;
  if (paragraphNumber === 1) return 1.4;
  if ([6, 17, 31, 40].includes(paragraphNumber)) return 0.8;
  if ([16, 30, 42].includes(paragraphNumber)) return 0.5;
  if (paragraphNumber === 43) return 0;
  return paragraphNumber <= 6 ? 0.18 : 0.25;
});

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

const segments = [];
const allCues = [];
let offset = 0;

for (let index = 0; index < paragraphs.length; index += 1) {
  const paragraphNumber = index + 1;
  const id = `p${String(paragraphNumber).padStart(2, '0')}`;
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
  const start = offset;
  const end = start + duration;
  const chapter = chapterFor(paragraphNumber);
  const segmentCues = parseVtt(fs.readFileSync(vttPath, 'utf8'));
  for (const cue of segmentCues) {
    allCues.push({
      id: `cue-${allCues.length + 1}`,
      start: cue.start + start,
      end: cue.end + start,
      text: cue.text,
      paragraph: paragraphNumber,
      chapter: chapter.id,
    });
  }
  segments.push({
    id,
    paragraph: paragraphNumber,
    chapter: chapter.id,
    text: paragraphs[index],
    start,
    narrationEnd: end,
    end: end + pauseAfter[index],
    duration,
    pauseAfter: pauseAfter[index],
  });
  offset = end + pauseAfter[index];
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
      version: 2,
      locale: 'zh-CN',
      voice: 'zh-CN-YunxiaNeural',
      rate: '+20%',
      durationSeconds: finalDuration,
      pausesAfterSeconds: pauseAfter,
      chapters,
      segments,
      cues: allCues,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify({
    paragraphs: paragraphs.length,
    cues: allCues.length,
    durationSeconds: finalDuration,
    chapters: chapters.length,
  }),
);
