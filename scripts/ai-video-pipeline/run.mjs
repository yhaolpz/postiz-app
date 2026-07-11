#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const OpenAI = require('openai');
const sharp = require('sharp');
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const {
  Connection,
  WorkflowClient,
  WorkflowIdConflictPolicy,
} = require('@temporalio/client');
const {
  TypedSearchAttributes,
  defineSearchAttributeKey,
  SearchAttributeType,
} = require('@temporalio/common');

const execFile = promisify(execFileCallback);
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const defaultOutputRoot = path.join(rootDir, 'var/ai-video-pipeline/runs');

function loadDotEnv(filePath) {
  if (!fssync.existsSync(filePath)) return;

  const lines = fssync.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [rawKey, ...rest] = trimmed.split('=');
    const key = rawKey.trim();
    if (process.env[key]) continue;

    let value = rest.join('=').trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    if (
      [
        'post',
        'wait',
        'no-llm',
        'dry-run',
        'micro',
        'skip-token-refresh',
        'skip-temporal-init',
        'skip-workflow-kick',
        'skip-missing-platforms',
      ].includes(key)
    ) {
      args[key] = true;
      continue;
    }

    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'ai-video'
  );
}

function makeId(length = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
}

function cleanForCaption(value, max = 2000) {
  return value
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function splitWords(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_FPS = 30;
const TINY_AGENT_LAYOUT_STANDARD = 'cross-platform-balanced-v1';
const LAYOUT_LEFT = 80;
const LAYOUT_RIGHT = 1000;
const LAYOUT_CENTER_X = 540;
const MAIN_ART_TOP = 300;
const MAIN_ART_BOTTOM = 1110;
const MAIN_ART_SAFE_WIDTH = 820;
const MAIN_ART_SAFE_HEIGHT = 780;
const MAIN_ART_REGION_HEIGHT = MAIN_ART_BOTTOM - MAIN_ART_TOP;
const MIN_MAIN_ART_WIDTH_RATIO = 0.68;
const MIN_MAIN_ART_HEIGHT_RATIO = 0.52;
const MAIN_ART_TRANSITION_FRAMES = 4;
const DEFAULT_IMAGE_MODEL = 'gpt-image-1.5';
const SUPPORTED_KEYFRAME_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const FIXED_ZOOM_RENDERER = path.join(
  rootDir,
  'scripts/ai-video-pipeline/render-fixed-zoom.py'
);

function usesTinyAgentLayout(content) {
  return ['agent-sketchbook', 'tiny-agent-whiteboard'].includes(content?.style);
}

function tinyAgentLayoutSpec() {
  return {
    canvas: [VIDEO_WIDTH, VIDEO_HEIGHT],
    centerX: LAYOUT_CENTER_X,
    sideMargins: [LAYOUT_LEFT, VIDEO_WIDTH - LAYOUT_RIGHT],
    titleBaselineY: 240,
    mainArtRegion: [LAYOUT_LEFT, MAIN_ART_TOP, LAYOUT_RIGHT, MAIN_ART_BOTTOM],
    mainArtMaxSize: [MAIN_ART_SAFE_WIDTH, MAIN_ART_SAFE_HEIGHT],
    minMainArtWidthRatio: MIN_MAIN_ART_WIDTH_RATIO,
    subtitleBox: [80, 1130, 1000, 1430],
    criticalContentBottom: 1430,
  };
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapPlainText(value, maxChars = 26, maxLines = 2) {
  const words = splitWords(value);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (!lines.length && value) lines.push(String(value).slice(0, maxChars));
  return lines.slice(0, maxLines);
}

function buildOverlaySvg(scene, content) {
  const title = xmlEscape(content.seriesTitle || 'Tiny Agent');
  const caption = scene.footer || scene.subhead || scene.headline || content.title;
  const explicitCaptionLines = String(caption)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const captionLines =
    explicitCaptionLines.length > 1
      ? explicitCaptionLines.slice(0, 2)
      : wrapPlainText(caption, 27, 2);
  const lineHeight = 62;
  const firstY = captionLines.length === 1 ? 1290 : 1258;
  const captionTspans = captionLines
    .map((line, index) => `<tspan x="${LAYOUT_CENTER_X}" y="${firstY + index * lineHeight}">${xmlEscape(line)}</tspan>`)
    .join('');

  return Buffer.from(`
<svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { font-family: Arial, Helvetica, sans-serif; font-size: 68px; font-weight: 900; fill: #111827; }
    .caption { font-family: Arial, Helvetica, sans-serif; font-size: 50px; font-weight: 900; fill: #111827; }
  </style>
  <text class="title" x="${LAYOUT_CENTER_X}" y="240" text-anchor="middle">${title}</text>
  <path d="M115 1130 H965 Q1000 1130 1000 1165 V1395 Q1000 1430 965 1430 H115 Q80 1430 80 1395 V1165 Q80 1130 115 1130 Z" fill="#fff" stroke="#111827" stroke-width="7"/>
  <text class="caption" text-anchor="middle">${captionTspans}</text>
</svg>`);
}

function whiteRectSvg(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/></svg>`
  );
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function listImageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dir, entry.name))
    .filter((filePath) =>
      SUPPORTED_KEYFRAME_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    )
    .sort((a, b) => a.localeCompare(b));
}

function parseKeyframeFiles(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

async function resolveProvidedKeyframes(args) {
  const keyframeFiles = parseKeyframeFiles(
    args['keyframe-files'] || process.env.AI_VIDEO_KEYFRAME_FILES
  );
  if (keyframeFiles.length) return keyframeFiles;

  const keyframesDir = args['keyframes-dir'] || process.env.AI_VIDEO_KEYFRAMES_DIR;
  if (!keyframesDir) return [];
  return listImageFiles(path.resolve(keyframesDir));
}

function buildKeyframePrompt(content, scene, index) {
  const beat = scene.keyframePrompt || scene.visual || scene.headline || content.title;
  return [
    'Vertical 9:16 whiteboard stick figure explainer, clean white background.',
    'Use thick black marker line art, simple hand-drawn shapes, sparse blue highlights and tiny red warning marks only.',
    'Use the canonical first-video character proportions: engineer plus Tiny Agent plus objects should fill about 75-90% of the main art width, never miniature icon scale.',
    'Recurring Chinese software engineer stick figure on the left: large full-body whiteboard character, spiky short black hair with visible marker strokes, black round glasses, oval eyes, small nose and smile, simple white T-shirt, black shoes, friendly pointing or thumbs-up pose.',
    'Recurring friendly AI robot named Tiny Agent on the right: large white rounded head/body, black rounded face screen, two blue oval eyes, small blue smile, single antenna with blue dot, round ear covers, white limbs, brown tool belt with red and blue tools, small tool props or clipboard.',
    'Leave the top title area and bottom subtitle area mostly blank; do not render the final title text or final subtitle box because they are added as fixed overlays later.',
    'Do not shrink the characters to leave excessive whitespace. Do not change the engineer hairstyle/glasses or the robot head, face screen, antenna, ear covers, blue eyes, tool belt, and white rounded body.',
    'No Chinese text, no photorealism, no anime, no glossy 3D, no dense UI, no crowded background, no watermark, no logo, no distorted hands, no missing limbs, no tiny characters.',
    `Scene ${index + 1}: ${beat}`,
  ].join('\n');
}

async function writeImageResponse(image, destination) {
  if (image?.b64_json) {
    await fs.writeFile(destination, Buffer.from(image.b64_json, 'base64'));
    return;
  }

  if (image?.url) {
    const response = await fetch(image.url);
    if (!response.ok) {
      throw new Error(`Image download failed: ${response.status} ${response.statusText}`);
    }
    await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
    return;
  }

  throw new Error('Image generation returned no b64_json or url payload.');
}

async function generateImageKeyframes(content, outputDir, args) {
  const keyframesDir = path.join(outputDir, 'keyframes');
  await fs.mkdir(keyframesDir, { recursive: true });
  const provided = await resolveProvidedKeyframes(args);
  const requiredCount = content.scenes.length;

  if (provided.length) {
    if (provided.length < requiredCount) {
      throw new Error(
        `Only ${provided.length} keyframe image(s) provided, but ${requiredCount} scene(s) need keyframes.`
      );
    }

    const copied = [];
    for (let i = 0; i < requiredCount; i += 1) {
      const source = provided[i];
      const destination = path.join(
        keyframesDir,
        `keyframe-${String(i + 1).padStart(2, '0')}${path.extname(source).toLowerCase() || '.png'}`
      );
      await fs.copyFile(source, destination);
      copied.push(destination);
    }
    return { paths: copied, source: 'provided-image-keyframes' };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'Image keyframes are required. The Canvas renderer has been removed; set OPENAI_API_KEY for image generation or pass --keyframes-dir/--keyframe-files.'
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = args['image-model'] || process.env.AI_VIDEO_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const quality = args['image-quality'] || process.env.AI_VIDEO_IMAGE_QUALITY || 'medium';
  const paths = [];

  for (let i = 0; i < requiredCount; i += 1) {
    const prompt = buildKeyframePrompt(content, content.scenes[i], i);
    const response = await client.images.generate({
      model,
      prompt,
      size: '1024x1536',
      quality,
      output_format: 'png',
      n: 1,
    });
    const destination = path.join(keyframesDir, `keyframe-${String(i + 1).padStart(2, '0')}.png`);
    await writeImageResponse(response.data?.[0], destination);
    paths.push(destination);
  }

  return { paths, source: `openai-images:${model}` };
}

async function prepareArtLayer(keyframePath, outputDir, index) {
  const artDir = path.join(outputDir, 'art-layers');
  await fs.mkdir(artDir, { recursive: true });

  const trimmed = await sharp(keyframePath)
    .rotate()
    .flatten({ background: '#fff' })
    .trim({ background: '#fff', threshold: 18 })
    .png()
    .toBuffer();

  const resized = await sharp(trimmed)
    .resize({
      width: MAIN_ART_SAFE_WIDTH,
      height: MAIN_ART_SAFE_HEIGHT,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .flatten({ background: '#fff' })
    .png()
    .toBuffer({ resolveWithObject: true });

  const left = Math.round(LAYOUT_CENTER_X - resized.info.width / 2);
  const top = Math.round(
    MAIN_ART_TOP + (MAIN_ART_REGION_HEIGHT - resized.info.height) / 2
  );
  const buffer = await sharp({
    create: {
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: resized.data, left, top },
      { input: whiteRectSvg(VIDEO_WIDTH, MAIN_ART_TOP), left: 0, top: 0 },
      {
        input: whiteRectSvg(VIDEO_WIDTH, VIDEO_HEIGHT - MAIN_ART_BOTTOM),
        left: 0,
        top: MAIN_ART_BOTTOM,
      },
    ])
    .png()
    .toBuffer();

  const artPath = path.join(artDir, `art-${String(index + 1).padStart(2, '0')}.png`);
  await fs.writeFile(artPath, buffer);
  return { path: artPath, buffer };
}

async function detectMainArtAnchor(artBuffer) {
  const raw = await sharp(artBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  const channels = info.channels;
  let minX = VIDEO_WIDTH;
  let minY = MAIN_ART_BOTTOM;
  let maxX = 0;
  let maxY = MAIN_ART_TOP;

  for (let y = MAIN_ART_TOP; y < MAIN_ART_BOTTOM; y += 1) {
    for (let x = 0; x < VIDEO_WIDTH; x += 1) {
      const offset = (y * info.width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const colorRange = Math.max(r, g, b) - Math.min(r, g, b);
      if (Math.min(r, g, b) < 238 || (colorRange > 18 && Math.min(r, g, b) < 250)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 1);
        maxY = Math.max(maxY, y + 1);
      }
    }
  }

  const bbox = minX <= maxX && minY <= maxY
    ? [minX, minY, maxX, maxY]
    : [0, MAIN_ART_TOP, VIDEO_WIDTH, MAIN_ART_BOTTOM];
  const scale = {
    widthRatio: Number(((bbox[2] - bbox[0]) / VIDEO_WIDTH).toFixed(3)),
    heightRatio: Number(((bbox[3] - bbox[1]) / MAIN_ART_REGION_HEIGHT).toFixed(3)),
  };
  const anchorX = clamp(
    (bbox[0] + bbox[2]) / 2,
    LAYOUT_LEFT + 240,
    LAYOUT_RIGHT - 240
  );
  const anchorY = clamp((bbox[1] + bbox[3]) / 2, 480, 950);
  return {
    bbox,
    scale,
    anchor: [Number(anchorX.toFixed(2)), Number(anchorY.toFixed(2))],
  };
}

function assertMainArtScale(anchor, index) {
  if (
    anchor.scale.widthRatio >= MIN_MAIN_ART_WIDTH_RATIO &&
    anchor.scale.heightRatio >= MIN_MAIN_ART_HEIGHT_RATIO
  ) {
    return;
  }

  throw new Error(
    `Main art scale QA failed for segment ${index + 1}: content bbox is ` +
      `${anchor.scale.widthRatio}w x ${anchor.scale.heightRatio}h of the main art region. ` +
      `Use the first-video Tiny Agent character scale: engineer + robot + objects should ` +
      `fill at least ${MIN_MAIN_ART_WIDTH_RATIO} width and ${MIN_MAIN_ART_HEIGHT_RATIO} height.`
  );
}

async function renderOverlay(scene, content, outputDir, index) {
  const overlaysDir = path.join(outputDir, 'overlays');
  await fs.mkdir(overlaysDir, { recursive: true });
  const overlayPath = path.join(overlaysDir, `overlay-${String(index + 1).padStart(2, '0')}.png`);
  await sharp(buildOverlaySvg(scene, content)).png().toFile(overlayPath);
  return overlayPath;
}

async function renderFrames(content, outputDir, args = {}) {
  const keyframes = await generateImageKeyframes(content, outputDir, args);
  const scenes = [];
  const footerSet = new Set(content.scenes.map((scene) => scene.footer).filter(Boolean));
  if (content.scenes.length > 1 && footerSet.size <= 1) {
    throw new Error(
      'Subtitle QA failed: every scene has the same bottom caption. Add per-scene Subtitle blocks to the content plan.'
    );
  }

  for (let i = 0; i < content.scenes.length; i += 1) {
    const artLayer = await prepareArtLayer(keyframes.paths[i], outputDir, i);
    const anchor = await detectMainArtAnchor(artLayer.buffer);
    assertMainArtScale(anchor, i);
    const overlayPath = await renderOverlay(content.scenes[i], content, outputDir, i);
    scenes.push({
      ...content.scenes[i],
      keyframePath: keyframes.paths[i],
      keyframeSource: keyframes.source,
      artPath: artLayer.path,
      overlayPath,
      anchor,
      duration: Number(content.scenes[i].duration || 6),
    });
  }

  return scenes;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMarkdownValue(value) {
  return String(value || '')
    .trim()
    .replace(/`/g, '')
    .replace(/^"|"$/g, '')
    .trim();
}

function readPlanField(section, name) {
  const match = section.match(
    new RegExp(`^- ${escapeRegExp(name)}:\\s*(.+)$`, 'm')
  );
  return match ? stripMarkdownValue(match[1]) : '';
}

function readPlanKeyframes(section) {
  const match = section.match(
    /^- Keyframes:\n([\s\S]*?)(?=^- [A-Za-z][A-Za-z -]+:|\n### |\n## |(?![\s\S]))/m
  );
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.match(/^\s+-\s+(.+)$/)?.[1])
    .filter(Boolean)
    .map(stripMarkdownValue);
}

function readPlanList(section, name) {
  const match = section.match(
    new RegExp(
      `^- ${escapeRegExp(name)}:\\n([\\s\\S]*?)(?=^- [A-Za-z][A-Za-z -]+:|\\n### |\\n## |(?![\\s\\S]))`,
      'm'
    )
  );
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.match(/^\s+-\s+(.+)$/)?.[1])
    .filter(Boolean)
    .map((value) => stripMarkdownValue(value).replace(/\s*\/\s*/g, '\n'));
}

function compactCaption(value, maxChars = 54) {
  const cleaned = stripMarkdownValue(value)
    .replace(/\bAI agent\b/gi, 'agent')
    .replace(/\ban agent\b/gi, 'an agent')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  const clause = cleaned.split(/,\s+|;\s+|\s+then\s+/i)[0]?.trim();
  return clause && clause.length <= maxChars ? clause : `${cleaned.slice(0, maxChars - 1).trim()}…`;
}

function buildFallbackSubtitleBlocks({
  hook,
  narration,
  onScreenText,
  count,
}) {
  const sentences =
    narration.match(/[^.!?]+[.!?]+/g)?.map((sentence) => sentence.trim()) || [];
  const blocks = [];
  if (hook) blocks.push(hook);

  const toolSentence = sentences.find(
    (sentence) => /tool|check|verify|result/i.test(sentence)
  );
  if (toolSentence) blocks.push(compactCaption(toolSentence));

  for (const sentence of sentences) {
    if (blocks.length >= count - 1) break;
    const caption = compactCaption(sentence);
    if (!blocks.includes(caption)) blocks.push(caption);
  }

  if (onScreenText) blocks.push(onScreenText);
  while (blocks.length < count) {
    blocks.push(compactCaption(sentences[blocks.length] || onScreenText || hook || 'Tiny Agent'));
  }
  return blocks.slice(0, count);
}

function parsePlanHashtags(value) {
  return String(value || '')
    .replace(/`/g, '')
    .split(/\s+/)
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);
}

function formatDateInShanghai(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function contentFromPlan(args) {
  const planFile = path.resolve(
    args['plan-file'] ||
      process.env.AI_VIDEO_PLAN_FILE ||
      path.join(
        rootDir,
        'scripts/ai-video-pipeline/content-plans/2026-07-agent-sketchbook.md'
      )
  );
  const planDate =
    args.date || process.env.AI_VIDEO_PLAN_DATE || formatDateInShanghai();
  const planText = await fs.readFile(planFile, 'utf8');
  const sectionMatch = planText.match(
    new RegExp(
      `(?:^|\\n)### ${escapeRegExp(planDate)}[^\\n]* - ([^\\n]+)\\n([\\s\\S]*?)(?=\\n### \\d{4}-\\d{2}-\\d{2}|\\n## |(?![\\s\\S]))`
    )
  );

  if (!sectionMatch) {
    throw new Error(`No content plan entry found for ${planDate} in ${planFile}`);
  }

  const episodeTitle = stripMarkdownValue(sectionMatch[1]);
  const section = sectionMatch[2];
  const tinyPoint = readPlanField(section, 'Tiny point');
  const hook = readPlanField(section, 'Hook');
  const narration = readPlanField(section, 'Narration');
  const onScreenText = readPlanField(section, 'On-screen text');
  const caption = readPlanField(section, 'TikTok caption');
  const youtubeTitle = readPlanField(section, 'YouTube Shorts title') || episodeTitle;
  const hashtags = parsePlanHashtags(readPlanField(section, 'Hashtags'));
  const keyframes = readPlanKeyframes(section);
  const explicitSubtitleBlocks = readPlanList(section, 'Subtitle blocks');

  if (!narration || !keyframes.length) {
    throw new Error(`Content plan entry for ${planDate} is missing narration or keyframes.`);
  }

  const sceneCount = Math.min(keyframes.length, 4);
  const sentences =
    narration.match(/[^.!?]+[.!?]+/g)?.map((sentence) => sentence.trim()) || [];
  const viewerBeats = [
    hook || tinyPoint,
    sentences.slice(0, 2).join(' '),
    sentences.slice(2, 4).join(' '),
    onScreenText || sentences.slice(-1).join(' '),
  ].map(stripMarkdownValue);
  const subtitleBlocks = explicitSubtitleBlocks.length
    ? explicitSubtitleBlocks
    : buildFallbackSubtitleBlocks({
        hook,
        narration,
        onScreenText,
        count: sceneCount,
      });

  const defaultDurations = keyframes.length >= 4 ? [5, 6, 6, 7] : [6, 7, 7];
  const scenes = keyframes.slice(0, sceneCount).map((keyframe, index) => ({
    duration: defaultDurations[index] || 6,
    visual: 'whiteboard',
    headline: index === 0 ? hook || episodeTitle : onScreenText || episodeTitle,
    subhead: viewerBeats[index] || caption || episodeTitle,
    keyframePrompt: keyframe,
    footer: subtitleBlocks[index] || onScreenText || episodeTitle,
  }));

  return {
    style: 'tiny-agent-whiteboard',
    seriesTitle: 'Tiny Agent',
    planDate,
    sourcePlanFile: planFile,
    title: youtubeTitle,
    description: caption || episodeTitle,
    hashtags: hashtags.length ? hashtags : ['AI', 'AIAgents', 'TechExplained', 'TinyAgent'],
    narration,
    scenes,
  };
}

