#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const groupsPath = resolve(projectDir, "caption_groups.json");
const captionsPath = resolve(projectDir, "compositions/captions.html");
const data = JSON.parse(readFileSync(groupsPath, "utf8"));
const words = data.groups.flatMap((group) =>
  group.words.map((word) => ({ ...word, frame: group.frame })),
);
const groups = [];

for (let index = 0; index < words.length; ) {
  const frame = words[index].frame;
  const chunk = [];
  while (
    index < words.length &&
    words[index].frame === frame &&
    chunk.length < 2
  ) {
    chunk.push(words[index]);
    index += 1;
  }
  groups.push({ frame, words: chunk });
}

const finalized = groups.map((group, groupIndex) => {
  const first = group.words[0];
  const last = group.words[group.words.length - 1];
  const next = groups[groupIndex + 1]?.words[0];
  const paddedEnd = Number((last.end + 0.12).toFixed(3));
  const end = next ? Math.min(paddedEnd, next.start) : paddedEnd;
  return {
    id: `caption-group-${groupIndex}`,
    frame: group.frame,
    start: first.start,
    end,
    text: group.words.map((word) => word.text).join(" "),
    words: group.words.map((word, wordIndex) => ({
      id: `caption-word-${groupIndex}-${wordIndex}`,
      text: word.text,
      start: word.start,
      end: word.end,
    })),
  };
});

data.groups = finalized;
writeFileSync(groupsPath, `${JSON.stringify(data, null, 2)}\n`);

const captions = readFileSync(captionsPath, "utf8");
const marker = /var GROUPS = \[[\s\S]*?\];\n  var DURATION =/;
if (!marker.test(captions)) {
  throw new Error("Could not find GROUPS payload in compositions/captions.html");
}
writeFileSync(
  captionsPath,
  captions.replace(
    marker,
    `var GROUPS = ${JSON.stringify(finalized)};\n  var DURATION =`,
  ),
);

console.log(
  `Regrouped ${words.length} caption phrases into ${finalized.length} two-phrase groups`,
);
