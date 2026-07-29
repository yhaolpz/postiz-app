import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectDir = resolve(import.meta.dirname);
const transcriptPath = resolve(projectDir, "audio/transcript.json");
const outputPath = resolve(projectDir, "index.html");

const duration = 60;
const mediaStart = 103.313;
const maxMergedWords = 7;
const pauseThreshold = 0.32;

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const rawWords = JSON.parse(readFileSync(transcriptPath, "utf8"));
if (!Array.isArray(rawWords) || rawWords.length === 0) {
  throw new Error("audio/transcript.json must contain a non-empty word array");
}

const corrections = new Map([
  [4, "the"],
  [92, "keeps"],
  [99, "Tell"],
]);

const words = rawWords
  .map((word, index) => ({
    id: `caption-word-${index + 1}`,
    text: corrections.get(index) ?? String(word.text ?? "").trim(),
    start: Math.max(0, Number(word.start)),
    end: Math.min(duration, Number(word.end)),
  }))
  .filter((word) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end))
  .filter((word) => word.start < duration && word.end > word.start)
  .filter((word) => !/^[♪�\u266a\u266b\u266c\u266d\u266e\u266f]+$/.test(word.text));

const thoughtUnits = [];
let currentUnit = [];

for (let index = 0; index < words.length; index += 1) {
  const word = words[index];
  const next = words[index + 1];
  currentUnit.push(word);

  const endsSentence = /[.!?]$/.test(word.text);
  const pause = next ? next.start - word.end : Number.POSITIVE_INFINITY;

  if (endsSentence || (currentUnit.length >= 4 && pause >= pauseThreshold) || !next) {
    thoughtUnits.push(currentUnit);
    currentUnit = [];
  }
}

if (currentUnit.length) thoughtUnits.push(currentUnit);