function fallbackContent(topic, args = {}) {
  const isHumanDebug =
    args.style === 'human-debug' ||
    process.env.AI_VIDEO_STYLE === 'human-debug';
  const isMicro =
    args.micro ||
    args.style === 'micro' ||
    process.env.AI_VIDEO_STYLE === 'micro';

  if (isHumanDebug) {
    return {
      style: 'human-debug',
      seriesTitle: 'HUMAN DEBUG LOG #001',
      title: 'Human Debug Log #001: Meetings reproduce when ignored',
      description:
        'A short office comedy story about ignoring one meeting invite and losing to the calendar.',
      hashtags: ['WorkTok', 'OfficeHumor', 'CorporateLife', 'ProgrammerHumor', 'TikTokComedy'],
      narration: [
        'I ignored one meeting invite.',
        'Big mistake.',
        'Five minutes later, it came back with friends.',
        'One was called quick sync.',
        'One was called pre-sync.',
        'And one was a meeting about the meeting.',
        'I closed my laptop.',
        'The calendar won.',
      ].join(' '),
      scenes: [
        {
          duration: 6,
          headline: 'I ignored one meeting invite.',
          footer: 'I ignored one meeting invite.',
        },
        {
          duration: 8,
          headline: 'It came back with friends.',
          footer: 'It came back with friends.',
        },
        {
          duration: 7,
          headline: 'The calendar won.',
          footer: 'The calendar won.',
        },
      ],
    };
  }

  if (isMicro) {
    return {
      title: 'AI can sound confident and still be wrong #Shorts',
      description:
        'A 25-second AI tip: confidence is not the same as truth. Check important answers.',
      hashtags: ['AI', 'ChatGPT', 'TechTips', 'Shorts'],
      narration: [
        'Quick AI tip.',
        'If an AI answer sounds confident, that does not mean it is true.',
        'AI is very good at choosing likely words.',
        'It is not automatically checking reality.',
        'So use it for drafts and ideas.',
        'For facts that matter, ask where the answer came from, then verify one source.',
      ].join(' '),
      scenes: [
        {
          duration: 5,
          visual: 'beforeAfter',
          headline: 'Confident does not mean true',
          subhead: 'AI can be smooth and still be wrong.',
          before: 'Sounds right.',
          after: 'Needs checking.',
          footer: 'One tiny AI rule.',
        },
        {
          duration: 7,
          visual: 'example',
          headline: 'What AI is doing',
          subhead: 'It chooses likely words.',
          labels: ['Question', 'AI', 'Answer'],
          example: 'Likely answer is not the same as verified answer.',
          footer: 'Good draft. Not proof.',
        },
        {
          duration: 7,
          visual: 'flow',
          headline: 'Use it like this',
          subhead: 'Draft first. Verify important facts.',
          labels: ['Ask', 'Draft', 'Source', 'Check'],
          stepBodies: [
            'Ask simply.',
            'Get a draft.',
            'Request sources.',
            'Verify one.',
          ],
          footer: 'The check is the skill.',
        },
        {
          duration: 5,
          visual: 'warning',
          headline: 'The rule',
          subhead: 'Trust the workflow, not the tone.',
          useWhen: 'Use AI for speed.',
          avoidWhen: 'Do not trust confidence alone.',
          rule: 'Important answer? Verify it.',
          footer: 'Follow for tiny AI lessons.',
        },
      ],
    };
  }

  const isMcp = /mcp|model context protocol/i.test(topic);
  const title = isMcp ? 'MCP explained in 60 seconds' : `${topic} explained simply`;
  const narration = isMcp
    ? [
        'Everyone says MCP is USB-C for AI apps. Here is what that actually means.',
        'An AI agent can think, but it still needs a clean way to use tools.',
        'Before MCP, every app needed a custom connector. Files, Slack, databases, and APIs all had different instructions.',
        'With MCP, tools expose one standard interface. The agent can discover what a tool does, send a request, and read the result.',
        'Simple example. You ask an agent to prepare a launch update. It reads the project notes, checks analytics, drafts the summary, and sends it to the right place.',
        'MCP does not make agents magically safe. You still need permissions, logging, and human review for risky actions.',
      ].join(' ')
    : [
        `${topic} sounds complicated, but the idea is simple.`,
        'Instead of asking an AI for one answer, you give it a goal, the right context, and a small set of tools.',
        'The system breaks the goal into steps, checks what it knows, calls tools when needed, and returns a result you can inspect.',
        'A simple example is an agent that reads a bug report, finds the related logs, drafts a fix plan, and asks a human before changing production.',
        'The trick is not adding more agents. The trick is making each step observable, testable, and easy to stop.',
      ].join(' ');

  return {
    title,
    description:
      'A simple visual explanation of an AI agent concept, with one concrete example and one practical caution.',
    hashtags: ['AI', 'AIAgents', 'TechExplained', 'MCP'],
    narration,
    scenes: [
      {
        duration: 7,
        visual: 'flow',
        headline: isMcp ? 'MCP is not magic' : `${topic} in one minute`,
        subhead: 'It is a simple way to connect an AI system to useful tools.',
        body: 'One concept. One example.',
        labels: ['Goal', 'Context', 'Tool', 'Result'],
        stepBodies: [
          'What the user wants.',
          'What the model needs.',
          'What the agent can call.',
          'What comes back.',
        ],
        footer: 'Simple first. Accurate second. Useful always.',
      },
      {
        duration: 8,
        visual: 'beforeAfter',
        headline: isMcp ? 'Before MCP vs after MCP' : 'Before vs after',
        subhead: 'The real problem is integration mess.',
        before: 'Every tool needs a custom connector and custom instructions.',
        after: 'Tools expose a shared interface the agent can understand.',
        footer: 'Less custom glue, more reusable tool access.',
      },
      {
        duration: 8,
        visual: 'hub',
        headline: 'The agent still needs tools',
        subhead: 'The model decides. The tools do the work.',
        body: 'Plan, choose, call, inspect.',
        labels: ['Agent', 'Docs', 'API', 'Database'],
        footer: 'A useful agent is a model plus controlled tool access.',
      },
      {
        duration: 10,
        visual: 'example',
        headline: 'One simple example',
        subhead: 'Prepare a launch update without copying data by hand.',
        labels: ['Launch notes', 'Agent', 'Draft update'],
        example:
          'The agent reads project notes, checks metrics, drafts a short update, and asks for review before publishing.',
        footer: 'The example matters more than the buzzword.',
      },
      {
        duration: 8,
        visual: 'warning',
        headline: 'Where people get it wrong',
        subhead: 'A protocol does not remove judgment.',
        useWhen: 'Use it for repeatable tool access across files, apps, and APIs.',
        avoidWhen: 'Do not use an agent when a normal script is more predictable.',
        rule: 'Add permissions, logs, evals, and human review for risky actions.',
        footer: 'Good agents are designed systems, not loose prompts.',
      },
      {
        duration: 7,
        visual: 'flow',
        headline: 'The takeaway',
        subhead: isMcp
          ? 'MCP standardizes how agents connect to tools.'
          : 'Agents are useful when the task needs decisions plus actions.',
        body: 'Keep the tool surface small and observable.',
        labels: ['Small scope', 'Clear tools', 'Logs', 'Review'],
        stepBodies: [
          'Solve one job.',
          'Expose only needed actions.',
          'Record every call.',
          'Approve risky steps.',
        ],
        footer: 'Follow for simple AI agent explainers.',
      },
    ],
  };
}

