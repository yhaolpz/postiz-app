#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const audioMeta = JSON.parse(
  readFileSync(resolve(projectDir, "audio_meta.json"), "utf8")
);

let offset = 0;
const groups = [];
for (const voice of audioMeta.voices) {
  for (const cue of voice.words) {
    groups.push({
      id: `caption-${groups.length + 1}`,
      text: cue.text,
      start: Number((offset + cue.start).toFixed(3)),
      end: Number((offset + cue.end).toFixed(3))
    });
  }
  offset += voice.duration_s;
}

for (let index = 0; index < groups.length - 1; index += 1) {
  groups[index].end = Number(
    Math.min(groups[index].end, groups[index + 1].start - 0.001).toFixed(3)
  );
}

const html = `<!doctype html>
<html lang="zh-CN">
  <body>
    <template>
      <style>
        #root {
          position: absolute;
          inset: 0;
          width: 1080px;
          height: 1920px;
          overflow: hidden;
          font-family: sans-serif;
        }
        #root,
        #root * {
          box-sizing: border-box;
        }
        .caption {
          position: absolute;
          left: 70px;
          top: 1470px;
          width: 940px;
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px 40px 32px;
          border-radius: 24px;
          background: rgba(16, 16, 16, 0.92);
          color: #f5f4ef;
          font-size: 58px;
          line-height: 1.22;
          font-weight: 800;
          letter-spacing: -0.03em;
          text-align: center;
          opacity: 0;
        }
      </style>
      <div
        id="root"
        data-composition-id="captions"
        data-duration="${audioMeta.total_duration_s}"
        data-width="1080"
        data-height="1920"
      >
        ${groups.map((group) => `<div id="${group.id}" class="caption">${group.text}</div>`).join("\n        ")}
      </div>
      <script>
        window.__timelines = window.__timelines || {};
        var groups = ${JSON.stringify(groups)};
        var tl = gsap.timeline({ paused: true });
        groups.forEach(function (group) {
          tl.set("#" + group.id, { opacity: 1 }, group.start);
          tl.set("#" + group.id, { opacity: 0 }, group.end);
        });
        window.__timelines["captions"] = tl;
      </script>
    </template>
  </body>
</html>
`;

writeFileSync(resolve(projectDir, "compositions/captions.html"), html);
console.log(
  `Built ${groups.length} phrase captions for ${audioMeta.total_duration_s}s`
);