const balancedGroups = thoughtUnits.flatMap((unit) => {
  if (unit.length <= maxMergedWords) return [unit];
  const groupCount = Math.ceil(unit.length / 6);
  const baseSize = Math.floor(unit.length / groupCount);
  const remainder = unit.length % groupCount;
  const chunks = [];
  let cursor = 0;

  for (let index = 0; index < groupCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    chunks.push(unit.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
});

const groupedWords = [];
for (let index = 0; index < balancedGroups.length; index += 1) {
  const group = balancedGroups[index];
  const previous = groupedWords.at(-1);
  const next = balancedGroups[index + 1];
  const spokenDuration = group.at(-1).end - group[0].start;
  if (
    (group.length < 4 || spokenDuration < 0.85)
    && previous
    && previous.length + group.length <= maxMergedWords
    && group[0].start - previous.at(-1).end < 0.35
  ) {
    previous.push(...group);
  } else if (
    (group.length < 4 || spokenDuration < 0.85)
    && next
    && group.length + next.length <= maxMergedWords
    && next[0].start - group.at(-1).end < 0.35
  ) {
    next.unshift(...group);
  } else {
    groupedWords.push([...group]);
  }
}

const groups = groupedWords.map((groupWords, index) => {
  const nextStart = groupedWords[index + 1]?.[0]?.start ?? duration;
  return {
    id: `caption-group-${index + 1}`,
    words: groupWords,
    start: Math.max(0, groupWords[0].start),
    end: Math.min(duration, groupWords.at(-1).end + 0.12, nextStart - 0.04),
  };
});

const captionMarkup = groups.map((group) => `
  <div data-hf-id="hf-${group.id}" id="${group.id}" class="caption-group">
    ${group.words.map((word) => `<span data-hf-id="hf-${word.id}" id="${word.id}" class="caption-word">${escapeHtml(word.text)}</span>`).join("")}
  </div>`).join("");

const timeline = [];
for (const group of groups) {
  timeline.push(`tl.set("#${group.id}",{autoAlpha:1},${group.start.toFixed(3)});`);

  group.words.forEach((word, wordIndex) => {
    const nextWord = group.words[wordIndex + 1];
    const activeEnd = Math.min(
      group.end,
      Math.max(word.end, nextWord?.start ?? word.end + 0.08),
    );
    timeline.push(`tl.set("#${word.id}",{backgroundColor:"#117ABD",color:"#ECECEA"},${word.start.toFixed(3)});`);
    timeline.push(`tl.set("#${word.id}",{backgroundColor:"rgba(17,122,189,0)",color:"#111413"},${activeEnd.toFixed(3)});`);
  });

  timeline.push(`tl.set("#${group.id}",{autoAlpha:0},${group.end.toFixed(3)});`);
}
timeline.push(`tl.set({}, {}, ${duration});`);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920,height=1080">
  <title>Tiny Agent active-word caption preview</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{width:1920px;height:1080px;margin:0;overflow:hidden;background:#ECECEA}
    #composition{position:relative;width:1920px;height:1080px;overflow:hidden;background:#ECECEA;font-family:Inter,Arial,sans-serif}
    #source-video{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover}
    .caption-cover{position:absolute;z-index:20;left:0;right:0;top:848px;height:180px;background-color:#ECECEA;background-image:linear-gradient(rgba(17,20,19,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(17,20,19,.055) 1px,transparent 1px);background-size:64px 64px;background-position:0 -16px;box-shadow:0 -6px 18px rgba(17,20,19,.04)}
    .caption-layer{position:absolute;z-index:30;left:90px;right:90px;top:866px;height:142px;display:grid;place-items:center}
    .caption-group{position:absolute;visibility:hidden;opacity:0;max-width:1740px;min-height:92px;padding:13px 24px 15px;border:6px solid #111413;border-radius:24px;background:rgba(236,236,234,.98);box-shadow:10px 10px 0 rgba(17,20,19,.12);display:flex;flex-wrap:wrap;align-items:center;justify-content:center;column-gap:3px;row-gap:6px;font-size:46px;line-height:1.14;font-weight:800;text-align:center}
    .caption-word{display:inline-block;max-width:1600px;overflow:hidden;padding:2px 8px 4px;border-radius:9px;background:rgba(17,122,189,0);color:#111413;white-space:nowrap}
  </style>
</head>
<body>
  <div
    data-hf-id="hf-root"
    id="composition"
    data-composition-id="active-word-caption-preview"
    data-start="0"
    data-duration="${duration}"
    data-fps="30"
    data-width="1920"
    data-height="1080"
  >
    <video
      data-hf-id="hf-source-video"
      id="source-video"
      class="clip"
      data-start="0"
      data-duration="${duration}"
      data-media-start="${mediaStart}"
      data-track-index="1"
      data-volume="1"
      data-has-audio="true"
      src="assets/source.mp4"
    ></video>
    <div data-hf-id="hf-caption-cover" class="caption-cover"></div>
    <div data-hf-id="hf-caption-layer" class="caption-layer">${captionMarkup}</div>
  </div>
  <script>
    window.__timelines=window.__timelines||{};
    const tl=gsap.timeline({paused:true});
    ${timeline.join("\n    ")}
    tl.render(0,true,true);
    window.__timelines["active-word-caption-preview"]=tl;
  </script>
</body>
</html>`;

writeFileSync(outputPath, html);

const sizes = groups.map((group) => group.words.length);
const groupDurations = groups.map((group) => group.end - group.start);
const report = {
  pass: true,
  sourceStartSeconds: mediaStart,
  durationSeconds: duration,
  transcriptWordCount: words.length,
  groupCount: groups.length,
  wordsPerGroup: {
    min: Math.min(...sizes),
    max: Math.max(...sizes),
    mean: Number((sizes.reduce((sum, value) => sum + value, 0) / sizes.length).toFixed(2)),
  },
  groupDurationSeconds: {
    min: Number(Math.min(...groupDurations).toFixed(3)),
    max: Number(Math.max(...groupDurations).toFixed(3)),
  },
  palette: {
    activeBackground: "#117ABD",
    activeText: "#ECECEA",
    inactiveText: "#111413",
  },
  motion: "background-only",
};

writeFileSync(resolve(projectDir, "caption-preview-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