async function generateContent(topic, args) {
  if (args['no-llm'] || !process.env.OPENAI_API_KEY) {
    return fallbackContent(topic, args);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = args.model || process.env.AI_VIDEO_LLM_MODEL || 'gpt-4.1';
  const isMicro =
    args.micro ||
    args.style === 'micro' ||
    process.env.AI_VIDEO_STYLE === 'micro';
  const duration = args.duration || process.env.AI_VIDEO_DURATION || (isMicro ? '20-30' : '45-60');
  const sceneCount = isMicro ? '3-4' : '5-7';
  const narrationLimit = isMicro ? '85' : '950';
  const prompt = `Create a ${duration} second vertical video script for an AI concept explainer.

Topic: ${topic}

Audience: broad general audience, including people who only casually use AI.
Style: simple, precise, visual, no hype, no emoji, no fake news.
Content rule: explain only one tiny point. No jargon unless the topic itself requires it.
Retention rule: start with a sharp everyday problem, not a definition.
Format: return only valid JSON with:
{
  "title": string under 90 chars,
  "description": string under 500 chars,
  "hashtags": string[],
  "narration": string under ${narrationLimit} words,
  "scenes": Array of ${sceneCount} objects with:
    "duration": number,
    "visual": "flow" | "beforeAfter" | "hub" | "example" | "warning",
    "headline": string,
    "subhead": string,
    "body": string,
    "labels": string[],
    "before": optional string,
    "after": optional string,
    "example": optional string,
    "useWhen": optional string,
    "avoidWhen": optional string,
    "rule": optional string,
    "footer": string
}

Do not mention sources unless they were provided. Make the explanation evergreen and safe to publish.`;

  try {
    const result = await client.chat.completions.create({
      model,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content:
            'You write accurate short-form AI education scripts. Return strict JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const text = result.choices[0]?.message?.content?.trim() || '';
    const jsonText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(jsonText);

    if (!parsed.title || !parsed.narration || !Array.isArray(parsed.scenes)) {
      throw new Error('missing required fields');
    }

    return {
      ...fallbackContent(topic, args),
      ...parsed,
      scenes: parsed.scenes.slice(0, 7),
    };
  } catch (error) {
    console.warn(`LLM generation failed, using fallback content: ${error.message}`);
    return fallbackContent(topic, args);
  }
}

async function generateSpeech(content, outputDir, args) {
  const provider = args.tts || process.env.AI_VIDEO_TTS_PROVIDER || 'say';
  const narrationPath = path.join(outputDir, 'narration.txt');
  await fs.writeFile(narrationPath, content.narration, 'utf8');

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const speech = await client.audio.speech.create({
      model: process.env.AI_VIDEO_OPENAI_TTS_MODEL || 'tts-1',
      voice: process.env.AI_VIDEO_OPENAI_TTS_VOICE || 'alloy',
      input: content.narration,
      response_format: 'mp3',
    });
    const audioPath = path.join(outputDir, 'narration.mp3');
    await fs.writeFile(audioPath, Buffer.from(await speech.arrayBuffer()));
    return audioPath;
  }

  if (provider === 'edge-tts') {
    const audioPath = path.join(outputDir, 'narration.mp3');
    const subtitlesPath = path.join(outputDir, 'narration.vtt');
    const voice = args.voice || process.env.AI_VIDEO_TTS_VOICE || 'en-US-BrianNeural';
    const rate = String(args.rate || process.env.AI_VIDEO_TTS_RATE || '+8%');
    await execFile(
      process.env.AI_VIDEO_EDGE_TTS_COMMAND || 'uvx',
      [
        'edge-tts',
        '-f',
        narrationPath,
        '-v',
        voice,
        '--rate',
        rate,
        '--write-media',
        audioPath,
        '--write-subtitles',
        subtitlesPath,
      ],
      { cwd: rootDir }
    );
    return audioPath;
  }

  const audioPath = path.join(outputDir, 'narration.aiff');
  const voice = args.voice || process.env.AI_VIDEO_TTS_VOICE || 'Samantha';
  const rate = String(args.rate || process.env.AI_VIDEO_TTS_RATE || '188');
  await execFile('say', ['-v', voice, '-r', rate, '-f', narrationPath, '-o', audioPath], {
    cwd: rootDir,
  });
  return audioPath;
}

async function getDuration(filePath) {
  const { stdout } = await execFile('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  return Number(stdout.trim());
}

async function probeMedia(filePath) {
  const { stdout } = await execFile('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'stream=index,codec_type,codec_name,width,height,r_frame_rate,duration,nb_frames,channels',
    '-show_entries',
    'format=duration',
    '-of',
    'json',
    filePath,
  ]);
  return JSON.parse(stdout);
}

function bboxFromRawRgb(data, width, region, threshold = 28) {
  const [left, top, right, bottom] = region;
  let minX = right;
  let minY = bottom;
  let maxX = left;
  let maxY = top;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * width + x) * 3;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const diff = Math.max(
        Math.abs(255 - r),
        Math.abs(255 - g),
        Math.abs(255 - b)
      );
      if (diff > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 1);
        maxY = Math.max(maxY, y + 1);
      }
    }
  }

  if (minX > maxX || minY > maxY) return null;
  return [minX, minY, maxX, maxY];
}

