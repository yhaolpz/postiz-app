import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sharedDir = path.dirname(new URL(import.meta.url).pathname);
const helperUrl = pathToFileURL(
  path.resolve(
    sharedDir,
    '../../../../../scripts/ai-video-pipeline/realtime-captions.mjs'
  )
).href;
const {
  assertRealtimeCaptionTrack,
  buildRealtimeCaptionTrack,
  parseVttCues,
} = await import(helperUrl);

const vtt = fs.readFileSync(path.join(sharedDir, 'narration.vtt'), 'utf8');
const sourceCues = parseVttCues(vtt);
const displayCues = buildRealtimeCaptionTrack(sourceCues);
const audioDurationSeconds = 38.808;
const videoDurationSeconds = audioDurationSeconds;
assertRealtimeCaptionTrack(displayCues, audioDurationSeconds);

const ctaCue = sourceCues.find((cue) => cue.text === 'Follow Tiny Agent.');
if (!ctaCue) throw new Error('The fixed CTA cue is missing from narration.vtt.');

const phaseTimings = [
  { id: 'hook', start: 0, end: sourceCues[1].startSeconds },
  { id: 'activity-not-outcome', start: sourceCues[1].startSeconds, end: sourceCues[2].startSeconds },
  { id: 'concrete-artifact', start: sourceCues[2].startSeconds, end: sourceCues[3].startSeconds },
  { id: 'three-inputs', start: sourceCues[3].startSeconds, end: sourceCues[4].startSeconds },
  { id: 'done-use-stop', start: sourceCues[4].startSeconds, end: sourceCues[5].startSeconds },
  { id: 'tiny-rule', start: sourceCues[5].startSeconds, end: sourceCues[6].startSeconds },
  { id: 'executable-task', start: sourceCues[6].startSeconds, end: ctaCue.startSeconds },
  { id: 'cta', start: ctaCue.startSeconds, end: videoDurationSeconds },
];

fs.writeFileSync(
  path.join(sharedDir, 'captions.json'),
  `${JSON.stringify({ mode: 'realtime-vtt', sourceCues, displayCues }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(sharedDir, 'phase-timings.json'),
  `${JSON.stringify({ audioDurationSeconds, videoDurationSeconds, ctaStartSeconds: ctaCue.startSeconds, phases: phaseTimings }, null, 2)}\n`
);
const runtimePayload = {
  audioDurationSeconds,
  videoDurationSeconds,
  ctaStartSeconds: ctaCue.startSeconds,
  phases: phaseTimings,
  captions: displayCues.filter((cue) => cue.startSeconds < ctaCue.startSeconds),
};
fs.writeFileSync(
  path.join(sharedDir, 'runtime-data.js'),
  `window.TinyAgentExperiment = (() => {\n` +
    `  const data = ${JSON.stringify(runtimePayload, null, 2)};\n` +
    `  function mountCaptions(shell) {\n` +
    `    data.captions.forEach((cue, index) => {\n` +
    `      const element = document.createElement('div');\n` +
    `      element.id = \`caption-cue-\${String(index + 1).padStart(2, '0')}\`;\n` +
    `      element.className = 'clip realtime-caption';\n` +
    `      element.dataset.start = String(cue.startSeconds);\n` +
    `      element.dataset.duration = String(Number((cue.endSeconds - cue.startSeconds).toFixed(3)));\n` +
    `      element.dataset.trackIndex = '81';\n` +
    `      element.textContent = cue.text;\n` +
    `      shell.appendChild(element);\n` +
    `    });\n` +
    `  }\n` +
    `  return Object.freeze({ data, mountCaptions });\n` +
    `})();\n`
);

console.log(
  JSON.stringify({
    audioDurationSeconds,
    videoDurationSeconds,
    sourceCueCount: sourceCues.length,
    displayCueCount: displayCues.length,
    ctaStartSeconds: ctaCue.startSeconds,
    phaseCount: phaseTimings.length,
  })
);
