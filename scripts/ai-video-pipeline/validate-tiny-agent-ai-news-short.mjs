#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const projectArgIndex = args.indexOf("--project");
const projectDir =
  projectArgIndex >= 0 && args[projectArgIndex + 1]
    ? resolve(args[projectArgIndex + 1])
    : process.cwd();
const requireRender = args.includes("--require-render");
const profilePath = resolve(
  scriptDir,
  "style-guides/tiny-agent-ai-news-short-active-profile.zh-CN.json"
);
const manifestPath = join(projectDir, "ai-news-manifest.json");

const failures = [];
const confirmations = [];

function requireCondition(condition, message) {
  if (condition) confirmations.push(message);
  else failures.push(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

requireCondition(existsSync(profilePath), "active profile exists");
requireCondition(existsSync(manifestPath), "project ai-news manifest exists");

if (failures.length) {
  console.error(failures.map((item) => `FAIL ${item}`).join("\n"));
  process.exit(1);
}

const profile = readJson(profilePath);
const manifest = readJson(manifestPath);

requireCondition(
  manifest.seriesProfile === profile.profileId,
  `profile is ${profile.profileId}`
);
requireCondition(manifest.singleTopic === true, "video declares one topic");
requireCondition(
  profile.topicPolicy.priorityVendors.some((vendor) =>
    vendor.toLowerCase().includes(manifest.topic.vendor.toLowerCase())
  ),
  `topic vendor is on the priority list: ${manifest.topic.vendor}`
);
requireCondition(
  Array.isArray(manifest.topic.officialSourceUrls) &&
    manifest.topic.officialSourceUrls.length > 0 &&
    manifest.topic.officialSourceUrls.every((url) => /^https:\/\//.test(url)),
  "official HTTPS sources are recorded"
);
requireCondition(
  Array.isArray(manifest.screenshots) &&
    manifest.screenshots.length >= profile.evidencePolicy.minimumRealScreenshots,
  `at least ${profile.evidencePolicy.minimumRealScreenshots} real screenshot is recorded`
);

for (const screenshot of manifest.screenshots || []) {
  requireCondition(
    profile.evidencePolicy.allowedScreenshotKinds.includes(screenshot.kind),
    `screenshot kind is allowed: ${screenshot.kind}`
  );
  requireCondition(
    existsSync(join(projectDir, screenshot.path)),
    `screenshot asset exists: ${screenshot.path}`
  );
  requireCondition(
    /^https:\/\//.test(screenshot.sourceUrl),
    `screenshot provenance is recorded: ${screenshot.path}`
  );
}

const compositionsDir = join(projectDir, "compositions");
const sceneFiles = readdirSync(compositionsDir)
  .filter((name) => /^\d{2}-.*\.html$/.test(name))
  .sort();
requireCondition(
  sceneFiles.length >= profile.video.sceneCount.min &&
    sceneFiles.length <= profile.video.sceneCount.max,
  `scene count is within ${profile.video.sceneCount.min}-${profile.video.sceneCount.max}`
);

let screenshotElementCount = 0;
const forbiddenPatterns = [
  ["repeating-linear-gradient", /repeating-linear-gradient/i],
  ["graph-paper", /graph-paper/i],
  ["pixel-glitch", /pixel-glitch/i],
  ["qr-block", /qr-block/i],
  ["hairline", /hairline/i],
  ["page-number", /page-number/i]
];

for (const sceneFile of sceneFiles) {
  const html = readFileSync(join(compositionsDir, sceneFile), "utf8");
  const primaryTags =
    html.match(/<[^>]+data-primary-role="[^"]+"[^>]*>/gi) || [];
  const primaryCountsByPhase = new Map();
  for (const tag of primaryTags) {
    const phase =
      tag.match(/data-primary-phase="([^"]+)"/i)?.[1] || "default";
    primaryCountsByPhase.set(
      phase,
      (primaryCountsByPhase.get(phase) || 0) + 1
    );
  }
  const screenshotCount = (html.match(/data-asset-kind="product-screenshot"/g) || [])
    .length;
  screenshotElementCount += screenshotCount;

  requireCondition(
    [...primaryCountsByPhase.values()].every(
      (count) => count <= profile.visual.maximumPrimaryElementsPerScene
    ),
    `${sceneFile} has at most ${profile.visual.maximumPrimaryElementsPerScene} primary elements`
  );

  for (const [label, pattern] of forbiddenPatterns) {
    requireCondition(!pattern.test(html), `${sceneFile} has no ${label}`);
  }

  const fontSizes = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].map(
    (match) => Number(match[1])
  );
  requireCondition(
    fontSizes.every((size) => size >= profile.visual.supportingTextMinPx),
    `${sceneFile} has no undersized authored text`
  );
}

requireCondition(screenshotElementCount > 0, "real screenshot appears in the composition");

const captionsPath = join(compositionsDir, "captions.html");
requireCondition(existsSync(captionsPath), "phrase captions exist");
if (existsSync(captionsPath)) {
  const captionsHtml = readFileSync(captionsPath, "utf8");
  const captionSize = Number(
    captionsHtml.match(/\.caption\s*\{[\s\S]*?font-size:\s*(\d+(?:\.\d+)?)px/i)?.[1] ||
      0
  );
  requireCondition(
    captionSize >= profile.visual.captionMinPx,
    `caption size is at least ${profile.visual.captionMinPx}px`
  );
}

const renderPath = join(projectDir, manifest.renderPath);
if (existsSync(renderPath)) {
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_name,codec_type,width,height,r_frame_rate",
        "-of",
        "json",
        renderPath
      ],
      { encoding: "utf8" }
    )
  );
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  const duration = Number(probe.format.duration);

  requireCondition(video?.width === profile.video.width, "render width is 1080");
  requireCondition(video?.height === profile.video.height, "render height is 1920");
  requireCondition(video?.r_frame_rate === `${profile.video.fps}/1`, "render is 30 fps");
  requireCondition(video?.codec_name === "h264", "render video codec is H.264");
  requireCondition(audio?.codec_name === "aac", "render audio codec is AAC");
  requireCondition(
    duration >= profile.video.durationSeconds.min &&
      duration <= profile.video.durationSeconds.max,
    `render duration is within ${profile.video.durationSeconds.min}-${profile.video.durationSeconds.max}s`
  );
} else if (requireRender) {
  failures.push(`render exists: ${manifest.renderPath}`);
} else {
  confirmations.push("render validation pending");
}

if (failures.length) {
  console.error(failures.map((item) => `FAIL ${item}`).join("\n"));
  process.exit(1);
}

console.log(
  `PASS Tiny Agent AI news short profile · ${confirmations.length} checks`
);
for (const confirmation of confirmations) {
  console.log(`  ✓ ${confirmation}`);
}