async function bboxFromImageRegion(imagePath, region) {
  const image = sharp(imagePath).removeAlpha().raw();
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  return bboxFromRawRgb(data, info.width, region);
}

function bboxesWithinTolerance(a, b, tolerance = 2) {
  if (!a || !b) return false;
  return a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
}

async function extractPreviewFrame(videoPath, time, outputPath) {
  await execFile('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    Math.max(0, time).toFixed(3),
    '-i',
    videoPath,
    '-frames:v',
    '1',
    outputPath,
  ]);
}

async function checkStaticOverlays(videoPath, frames, videoDuration, outputDir) {
  const previewsDir = path.join(outputDir, 'previews');
  await fs.mkdir(previewsDir, { recursive: true });
  const baseDuration = frames.reduce((total, frame) => total + frame.duration, 0);
  const durationScale = videoDuration / baseDuration;
  let cursor = 0;
  const checks = [];

  for (let index = 0; index < frames.length; index += 1) {
    const segmentDuration = frames[index].duration * durationScale;
    const startTime = cursor + Math.min(0.2, segmentDuration / 4);
    const endTime = cursor + Math.max(0, segmentDuration - Math.min(0.2, segmentDuration / 4));
    cursor += segmentDuration;

    const startPath = path.join(previewsDir, `scene${index + 1}-start.png`);
    const endPath = path.join(previewsDir, `scene${index + 1}-end.png`);
    await extractPreviewFrame(videoPath, startTime, startPath);
    await extractPreviewFrame(videoPath, endTime, endPath);

    const titleStart = await bboxFromImageRegion(startPath, [0, 0, VIDEO_WIDTH, MAIN_ART_TOP]);
    const titleEnd = await bboxFromImageRegion(endPath, [0, 0, VIDEO_WIDTH, MAIN_ART_TOP]);
    const captionStart = await bboxFromImageRegion(startPath, [0, MAIN_ART_BOTTOM, VIDEO_WIDTH, VIDEO_HEIGHT]);
    const captionEnd = await bboxFromImageRegion(endPath, [0, MAIN_ART_BOTTOM, VIDEO_WIDTH, VIDEO_HEIGHT]);
    const pass =
      bboxesWithinTolerance(titleStart, titleEnd) &&
      bboxesWithinTolerance(captionStart, captionEnd);

    checks.push({
      segment: index + 1,
      titleStart,
      titleEnd,
      captionStart,
      captionEnd,
      pass,
    });

    if (!pass) {
      throw new Error(
        `Static overlay QA failed for segment ${index + 1}: title/subtitle moved or resized.`
      );
    }
  }

  return checks;
}

