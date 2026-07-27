#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const scriptPath = resolve(projectDir, "SCRIPT.md");
const audioDir = resolve(projectDir, ".media/audio/voice");
const audioMetaPath = resolve(projectDir, "audio_meta.json");

function parseScript(markdown) {
  const lines = [];
  let current = null;
  const flush = () => {
    if (current?.text.trim()) {
      lines.push({ frame: current.frame, text: current.text.trim() });
    }
    current = null;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{2,3}\s+.*?\(Frame\s+(\d+)\)/i);
    if (heading) {
      flush();
      current = { frame: Number(heading[1]), text: "" };
      continue;
    }
    if (!current || /^\s*\*\*/.test(line)) continue;
    const spoken = line.match(/^(?: {4,}|\t)(.+)$/);
    if (spoken) {
      current.text += `${current.text ? " " : ""}${spoken[1].trim()}`;
    }
  }
  flush();
  return lines;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

function parseTimestamp(value) {
  const match = value.trim().match(/^(\d+):(\d+):(\d+)[,.](\d+)$/);
  if (!match) throw new Error(`Unsupported VTT timestamp: ${value}`);
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4]) / 1000
  );
}

function parseVtt(vtt) {
  const cues = [];
  const blocks = vtt.trim().split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const rows = block.split(/\r?\n/).map((row) => row.trim());
    const timingIndex = rows.findIndex((row) => row.includes(" --> "));
    if (timingIndex < 0) continue;
    const [startRaw, endRaw] = rows[timingIndex].split(" --> ");
    const text = rows.slice(timingIndex + 1).join(" ").trim();
    if (!text) continue;
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    const phrases =
      text.match(/[^，。！？；：]+[，。！？；：]?/g)?.map((part) => part.trim()) ?? [text];
    const weights = phrases.map((phrase) => Math.max(1, phrase.replace(/\s/g, "").length));
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    let cursor = start;
    phrases.forEach((phrase, index) => {
      const phraseEnd =
        index === phrases.length - 1
          ? end
          : cursor + ((end - start) * weights[index]) / totalWeight;
      cues.push({
        id: `phrase-${cues.length + 1}`,
        text: phrase,
        start: Number(cursor.toFixed(3)),
        end: Number(phraseEnd.toFixed(3))
      });
      cursor = phraseEnd;
    });
  }
  return cues;
}

mkdirSync(audioDir, { recursive: true });
const lines = parseScript(readFileSync(scriptPath, "utf8"));
const voices = [];

for (const line of lines) {
  const stem = String(line.frame).padStart(2, "0");
  const mediaPath = resolve(audioDir, `${stem}.mp3`);
  const subtitlePath = resolve(audioDir, `${stem}.vtt`);

  run("uvx", [
    "edge-tts",
    "--voice",
    "zh-CN-YunxiaNeural",
    "--rate=+40%",
    "--pitch=+0Hz",
    "--text",
    line.text,
    "--write-media",
    mediaPath,
    "--write-subtitles",
    subtitlePath
  ]);

  const duration = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      mediaPath
    ])
  );
  const words = parseVtt(readFileSync(subtitlePath, "utf8"));
  voices.push({
    frame: line.frame,
    path: relative(projectDir, mediaPath),
    duration_s: Number(duration.toFixed(3)),
    words
  });
}

const output = {
  tts_provider: "edge-tts",
  voice_id: "zh-CN-YunxiaNeural",
  rate: "+40%",
  bgm: null,
  voices,
  sfx: [],
  total_duration_s: Number(
    voices.reduce((total, voice) => total + voice.duration_s, 0).toFixed(3)
  )
};

writeFileSync(audioMetaPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Generated ${voices.length} Chinese voice segments, total ${output.total_duration_s}s → audio_meta.json`
);