async function checkStableZoom(videoPath, frames, videoDuration) {
  const sampleWidth = 270;
  const sampleHeight = 480;
  const sampleFps = 10;
  const frameSize = sampleWidth * sampleHeight * 3;
  const { stdout } = await execFile(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      videoPath,
      '-vf',
      `fps=${sampleFps},scale=${sampleWidth}:${sampleHeight}:flags=bicubic`,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 }
  );

  const centers = [];
  for (let offset = 0; offset + frameSize <= stdout.length; offset += frameSize) {
    const frame = stdout.subarray(offset, offset + frameSize);
    const bbox = bboxFromRawRgb(frame, sampleWidth, [0, 75, sampleWidth, 330]);
    centers.push(
      bbox
        ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
        : [Number.NaN, Number.NaN]
    );
  }

  const baseDuration = frames.reduce((total, frame) => total + frame.duration, 0);
  const durationScale = videoDuration / baseDuration;
  let cursor = 0;
  const checks = [];

  for (let index = 0; index < frames.length; index += 1) {
    const segmentDuration = frames[index].duration * durationScale;
    const margin = Math.min(0.2, segmentDuration / 4);
    const start = Math.ceil((cursor + margin) * sampleFps);
    cursor += segmentDuration;
    const end = Math.min(
      centers.length,
      Math.floor((cursor - margin) * sampleFps)
    );
    const segment = centers
      .slice(start, end)
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    let maxStep = 0;
    for (let i = 1; i < segment.length; i += 1) {
      const dx = segment[i][0] - segment[i - 1][0];
      const dy = segment[i][1] - segment[i - 1][1];
      maxStep = Math.max(maxStep, Math.hypot(dx, dy));
    }
    const pass = maxStep <= 1.0;
    checks.push({
      segment: index + 1,
      sampledFrames: segment.length,
      maxFrameToFrameCenterStepLowResPx: Number(maxStep.toFixed(3)),
      pass,
    });
    if (!pass) {
      throw new Error(
        `Stable zoom QA failed for segment ${index + 1}: center step ${maxStep.toFixed(3)} low-res px.`
      );
    }
  }

  return checks;
}

async function verifyRenderedVideo(videoPath, audioPath, frames, outputDir) {
  const probe = await probeMedia(videoPath);
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream) => stream.codec_type === 'audio');
  if (!videoStream || !audioStream) {
    throw new Error('Rendered video must contain both video and audio streams.');
  }

  const videoDuration = Number(videoStream.duration || probe.format?.duration || 0);
  const audioDuration = Number(audioStream.duration || 0);
  const sourceAudioDuration = await getDuration(audioPath);

  if (
    Number(videoStream.width) !== VIDEO_WIDTH ||
    Number(videoStream.height) !== VIDEO_HEIGHT ||
    videoStream.r_frame_rate !== `${VIDEO_FPS}/1`
  ) {
    throw new Error(
      `Rendered video spec mismatch: ${videoStream.width}x${videoStream.height} ${videoStream.r_frame_rate}.`
    );
  }

  if (videoDuration < 20 || videoDuration > 30) {
    throw new Error(
      `Duration QA failed: video duration must be 20-30s, got ${videoDuration.toFixed(3)}s. Lengthen or tighten the narration instead of padding silence.`
    );
  }

  if (videoDuration - audioDuration > 0.35 || videoDuration - sourceAudioDuration > 0.35) {
    throw new Error(
      `Audio tail QA failed: video=${videoDuration.toFixed(3)}s audio=${audioDuration.toFixed(3)}s source=${sourceAudioDuration.toFixed(3)}s.`
    );
  }

  const staticOverlayChecks = await checkStaticOverlays(
    videoPath,
    frames,
    videoDuration,
    outputDir
  );
  const stableZoomChecks = await checkStableZoom(videoPath, frames, videoDuration);

  return {
    width: Number(videoStream.width),
    height: Number(videoStream.height),
    fps: videoStream.r_frame_rate,
    durationSeconds: videoDuration,
    videoFrames: Number(videoStream.nb_frames || 0),
    videoCodec: videoStream.codec_name,
    audioCodec: audioStream.codec_name,
    audioChannels: Number(audioStream.channels || 0),
    audioDurationSeconds: audioDuration,
    sourceAudioDurationSeconds: sourceAudioDuration,
    passesStaticOverlayCheck: true,
    passesStableZoomCheck: true,
    passesAudioTailCheck: true,
    staticOverlayChecks,
    stableZoomChecks,
  };
}

async function readJsonIfExists(filePath) {
  if (!filePath || !fssync.existsSync(filePath)) return null;
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function assertReusableVideoSpec({ videoStream, audioStream, videoDuration, audioDuration }) {
  if (!videoStream || !audioStream) {
    throw new Error('Reusable video must contain both video and audio streams.');
  }

  if (
    Number(videoStream.width) !== VIDEO_WIDTH ||
    Number(videoStream.height) !== VIDEO_HEIGHT ||
    videoStream.r_frame_rate !== `${VIDEO_FPS}/1`
  ) {
    throw new Error(
      `Reusable video spec mismatch: ${videoStream.width}x${videoStream.height} ${videoStream.r_frame_rate}.`
    );
  }

  if (videoDuration < 20 || videoDuration > 30) {
    throw new Error(
      `Reusable video duration must be 20-30s, got ${videoDuration.toFixed(3)}s.`
    );
  }

  if (videoDuration - audioDuration > 0.35) {
    throw new Error(
      `Reusable video has a silent tail: video=${videoDuration.toFixed(3)}s audio=${audioDuration.toFixed(3)}s.`
    );
  }
}

async function verifyReusableVideo(videoPath, args = {}, content = null) {
  const probe = await probeMedia(videoPath);
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream) => stream.codec_type === 'audio');
  const videoDuration = Number(videoStream?.duration || probe.format?.duration || 0);
  const audioDuration = Number(audioStream?.duration || 0);

  assertReusableVideoSpec({
    videoStream,
    audioStream,
    videoDuration,
    audioDuration,
  });

  const summaryPath =
    args['reuse-summary'] ||
    process.env.AI_VIDEO_REUSE_SUMMARY ||
    path.join(path.dirname(videoPath), 'summary.json');
  const sourceSummary = await readJsonIfExists(summaryPath);
  const sourceVerification = sourceSummary?.verification || {};

  if (
    usesTinyAgentLayout(content) &&
    sourceSummary?.layoutStandard !== TINY_AGENT_LAYOUT_STANDARD
  ) {
    throw new Error(
      `Reusable Tiny Agent video must pass ${TINY_AGENT_LAYOUT_STANDARD}; ` +
        'regenerate it with the current balanced layout before publishing.'
    );
  }

  if (sourceSummary && sourceSummary.videoPath) {
    const sourceVideoPath = path.resolve(sourceSummary.videoPath);
    if (sourceVideoPath !== videoPath) {
      throw new Error(
        `Reusable summary belongs to a different video: ${sourceSummary.videoPath}`
      );
    }
  }

  for (const key of [
    'passesStaticOverlayCheck',
    'passesStableZoomCheck',
    'passesAudioTailCheck',
  ]) {
    if (sourceSummary && sourceVerification[key] !== true) {
      throw new Error(`Reusable video summary did not pass ${key}.`);
    }
  }

  return {
    sourceSummary,
    summaryPath: sourceSummary ? summaryPath : null,
    verification: {
      ...sourceVerification,
      width: Number(videoStream.width),
      height: Number(videoStream.height),
      fps: videoStream.r_frame_rate,
      durationSeconds: videoDuration,
      videoFrames: Number(videoStream.nb_frames || sourceVerification.videoFrames || 0),
      videoCodec: videoStream.codec_name,
      audioCodec: audioStream.codec_name,
      audioChannels: Number(audioStream.channels || 0),
      audioDurationSeconds: audioDuration,
      reusedVideoProbe: true,
      ...(sourceSummary ? { reusedSummaryPath: summaryPath } : {}),
    },
  };
}

function allocateSceneFrames(frames, audioDuration) {
  const totalFrames = Math.max(1, Math.round(audioDuration * VIDEO_FPS));
  const baseDuration = frames.reduce((total, frame) => total + frame.duration, 0);
  let assignedFrames = 0;

  return frames.map((frame, index) => {
    const remainingScenes = frames.length - index;
    const remainingFrames = totalFrames - assignedFrames;
    const sceneFrames =
      index === frames.length - 1
        ? remainingFrames
        : Math.max(
            1,
            Math.round((frame.duration / baseDuration) * totalFrames)
          );
    const boundedFrames = Math.max(
      1,
      Math.min(sceneFrames, remainingFrames - remainingScenes + 1)
    );
    assignedFrames += boundedFrames;
    return boundedFrames;
  });
}

async function renderVideo(frames, audioPath, outputDir) {
  const audioDuration = await getDuration(audioPath);
  if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
    throw new Error(`Invalid narration audio duration: ${audioDuration}`);
  }

  const videoPath = path.join(outputDir, 'video.mp4');
  const sceneFrameCounts = allocateSceneFrames(frames, audioDuration);
  const manifestPath = path.join(outputDir, 'render-manifest.json');
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        fps: VIDEO_FPS,
        zoomEnd: 1.04,
        transitionFrames: MAIN_ART_TRANSITION_FRAMES,
        mainArtTop: MAIN_ART_TOP,
        mainArtBottom: MAIN_ART_BOTTOM,
        audioPath,
        videoPath,
        scenes: frames.map((frame, index) => ({
          artPath: frame.artPath,
          overlayPath: frame.overlayPath,
          anchor: frame.anchor.anchor,
          frames: sceneFrameCounts[index],
        })),
      },
      null,
      2
    )
  );

  await execFile('python3', [FIXED_ZOOM_RENDERER, manifestPath], {
    cwd: rootDir,
  });
  return videoPath;
}

async function getLocalOrganization() {
  if (!process.env.DATABASE_URL) return undefined;
  const prisma = new PrismaClient();
  try {
    return await prisma.organization.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, apiKey: true },
    });
  } finally {
    await prisma.$disconnect();
  }
}

function getPostizBaseUrl() {
  return (
    process.env.POSTIZ_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function isLocalPostizUrl() {
  try {
    const url = new URL(getPostizBaseUrl());
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function shouldUseLocalTemporal(args) {
  return (
    isLocalPostizUrl() &&
    process.env.TEMPORAL_TLS !== 'true' &&
    process.env.AI_VIDEO_SKIP_TEMPORAL_INIT !== 'true' &&
    !args['skip-temporal-init']
  );
}

async function withTemporalConnection(args, callback) {
  const connection = await Connection.connect({
    address:
      args['temporal-address'] ||
      process.env.TEMPORAL_ADDRESS ||
      'localhost:7233',
  });

  try {
    return await callback(connection);
  } finally {
    if (typeof connection.close === 'function') {
      await connection.close();
    }
  }
}

async function ensureTemporalSearchAttributes(args) {
  if (!shouldUseLocalTemporal(args)) return false;

  try {
    return await withTemporalConnection(args, async (connection) => {
      const namespace =
        args['temporal-namespace'] || process.env.TEMPORAL_NAMESPACE || 'default';
      const { customAttributes } =
        await connection.operatorService.listSearchAttributes({ namespace });
      const missingAttributes = ['organizationId', 'postId'].filter(
        (attribute) => !customAttributes[attribute]
      );

      if (missingAttributes.length) {
        await connection.operatorService.addSearchAttributes({
          namespace,
          searchAttributes: Object.fromEntries(
            missingAttributes.map((attribute) => [attribute, 1])
          ),
        });
      }

      return true;
    });
  } catch (error) {
    throw new Error(
      `Local Temporal preflight failed. Start Temporal first, then retry. Cause: ${error.message}`
    );
  }
}

async function postizFetch(pathname, options = {}) {
  const url = `${getPostizBaseUrl()}${pathname}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(
      `${options.method || 'GET'} ${url} failed: ${response.status} ${JSON.stringify(body)}`
    );
  }
  return body;
}

async function resolvePublishingConfig(args) {
  const platforms = getPlatforms(args);
  const skipMissingPlatforms =
    args['skip-missing-platforms'] ||
    process.env.AI_VIDEO_SKIP_MISSING_PLATFORMS === 'true';
  const localOrganization = await getLocalOrganization();
  const apiKey = process.env.POSTIZ_API_KEY || localOrganization?.apiKey;
  if (!apiKey) {
    throw new Error(
      'POSTIZ_API_KEY is missing and no local DATABASE_URL organization apiKey was found.'
    );
  }

  const integrations = await postizFetch('/public/v1/integrations', {
    headers: { Authorization: apiKey },
  });

  const youtubeId =
    args.youtubeIntegration ||
    process.env.POSTIZ_YOUTUBE_INTEGRATION_ID ||
    integrations.find(
      (integration) => integration.identifier === 'youtube' && !integration.disabled
    )?.id;

  const tiktokId =
    args.tiktokIntegration ||
    process.env.POSTIZ_TIKTOK_INTEGRATION_ID ||
    integrations.find(
      (integration) => integration.identifier === 'tiktok' && !integration.disabled
    )?.id;

  const facebookId =
    args.facebookIntegration ||
    process.env.POSTIZ_FACEBOOK_INTEGRATION_ID ||
    integrations.find(
      (integration) => integration.identifier === 'facebook' && !integration.disabled
    )?.id;

  if (platforms.includes('youtube') && !youtubeId && !skipMissingPlatforms) {
    throw new Error('An enabled YouTube integration is required.');
  }

  if (platforms.includes('tiktok') && !tiktokId && !skipMissingPlatforms) {
    throw new Error('An enabled TikTok integration is required.');
  }

  if (platforms.includes('facebook') && !facebookId && !skipMissingPlatforms) {
    throw new Error('An enabled Facebook integration is required.');
  }

  return {
    apiKey,
    youtubeId,
    tiktokId,
    facebookId,
    organizationId: process.env.POSTIZ_ORGANIZATION_ID || localOrganization?.id,
  };
}

function shouldRefreshToken(tokenExpiration) {
  if (!tokenExpiration) return true;
  return new Date(tokenExpiration).getTime() < Date.now() + 5 * 60 * 1000;
}

async function refreshYoutubeIntegration(prisma, integration) {
  if (!integration.refreshToken) {
    throw new Error('YouTube refresh token is missing; reconnect the channel.');
  }

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error('YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are required.');
  }

  const client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/integrations/social/youtube`
  );
  client.setCredentials({ refresh_token: integration.refreshToken });
  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error('YouTube refresh did not return a usable access token.');
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      token: credentials.access_token,
      refreshToken: credentials.refresh_token || integration.refreshToken,
      tokenExpiration: new Date(credentials.expiry_date),
      refreshNeeded: false,
      disabled: false,
    },
  });
}

async function refreshTiktokIntegration(prisma, integration) {
  if (!integration.refreshToken) {
    throw new Error('TikTok refresh token is missing; reconnect the channel.');
  }

  if (!process.env.TIKTOK_CLIENT_ID || !process.env.TIKTOK_CLIENT_SECRET) {
    throw new Error('TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET are required.');
  }

  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_ID,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
    }).toString(),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    const errorText = JSON.stringify(body?.error || body);
    if (errorText.includes('invalid_grant')) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { refreshNeeded: true },
      });
    }
    throw new Error(
      `TikTok refresh failed: ${errorText}. Reconnect the TikTok channel in Postiz.`
    );
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      token: body.access_token,
      refreshToken: body.refresh_token || integration.refreshToken,
      tokenExpiration: new Date(Date.now() + Number(body.expires_in || 82800) * 1000),
      refreshNeeded: false,
      disabled: false,
    },
  });
}

async function refreshLocalIntegrationTokens(publishing, args) {
  if (
    args['skip-token-refresh'] ||
    process.env.AI_VIDEO_SKIP_TOKEN_REFRESH === 'true' ||
    !process.env.DATABASE_URL
  ) {
    return;
  }

  const platforms = getPlatforms(args);
  const ids = [
    platforms.includes('youtube') ? publishing.youtubeId : undefined,
    platforms.includes('tiktok') ? publishing.tiktokId : undefined,
  ].filter(Boolean);

  if (!ids.length) return;

  const prisma = new PrismaClient();
  try {
    const integrations = await prisma.integration.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        providerIdentifier: true,
        tokenExpiration: true,
        refreshToken: true,
        refreshNeeded: true,
      },
    });

    for (const integration of integrations) {
      if (!shouldRefreshToken(integration.tokenExpiration)) continue;
      if (integration.refreshNeeded) {
        throw new Error(
          `${integration.providerIdentifier} channel is marked refreshNeeded; reconnect it in Postiz before retrying.`
        );
      }

      if (integration.providerIdentifier === 'youtube') {
        await refreshYoutubeIntegration(prisma, integration);
      }

      if (integration.providerIdentifier === 'tiktok') {
        await refreshTiktokIntegration(prisma, integration);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

function getPlatforms(args) {
  const raw = args.platform || args.platforms || process.env.AI_VIDEO_PLATFORM || 'both';
  if (raw === 'both') return ['youtube', 'tiktok'];
  if (raw === 'all') return ['youtube', 'tiktok', 'facebook'];
  return raw
    .split(',')
    .map((platform) => platform.trim().toLowerCase())
    .filter((platform) => ['youtube', 'tiktok', 'facebook'].includes(platform));
}

function startStaticServer(filePath, preferredPort) {
  const filename = path.basename(filePath);
  const mime = 'video/mp4';
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent(
      new URL(req.url || '/', 'http://127.0.0.1').pathname
    );
    if (reqPath !== `/${filename}`) {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    const stat = fssync.statSync(filePath);
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mime);

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', stat.size);
      res.writeHead(200);
      res.end();
      return;
    }

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      const start = match ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : stat.size - 1;
      res.writeHead(206, {
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      });
      fssync.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Content-Length', stat.size);
    res.writeHead(200);
    fssync.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(preferredPort || 0), '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}/${filename}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function uploadMedia(apiKey, videoPath) {
  const formData = new FormData();
  const buffer = await fs.readFile(videoPath);
  formData.append('file', new Blob([buffer], { type: 'video/mp4' }), path.basename(videoPath));

  return postizFetch('/public/v1/upload', {
    method: 'POST',
    headers: { Authorization: apiKey },
    body: formData,
  });
}

function makeCaption(content) {
  const tags = (content.hashtags || ['AI', 'AIAgents', 'TechExplained'])
    .map((tag) => `#${String(tag).replace(/^#/, '').replace(/[^a-zA-Z0-9_]/g, '')}`)
    .filter((tag) => tag.length > 1)
    .slice(0, 6)
    .join(' ');
  return cleanForCaption(`${content.description}\n\n${tags}`, 1200);
}

function normalizeVisibility(value, fallback = 'private') {
  return ['public', 'private', 'unlisted'].includes(value) ? value : fallback;
}

function getFacebookReelState(args, content = {}) {
  const visibility = normalizeVisibility(
    args.visibility || process.env.AI_VIDEO_VISIBILITY || 'private'
  );
  return (
    args['facebook-reel-state'] ||
    args.facebookState ||
    process.env.AI_VIDEO_FACEBOOK_REEL_STATE ||
    (content.seriesTitle === 'Tiny Agent' ? 'PUBLISHED' : undefined) ||
    (visibility === 'public' ? 'PUBLISHED' : 'DRAFT')
  );
}

async function createPost({ apiKey, youtubeId, tiktokId, facebookId, media, content, args }) {
  const platforms = getPlatforms(args);
  const visibility = normalizeVisibility(
    args.visibility || process.env.AI_VIDEO_VISIBILITY || 'private'
  );
  const youtubeVisibility = normalizeVisibility(
    args['youtube-visibility'] ||
      process.env.AI_VIDEO_YOUTUBE_VISIBILITY ||
      (content.seriesTitle === 'Tiny Agent' ? 'public' : visibility),
    visibility
  );
  const youtubePrivacy =
    youtubeVisibility === 'public'
      ? 'public'
      : youtubeVisibility === 'unlisted'
        ? 'unlisted'
        : 'private';
  const youtubePlaylistId =
    args['youtube-playlist-id'] || process.env.AI_VIDEO_YOUTUBE_PLAYLIST_ID;
  const youtubePlaylistTitle =
    args['youtube-playlist-title'] ||
    process.env.AI_VIDEO_YOUTUBE_PLAYLIST_TITLE ||
    (content.seriesTitle === 'Tiny Agent' ? 'Tiny Agent' : undefined);
  const youtubePlaylistPrivacyStatus =
    args['youtube-playlist-privacy'] ||
    process.env.AI_VIDEO_YOUTUBE_PLAYLIST_PRIVACY ||
    'public';
  const tiktokPrivacy =
    getTiktokPrivacy(args, content);
  const facebookReelState =
    getFacebookReelState(args, content);

  const caption = makeCaption(content);
  const nowIso = new Date(Date.now() + 15_000).toISOString();
  const mediaDto = { id: media.id || `generated-${makeId()}`, path: media.path };
  const postType = args['post-type'] || process.env.AI_VIDEO_POST_TYPE || 'now';
  const posts = [];

  if (platforms.includes('youtube') && youtubeId) {
    posts.push({
        integration: { id: youtubeId },
        settings: {
          title: content.title.slice(0, 100),
          type: youtubePrivacy,
          selfDeclaredMadeForKids: 'no',
          tags: (content.hashtags || []).slice(0, 10).map((tag) => ({
            value: tag,
            label: tag,
          })),
          ...(youtubePlaylistId ? { playlistId: youtubePlaylistId } : {}),
          ...(youtubePlaylistTitle ? { playlistTitle: youtubePlaylistTitle } : {}),
          ...(youtubePlaylistTitle || youtubePlaylistId
            ? { playlistPrivacyStatus: youtubePlaylistPrivacyStatus }
            : {}),
        },
        value: [
          {
            content: caption,
            image: [mediaDto],
          },
        ],
      });
  }

  if (platforms.includes('tiktok') && tiktokId) {
    posts.push({
        integration: { id: tiktokId },
        settings: {
          title: content.title.slice(0, 90),
          privacy_level: tiktokPrivacy,
          duet: false,
          stitch: false,
          comment: true,
          autoAddMusic: 'no',
          brand_content_toggle: false,
          video_made_with_ai: true,
          brand_organic_toggle: false,
          content_posting_method:
            args['tiktok-method'] ||
            process.env.AI_VIDEO_TIKTOK_METHOD ||
            'DIRECT_POST',
        },
        value: [
          {
            content: cleanForCaption(`${content.title}\n\n${caption}`, 600),
            image: [mediaDto],
          },
        ],
      });
  }

  if (platforms.includes('facebook') && facebookId) {
    posts.push({
        integration: { id: facebookId },
        settings: {
          post_type: 'reel',
          video_state: facebookReelState,
          title: content.title.slice(0, 100),
        },
        value: [
          {
            content: caption,
            image: [mediaDto],
          },
        ],
      });
  }

  if (!posts.length) {
    throw new Error('No enabled integrations found for the requested platforms.');
  }

  const body = {
    type: postType,
    date: nowIso,
    shortLink: false,
    tags: [],
    posts,
    creationMethod: 'API',
  };

  return postizFetch('/public/v1/posts', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function startLocalPostWorkflows(postResponse, publishing, args) {
  if (
    !shouldUseLocalTemporal(args) ||
    args['skip-workflow-kick'] ||
    process.env.AI_VIDEO_SKIP_WORKFLOW_KICK === 'true'
  ) {
    return;
  }

  if (!publishing.organizationId) {
    console.warn('Local organization id is missing; skipping workflow kick.');
    return;
  }

  const integrationTaskQueues = new Map(
    [
      [publishing.youtubeId, 'youtube'],
      [publishing.tiktokId, 'tiktok'],
      [publishing.facebookId, 'facebook'],
    ].filter(([id]) => Boolean(id))
  );

  await withTemporalConnection(args, async (connection) => {
    const namespace =
      args['temporal-namespace'] || process.env.TEMPORAL_NAMESPACE || 'default';
    const client = new WorkflowClient({ connection, namespace });
    const postIdKey = defineSearchAttributeKey('postId', SearchAttributeType.TEXT);
    const organizationIdKey = defineSearchAttributeKey(
      'organizationId',
      SearchAttributeType.TEXT
    );

    for (const post of postResponse || []) {
      const taskQueue = integrationTaskQueues.get(post.integration);
      if (!post.postId || !taskQueue) continue;

      await client.start('postWorkflowV105', {
        workflowId: `post_${post.postId}`,
        taskQueue: 'main',
        workflowIdConflictPolicy: WorkflowIdConflictPolicy.TERMINATE_EXISTING,
        args: [
          {
            taskQueue,
            postId: post.postId,
            organizationId: publishing.organizationId,
          },
        ],
        typedSearchAttributes: new TypedSearchAttributes([
          { key: postIdKey, value: post.postId },
          { key: organizationIdKey, value: publishing.organizationId },
        ]),
      });
    }
  });
}

async function waitForPosts(postIds, timeoutMs = 600_000) {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is missing; skipping local post state polling.');
    return [];
  }

  const prisma = new PrismaClient();
  const start = Date.now();
  try {
    while (Date.now() - start < timeoutMs) {
      const posts = await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: {
          id: true,
          state: true,
          error: true,
          releaseURL: true,
          integration: { select: { providerIdentifier: true, name: true } },
        },
      });

      const done = posts.every((post) => ['PUBLISHED', 'ERROR'].includes(post.state));
      const status = posts
        .map((post) => `${post.integration.providerIdentifier}:${post.state}`)
        .join(' ');
      process.stdout.write(`\r${status.padEnd(80)}`);

      if (done) {
        process.stdout.write('\n');
        return posts;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    process.stdout.write('\n');
    throw new Error('Timed out waiting for Postiz workflows to finish.');
  } finally {
    await prisma.$disconnect();
  }
}

function getPublishingIntegrationId(publishing, platform) {
  if (platform === 'youtube') return publishing.youtubeId;
  if (platform === 'tiktok') return publishing.tiktokId;
  if (platform === 'facebook') return publishing.facebookId;
  return undefined;
}

function getTiktokMethod(args) {
  return args['tiktok-method'] || process.env.AI_VIDEO_TIKTOK_METHOD || 'DIRECT_POST';
}

function getTiktokPrivacy(args, content = {}) {
  const visibility = normalizeVisibility(
    args.visibility || process.env.AI_VIDEO_VISIBILITY || 'private'
  );
  return (
    args['tiktok-privacy'] ||
    args.tiktokPrivacy ||
    process.env.AI_VIDEO_TIKTOK_PRIVACY ||
    (content.seriesTitle === 'Tiny Agent' ? 'PUBLIC_TO_EVERYONE' : undefined) ||
    (visibility === 'public' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY')
  );
}

function summarizePostResults(postResults, options = {}) {
  if (!postResults.length) return { status: 'CREATED', error: null };

  const failedPosts = postResults.filter((post) => post.state === 'ERROR');
  if (
    !failedPosts.length &&
    options.platform === 'tiktok' &&
    options.tiktokMethod === 'UPLOAD' &&
    postResults.some((post) => post.releaseURL?.includes('tiktok.com/messages'))
  ) {
    return {
      status: 'SENT_TO_INBOX',
      error: null,
      requiresManualPublish: true,
    };
  }
  if (
    !failedPosts.length &&
    options.platform === 'facebook' &&
    options.facebookReelState === 'DRAFT'
  ) {
    return {
      status: 'DRAFT_CREATED',
      error: null,
      requiresManualPublish: true,
    };
  }
  if (
    !failedPosts.length &&
    options.platform === 'facebook' &&
    options.facebookReelState === 'SCHEDULED'
  ) {
    return {
      status: 'SCHEDULED',
      error: null,
    };
  }
  if (!failedPosts.length) return { status: 'PUBLISHED', error: null };

  return {
    status: 'ERROR',
    error: failedPosts
      .map((post) => {
        const provider = post.integration?.providerIdentifier || 'unknown';
        return `${provider}: ${post.error || 'Postiz workflow failed'}`;
      })
      .join('; '),
  };
}

function normalizeErrorMessage(error) {
  return error?.message || String(error);
}

function shouldTryTiktokUploadFallback(platform, args, attempt, content = {}) {
  if (platform !== 'tiktok') return false;
  if (getTiktokMethod(args) !== 'DIRECT_POST') return false;
  if (attempt.status !== 'ERROR') return false;
  if (getTiktokPrivacy(args, content) === 'PUBLIC_TO_EVERYONE') return false;
  return !['config', 'token_refresh'].includes(attempt.stage);
}

async function publishPlatformOnce({ platform, publishing, media, content, args }) {
  const integrationId = getPublishingIntegrationId(publishing, platform);
  const tiktokMethod = platform === 'tiktok' ? getTiktokMethod(args) : undefined;
  const tiktokPrivacy =
    platform === 'tiktok' ? getTiktokPrivacy(args, content) : undefined;
  const facebookReelState =
    platform === 'facebook' ? getFacebookReelState(args, content) : undefined;
  if (!integrationId) {
    return {
      platform,
      status: 'SKIPPED',
      stage: 'config',
      error: `No enabled ${platform} integration found.`,
      ...(tiktokMethod ? { tiktokMethod } : {}),
      ...(tiktokPrivacy ? { tiktokPrivacy } : {}),
      ...(facebookReelState ? { facebookReelState } : {}),
      postResponse: null,
      postResults: [],
    };
  }

  const platformArgs = { ...args, platform };

  try {
    await refreshLocalIntegrationTokens(publishing, platformArgs);
  } catch (error) {
    return {
      platform,
      status: 'ERROR',
      stage: 'token_refresh',
      error: normalizeErrorMessage(error),
      ...(tiktokMethod ? { tiktokMethod } : {}),
      ...(tiktokPrivacy ? { tiktokPrivacy } : {}),
      ...(facebookReelState ? { facebookReelState } : {}),
      postResponse: null,
      postResults: [],
    };
  }

  try {
    const postResponse = await createPost({
      ...publishing,
      media,
      content,
      args: platformArgs,
    });
    const postIds = (postResponse || []).map((post) => post.postId).filter(Boolean);
    let postResults = [];

    if (args.wait && postIds.length) {
      await startLocalPostWorkflows(postResponse, publishing, platformArgs);
      postResults = await waitForPosts(
        postIds,
        Number(args.timeout || 600) * 1000
      );
    }

    const { status, error, requiresManualPublish } = summarizePostResults(
      postResults,
      {
        platform,
        tiktokMethod,
        tiktokPrivacy,
        facebookReelState,
      }
    );
    return {
      platform,
      status,
      stage: status === 'ERROR' ? 'workflow' : 'post',
      error,
      ...(requiresManualPublish ? { requiresManualPublish } : {}),
      ...(tiktokMethod ? { tiktokMethod } : {}),
      ...(tiktokPrivacy ? { tiktokPrivacy } : {}),
      ...(facebookReelState ? { facebookReelState } : {}),
      postResponse,
      postResults,
    };
  } catch (error) {
    return {
      platform,
      status: 'ERROR',
      stage: 'post',
      error: normalizeErrorMessage(error),
      ...(tiktokMethod ? { tiktokMethod } : {}),
      ...(tiktokPrivacy ? { tiktokPrivacy } : {}),
      ...(facebookReelState ? { facebookReelState } : {}),
      postResponse: null,
      postResults: [],
    };
  }
}

async function publishPlatformWithFallback({ platform, publishing, media, content, args }) {
  const primaryAttempt = await publishPlatformOnce({
    platform,
    publishing,
    media,
    content,
    args,
  });

  if (!shouldTryTiktokUploadFallback(platform, args, primaryAttempt, content)) {
    return {
      ...primaryAttempt,
      attempts: [primaryAttempt],
    };
  }

  const fallbackArgs = { ...args, 'tiktok-method': 'UPLOAD' };
  const fallbackAttempt = await publishPlatformOnce({
    platform,
    publishing,
    media,
    content,
    args: fallbackArgs,
  });

  return {
    ...fallbackAttempt,
    recoveredBy: fallbackAttempt.status === 'ERROR' ? null : 'tiktok-upload',
    attempts: [primaryAttempt, fallbackAttempt],
  };
}

async function main() {
  loadDotEnv(path.join(rootDir, '.env'));
  const args = parseArgs(process.argv.slice(2));
  const shouldUsePlan =
    args['plan-file'] ||
    args.date ||
    process.env.AI_VIDEO_PLAN_FILE ||
    process.env.AI_VIDEO_PLAN_DATE;
  const topic = args.topic || process.env.AI_VIDEO_TOPIC || 'What is MCP in AI agents?';
  const runName = shouldUsePlan
    ? `planned-${args.date || process.env.AI_VIDEO_PLAN_DATE || formatDateInShanghai()}`
    : topic;
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(runName)}`;
  const outputDir = path.resolve(args['output-dir'] || path.join(defaultOutputRoot, runId));
  await fs.mkdir(outputDir, { recursive: true });

  const content = shouldUsePlan
    ? await contentFromPlan(args)
    : await generateContent(topic, args);
  await fs.writeFile(path.join(outputDir, 'content.json'), JSON.stringify(content, null, 2));

  const reuseVideo = args['reuse-video'] || process.env.AI_VIDEO_REUSE_VIDEO;
  let frames = [];
  let videoPath;
  let verification;
  let reuseMetadata = null;

  if (reuseVideo) {
    videoPath = path.resolve(reuseVideo);
    reuseMetadata = await verifyReusableVideo(videoPath, args, content);
    verification = reuseMetadata.verification;
  } else {
    frames = await renderFrames(content, outputDir, args);
    const audioPath = await generateSpeech(content, outputDir, args);
    videoPath = await renderVideo(frames, audioPath, outputDir);
    verification = await verifyRenderedVideo(
      videoPath,
      audioPath,
      frames,
      outputDir
    );
  }

  const sourceSummary = reuseMetadata?.sourceSummary;

  const summary = {
    topic,
    title: content.title,
    layoutStandard: usesTinyAgentLayout(content) ? TINY_AGENT_LAYOUT_STANDARD : null,
    layoutSpec: usesTinyAgentLayout(content) ? tinyAgentLayoutSpec() : null,
    outputDir,
    videoPath,
    verification,
    reusedVideo: Boolean(reuseVideo),
    reuseSummaryPath: reuseMetadata?.summaryPath || null,
    keyframeSource: sourceSummary?.keyframeSource || frames[0]?.keyframeSource || null,
    keyframes: sourceSummary?.keyframes || frames.map((frame) => frame.keyframePath),
    motion: sourceSummary?.motion || {
      layering: 'main art layer zooms; title and subtitle overlay stay fixed',
      implementation: 'image keyframes plus PIL fixed-anchor affine per-frame zoom',
      zoomPerSegment: '1.000x to 1.040x',
      transition: `${MAIN_ART_TRANSITION_FRAMES}-frame main-art fade-through-white at scene boundaries; fixed overlays stay unblended`,
      fixedAnchorPerSegment: frames.map((frame, index) => ({
        segment: index + 1,
        bbox: frame.anchor.bbox,
        scale: frame.anchor.scale,
        anchor: frame.anchor.anchor,
      })),
    },
    posted: false,
    postSucceeded: false,
    hasFailures: false,
    postResponse: null,
    postResults: [],
    platformAttempts: [],
  };

  let server;
  try {
    if (args.post && !args['dry-run']) {
      const publishing = await resolvePublishingConfig(args);
      await ensureTemporalSearchAttributes(args);
      const mediaMode = args['media-mode'] || process.env.AI_VIDEO_MEDIA_MODE || 'serve';
      let media;

      if (mediaMode === 'upload') {
        media = await uploadMedia(publishing.apiKey, videoPath);
      } else {
        server = await startStaticServer(videoPath, args.port || process.env.AI_VIDEO_STATIC_PORT);
        media = { id: `generated-${makeId()}`, path: server.url };
      }

      const platformAttempts = [];
      for (const platform of getPlatforms(args)) {
        platformAttempts.push(
          await publishPlatformWithFallback({
            platform,
            publishing,
            media,
            content,
            args,
          })
        );
      }

      const createdAttempts = platformAttempts
        .flatMap((attempt) => attempt.attempts || [attempt])
        .filter((attempt) => attempt.postResponse);
      const hardFailures = platformAttempts.filter(
        (attempt) => attempt.status === 'ERROR'
      );

      summary.platformAttempts = platformAttempts;
      summary.posted = createdAttempts.length > 0;
      summary.postSucceeded = platformAttempts.some((attempt) =>
        ['CREATED', 'PUBLISHED', 'SENT_TO_INBOX', 'DRAFT_CREATED', 'SCHEDULED'].includes(attempt.status)
      );
      summary.hasFailures = hardFailures.length > 0;
      summary.postResponse = createdAttempts.flatMap(
        (attempt) => attempt.postResponse || []
      );
      summary.postResults = createdAttempts.flatMap(
        (attempt) => attempt.postResults || []
      );
    }
  } finally {
    if (server) await server.close();
  }

  await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.hasFailures || (args.post && !args['dry-run'] && !summary.postSucceeded)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
