import { execFileSync, spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertTinyAgentScenePlanAssets,
  loadTinyAgentAssetPack,
  tinyAgentAssetSrc,
} from '../../../scripts/ai-video-pipeline/hyperframes/tiny-agent-assets.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(projectRoot, '../../..');
const sourcePath = path.join(projectRoot, 'SCRIPT.zh-CN.md');
const audioDir = path.join(projectRoot, 'assets/audio');
const planPath = path.join(projectRoot, 'scene-plan.json');
const animationPlanPath = path.join(projectRoot, 'animation-plan.json');
const voice = 'zh-CN-YunxiaNeural';
const rate = '+50%';
const projectAssetPack = loadTinyAgentAssetPack({ packRoot: path.join(projectRoot, 'assets/pack') });

const layoutTypes = new Set(['hero', 'stage', 'process', 'comparison', 'grid', 'focus']);
let propBoundsById = new Map();
let humanBoundsById = new Map();
let agentBoundsById = new Map();

const bodySafeArea = { left: 56, top: 120, right: 1864, bottom: 820 };
const visualBalanceTarget = { x: 960, y: 470 };
const titleContentGap = 24;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const assetSrc = (kind, id) => escapeHtml(tinyAgentAssetSrc(projectAssetPack, kind, id));

const safeId = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseSource(markdown) {
  const body = markdown.split('## 完整旁白脚本')[1];
  if (!body) throw new Error('Missing 完整旁白脚本 section');

  return body.split(/^###\s+/m).slice(1).map((part, index) => {
    const [heading, ...rest] = part.split('\n');
    const label = heading.split('｜')[1]?.trim();
    if (!label) throw new Error(`Invalid chapter heading: ${heading}`);
    const paragraphs = rest.join('\n').trim().split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return { index, heading: heading.trim(), label, paragraphs };
  });
}

function probeDuration(file) {
  return Number(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ], { encoding: 'utf8' }).trim());
}

function detectTrailingSpeechEnd(file, duration) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-loglevel', 'info', '-vn', '-i', file,
    '-af', 'silencedetect=noise=-45dB:d=0.05', '-f', 'null', '-',
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Trailing-silence detection failed: ${result.stderr}`);
  const starts = [...result.stderr.matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  const trailingStart = starts.at(-1);
  return Number.isFinite(trailingStart) && duration - trailingStart <= 2 ? trailingStart : duration;
}

function timestampToSeconds(value) {
  const [hours, minutes, seconds] = value.replace(',', '.').split(':');
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function secondsToTimestamp(value) {
  const milliseconds = Math.max(0, Math.round(value * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  const ms = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function parseVtt(value) {
  return value.replaceAll('\r', '').split(/\n\n+/).flatMap((block) => {
    const lines = block.trim().split('\n');
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) return [];
    const [start, end] = lines[timingIndex].split('-->').map((item) => item.trim());
    const text = lines.slice(timingIndex + 1).join(' ').trim();
    if (!text) return [];
    return [{ start: timestampToSeconds(start), end: timestampToSeconds(end), text }];
  });
}

const normalizeAlignmentText = (value) => String(value)
  .replace(/\s+/g, '')
  .replace(/[“”‘’]/g, '');

function alignParagraphsToVtt(chapter, cues, timing) {
  if (cues.length === 0) throw new Error(`No VTT cues found for ${chapter.label}`);

  const sourceText = normalizeAlignmentText(chapter.paragraphs.join(''));
  const cueText = normalizeAlignmentText(cues.map((cue) => cue.text).join(''));
  if (sourceText !== cueText) {
    throw new Error(`VTT text does not exactly match the final script in ${chapter.label}`);
  }

  const paragraphLengths = chapter.paragraphs.map((paragraph) => normalizeAlignmentText(paragraph).length);
  const cueLengths = cues.map((cue) => normalizeAlignmentText(cue.text).length);
  const cueEnds = [];
  let cueCharacters = 0;
  cueLengths.forEach((length) => {
    cueCharacters += length;
    cueEnds.push(cueCharacters);
  });

  const boundaries = [timing.start];
  let paragraphCharacters = 0;
  for (let index = 0; index < paragraphLengths.length - 1; index += 1) {
    paragraphCharacters += paragraphLengths[index];
    const targetCueCharacters = paragraphCharacters;
    const cueIndex = cueEnds.findIndex((end) => end >= targetCueCharacters);
    const boundaryCue = cues[Math.max(0, cueIndex)];
    const nextCue = cues[Math.max(0, cueIndex) + 1];
    const localBoundary = nextCue?.start ?? boundaryCue.end;
    boundaries.push(Math.max(boundaries.at(-1), Math.min(timing.end, timing.start + localBoundary)));
  }
  boundaries.push(timing.end);

  const globalCues = cues.map((cue) => ({
    start: timing.start + cue.start,
    end: timing.start + cue.end,
    text: cue.text,
  }));
  const paragraphs = chapter.paragraphs.map((text, index) => ({
    number: index + 1,
    text,
    start: boundaries[index],
    end: boundaries[index + 1],
    cues: globalCues.filter((cue) => cue.start < boundaries[index + 1] && cue.end > boundaries[index]),
  }));

  return { label: chapter.label, paragraphs, cues: globalCues };
}

function validateTimedScenes(chapters, plan, chapterTimings, scenes) {
  plan.chapters.forEach((plannedChapter, chapterIndex) => {
    const chapter = chapters[chapterIndex];
    const timing = chapterTimings[chapterIndex];
    const chapterScenes = scenes.filter((scene) => scene.chapterIndex === chapterIndex);
    if (Math.abs(chapterScenes[0].start - timing.start) > 0.001) {
      throw new Error(`First scene does not start with ${chapter.label}`);
    }
    if (Math.abs(chapterScenes.at(-1).end - timing.end) > 0.001) {
      throw new Error(`Last scene does not end with ${chapter.label}`);
    }
    chapterScenes.forEach((scene, sceneIndex) => {
      if (sceneIndex > 0 && Math.abs(scene.start - chapterScenes[sceneIndex - 1].end) > 0.001) {
        throw new Error(`Scene boundary gap in ${chapter.label}`);
      }
      if (scene.propBeatTimes.some((beat) => beat < scene.start || beat >= scene.end)) {
        throw new Error(`Prop beat outside scene range in ${scene.id}`);
      }
      if (scene.recap) {
        scene.summaryPointParagraphs.forEach((paragraphNumber, pointIndex) => {
          const spokenPoint = chapter.paragraphs[paragraphNumber - 1]
            .replace(/^(?:小结[。.]\s*)?(第一|第二|第三)[，,]/, '')
            .replace(/[。.]$/, '');
          if (normalizeAlignmentText(spokenPoint) !== normalizeAlignmentText(plannedChapter.summary[pointIndex])) {
            throw new Error(`Spoken recap does not match visual point ${pointIndex + 1} in ${chapter.label}`);
          }
        });
      }
      if (!scene.recap) {
        validatePropGroupGeometry(scene);
        validateTitleContentSeparation(scene);
        validateSceneVisualBalance(scene);
      }
    });
  });
}

function semanticTriggerTime(scene, cues, trigger) {
  const normalizedTrigger = normalizeAlignmentText(trigger).toLowerCase();
  if (!normalizedTrigger) throw new Error(`Empty semantic trigger in ${scene.id}`);
  const segments = cues
    .filter((cue) => cue.start >= scene.start - 0.001 && cue.start < scene.end)
    .map((cue) => ({ ...cue, normalizedText: normalizeAlignmentText(cue.text).toLowerCase() }));
  const combinedText = segments.map((segment) => segment.normalizedText).join('');
  const triggerIndex = combinedText.indexOf(normalizedTrigger);
  if (triggerIndex < 0) {
    throw new Error(`Semantic trigger "${trigger}" is not present in the final narration for ${scene.id}`);
  }

  let cursor = 0;
  for (const segment of segments) {
    const segmentEnd = cursor + segment.normalizedText.length;
    if (triggerIndex < segmentEnd) {
      const localIndex = Math.max(0, triggerIndex - cursor);
      const progress = localIndex / Math.max(1, segment.normalizedText.length);
      return segment.start + (segment.end - segment.start) * progress;
    }
    cursor = segmentEnd;
  }
  throw new Error(`Unable to resolve semantic trigger "${trigger}" in ${scene.id}`);
}

function buildPropBeatTimes(scene, cues, contentStart, animationScene) {
  if (scene.props.length === 0) return { times: [], beats: [] };
  if (!animationScene || !Array.isArray(animationScene.beats) || animationScene.beats.length === 0) {
    throw new Error(`Missing semantic animation beats for ${scene.id}`);
  }

  const times = Array(scene.props.length).fill(null);
  const beats = [];
  let previousRawTime = -Infinity;
  const latest = Math.max(contentStart, scene.end - 0.72);

  animationScene.beats.forEach((beat, beatIndex) => {
    if (!Array.isArray(beat.props) || beat.props.length === 0) {
      throw new Error(`Semantic beat ${beatIndex + 1} has no props in ${scene.id}`);
    }
    const rawTime = semanticTriggerTime(scene, cues, beat.trigger);
    if (rawTime + 0.001 < previousRawTime) {
      throw new Error(`Semantic beats are not in narration order in ${scene.id}`);
    }
    previousRawTime = rawTime;
    const time = Math.min(latest, Math.max(contentStart, rawTime - 0.08));
    if (scene.end - time < 1) {
      throw new Error(`Semantic beat "${beat.trigger}" has less than one second of readable hold time in ${scene.id}`);
    }
    beat.props.forEach((propIndex) => {
      if (!Number.isInteger(propIndex) || propIndex < 0 || propIndex >= scene.props.length) {
        throw new Error(`Invalid prop index ${propIndex} in semantic beats for ${scene.id}`);
      }
      if (times[propIndex] !== null) {
        throw new Error(`Prop ${propIndex} is assigned to multiple semantic beats in ${scene.id}`);
      }
      times[propIndex] = time;
    });
    beats.push({
      trigger: beat.trigger,
      props: beat.props,
      rawTime,
      time,
      clampedToContentStart: rawTime - 0.08 < contentStart,
    });
  });

  const missingProp = times.findIndex((time) => time === null);
  if (missingProp >= 0) throw new Error(`Prop ${missingProp} has no semantic beat in ${scene.id}`);
  return { times, beats };
}

function splitLongToken(token, limit) {
  const characters = [...token];
  const output = [];
  for (let index = 0; index < characters.length; index += limit) {
    output.push(characters.slice(index, index + limit).join(''));
  }
  return output;
}

function splitCaptionText(text, limit = 34) {
  if ([...text].length <= limit) return [text];
  const clauses = text.match(/[^，。！？；：]+[，。！？；：]?/g) || [text];
  const output = [];
  let current = '';

  for (const clause of clauses) {
    const pieces = [...clause].length > limit ? splitLongToken(clause, limit) : [clause];
    for (const piece of pieces) {
      if (current && [...current, ...piece].length > limit) {
        output.push(current);
        current = piece;
      } else {
        current += piece;
      }
    }
  }
  if (current) output.push(current);
  return output;
}

function splitCue(cue) {
  const pieces = splitCaptionText(cue.text);
  if (pieces.length === 1) return [cue];
  const totalCharacters = pieces.reduce((sum, piece) => sum + [...piece].length, 0);
  let consumed = 0;
  return pieces.map((piece, index) => {
    const start = cue.start + (cue.end - cue.start) * (consumed / totalCharacters);
    consumed += [...piece].length;
    const end = index === pieces.length - 1
      ? cue.end
      : cue.start + (cue.end - cue.start) * (consumed / totalCharacters);
    return { start, end, text: piece };
  });
}

function validatePlan(chapters, plan) {
  assertTinyAgentScenePlanAssets(plan, projectAssetPack, { requireDirectionMetadata: true });
  if (plan.chapters.length !== chapters.length) throw new Error('Scene plan chapter count mismatch');
  plan.chapters.forEach((plannedChapter, chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (plannedChapter.label !== chapter.label) throw new Error(`Chapter label mismatch at ${chapterIndex}`);
    if (!plannedChapter.intro || !Array.isArray(plannedChapter.summary) || plannedChapter.summary.length !== 3) {
      throw new Error(`Missing chapter intro or three-point summary in ${chapter.label}`);
    }
    let expectedParagraph = 1;
    plannedChapter.scenes.forEach((scene, sceneIndex) => {
      const [start, end] = scene.paragraphs;
      if (start !== expectedParagraph || end < start || end > chapter.paragraphs.length) {
        throw new Error(`Invalid paragraph coverage in ${chapter.label} scene ${sceneIndex + 1}`);
      }
      expectedParagraph = end + 1;
      if (!layoutTypes.has(scene.layout)) throw new Error(`Unknown layout ${scene.layout}`);
      if (scene.layout === 'comparison' && (!Array.isArray(scene.labels) || scene.labels.length !== 2)) {
        throw new Error(`Comparison layout requires two labels in ${chapter.label} scene ${sceneIndex + 1}`);
      }
      if (scene.layout === 'comparison' && (scene.props.length < 2 || scene.props.length > 5)) {
        throw new Error(`Comparison layout requires 2-5 props in ${chapter.label} scene ${sceneIndex + 1}`);
      }
      if (!Array.isArray(scene.props)) throw new Error(`Missing props in ${chapter.label} scene ${sceneIndex + 1}`);
      if (scene.recap) {
        if (!Array.isArray(scene.summaryPointParagraphs) || scene.summaryPointParagraphs.length !== 3) {
          throw new Error(`Recap scene requires three summary paragraph anchors in ${chapter.label}`);
        }
        for (const paragraphNumber of scene.summaryPointParagraphs) {
          if (paragraphNumber < start || paragraphNumber > end) {
            throw new Error(`Recap anchor outside scene range in ${chapter.label}`);
          }
        }
      }
    });
    if (expectedParagraph !== chapter.paragraphs.length + 1) {
      throw new Error(`Incomplete paragraph coverage in ${chapter.label}`);
    }
  });
}

async function prepare() {
  const chapters = parseSource(await readFile(sourcePath, 'utf8'));
  await mkdir(audioDir, { recursive: true });
  for (const chapter of chapters) {
    const chapterNumber = String(chapter.index + 1).padStart(2, '0');
    await writeFile(path.join(audioDir, `chapter-${chapterNumber}.txt`), `${chapter.paragraphs.join('\n\n')}\n`);
  }
  await writeFile(path.join(projectRoot, 'content.json'), `${JSON.stringify({ source: sourcePath, chapters }, null, 2)}\n`);
  process.stdout.write(`prepared ${chapters.length} chapters\n`);
}

async function generateTts() {
  await prepare();
  const chapters = parseSource(await readFile(sourcePath, 'utf8'));
  for (const chapter of chapters) {
    const chapterNumber = String(chapter.index + 1).padStart(2, '0');
    execFileSync('uvx', [
      'edge-tts',
      '--voice', voice,
      '--rate', rate,
      '--file', path.join(audioDir, `chapter-${chapterNumber}.txt`),
      '--write-media', path.join(audioDir, `chapter-${chapterNumber}.mp3`),
      '--write-subtitles', path.join(audioDir, `chapter-${chapterNumber}.vtt`),
    ], { stdio: 'inherit' });
  }
  process.stdout.write(`generated TTS and VTT for ${chapters.length} chapters at ${rate}\n`);
}

async function mergeAudio(chapters) {
  const inputs = [];
  const filterInputs = [];
  chapters.forEach((chapter, index) => {
    inputs.push('-i', path.join(audioDir, `chapter-${String(index + 1).padStart(2, '0')}.mp3`));
    filterInputs.push(`[${index}:a]`);
  });
  const output = path.join(audioDir, 'narration.zh.normalized.mp3');
  execFileSync('ffmpeg', [
    '-y', ...inputs,
    '-filter_complex', `${filterInputs.join('')}concat=n=${chapters.length}:v=0:a=1,loudnorm=I=-20:LRA=7:TP=-1.5[a]`,
    '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '192k', output,
  ], { stdio: 'inherit' });
  return output;
}

function buildTimedScenes(chapters, plan, chapterTimings, chapterAlignments, semanticCues, animationPlan) {
  const scenes = [];
  chapters.forEach((chapter, chapterIndex) => {
    const timing = chapterTimings[chapterIndex];
    const alignment = chapterAlignments[chapterIndex];
    const plannedChapter = plan.chapters[chapterIndex];
    const plannedScenes = plan.chapters[chapterIndex].scenes;
    plannedScenes.forEach((scene, sceneIndex) => {
      const [startParagraph, endParagraph] = scene.paragraphs;
      const start = sceneIndex === 0 ? timing.start : alignment.paragraphs[startParagraph - 1].start;
      const end = sceneIndex === plannedScenes.length - 1
        ? timing.end
        : alignment.paragraphs[endParagraph - 1].end;
      const sceneCues = alignment.cues.filter((cue) => cue.start < end && cue.end > start);
      const showIntro = sceneIndex === 0 && plannedChapter.showIntro !== false && !scene.recap;
      const timedScene = {
        ...scene,
        id: `c${String(chapterIndex + 1).padStart(2, '0')}-s${String(sceneIndex + 1).padStart(2, '0')}`,
        chapter: chapter.label,
        chapterIndex,
        chapterNumber: chapterIndex + 1,
        chapterStart: sceneIndex === 0,
        chapterEnd: sceneIndex === plannedScenes.length - 1,
        showIntro,
        chapterIntro: plan.chapters[chapterIndex].intro,
        chapterSummary: plan.chapters[chapterIndex].summary,
        start,
        end,
        narration: chapter.paragraphs.slice(scene.paragraphs[0] - 1, scene.paragraphs[1]).join(' '),
        cueStarts: sceneCues.map((cue) => cue.start),
        summaryPointTimes: (scene.summaryPointParagraphs || []).map((paragraphNumber) => (
          alignment.paragraphs[paragraphNumber - 1].start
        )),
        ctaAt: scene.ctaParagraph ? alignment.paragraphs[scene.ctaParagraph - 1].start : null,
      };
      const contentStart = start + (showIntro ? 2.86 : 0.22);
      const semanticTiming = buildPropBeatTimes(
        timedScene,
        semanticCues,
        contentStart,
        animationPlan.scenes[timedScene.id],
      );
      timedScene.propBeatTimes = semanticTiming.times;
      timedScene.semanticBeats = semanticTiming.beats;
      scenes.push(timedScene);
    });
  });
  return scenes;
}

function assignVisualVariants(scenes) {
  const layoutCounts = new Map();
  const mirrorableLayouts = new Set(['hero', 'focus', 'grid', 'stage']);
  return scenes.map((scene) => {
    const layoutCount = layoutCounts.get(scene.layout) || 0;
    layoutCounts.set(scene.layout, layoutCount + 1);
    return {
      ...scene,
      visualVariant: scene.visualVariant || (
        mirrorableLayouts.has(scene.layout) && layoutCount % 2 === 1
          ? 'mirror'
          : 'standard'
      ),
    };
  });
}

const propLayouts = {
  2: [{ x: 1090, y: 250 }, { x: 1450, y: 430 }],
  3: [{ x: 1040, y: 210 }, { x: 1390, y: 210 }, { x: 1215, y: 500 }],
  4: [{ x: 1030, y: 190 }, { x: 1375, y: 190 }, { x: 1030, y: 500 }, { x: 1375, y: 500 }],
  5: [{ x: 1000, y: 175 }, { x: 1300, y: 175 }, { x: 1590, y: 320 }, { x: 1000, y: 505 }, { x: 1300, y: 505 }],
};

function normalizeProp(prop) {
  return typeof prop === 'string' ? { id: prop, label: '' } : prop;
}

function lineGeometry(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return { length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * 180 / Math.PI };
}

function propVisualBox(position, prop, imageSize, imageOffsetX) {
  const sourceBounds = propBoundsById.get(prop.id) || { x: 0, y: 0, width: 320, height: 320 };
  const scale = imageSize / 320;
  const left = position.x + imageOffsetX + sourceBounds.x * scale;
  const top = position.y + sourceBounds.y * scale;
  return {
    left,
    top,
    right: left + sourceBounds.width * scale,
    bottom: top + sourceBounds.height * scale,
    center: {
      x: position.x + imageOffsetX + imageSize / 2,
      y: position.y + imageSize / 2,
    },
  };
}

function boxConnectionPoint(box, target) {
  const dx = target.x - box.center.x;
  const dy = target.y - box.center.y;
  const xDistance = dx > 0 ? box.right - box.center.x : box.center.x - box.left;
  const yDistance = dy > 0 ? box.bottom - box.center.y : box.center.y - box.top;
  const xScale = Math.abs(dx) < 0.001 ? Number.POSITIVE_INFINITY : xDistance / Math.abs(dx);
  const yScale = Math.abs(dy) < 0.001 ? Number.POSITIVE_INFINITY : yDistance / Math.abs(dy);
  const scale = Math.min(xScale, yScale);
  return {
    x: box.center.x + dx * scale,
    y: box.center.y + dy * scale,
  };
}

function connectorEndpoints(fromPosition, fromProp, toPosition, toProp, imageOffsetX = 24) {
  const fromSize = fromPosition.size || 210;
  const toSize = toPosition.size || 210;
  const fromBox = propVisualBox(fromPosition, fromProp, fromSize, imageOffsetX);
  const toBox = propVisualBox(toPosition, toProp, toSize, imageOffsetX);
  return {
    from: boxConnectionPoint(fromBox, toBox.center),
    to: boxConnectionPoint(toBox, fromBox.center),
  };
}

function connectionPairs(flow, count) {
  if (count < 2 || flow === 'cluster') return [];
  if (flow === 'branch') return Array.from({ length: count - 1 }, (_, index) => [0, index + 1]);
  if (flow === 'loop' && count > 2) {
    const order = count === 4
      ? [0, 1, 3, 2]
      : count === 5
        ? [0, 1, 2, 4, 3]
        : Array.from({ length: count }, (_, index) => index);
    return order.map((fromIndex, index) => [fromIndex, order[(index + 1) % order.length]]);
  }
  const pairs = Array.from({ length: count - 1 }, (_, index) => [index, index + 1]);
  return pairs;
}

function renderPhaseLegacy(scene, index) {
  const props = scene.props.map(normalizeProp);
  const layout = propLayouts[props.length] || propLayouts[5];
  const items = props.map((prop, propIndex) => {
    const position = layout[propIndex];
    return `
        <div data-hf-id="hf-${scene.id}-prop-${propIndex + 1}" class="prop-item${propIndex === 0 ? ' focus-prop' : ''}" style="left:${position.x}px;top:${position.y}px">
          <img src="${assetSrc('props', prop.id)}" alt="${escapeHtml(prop.label || prop.id)}">
          ${prop.label ? `<span>${escapeHtml(prop.label)}</span>` : ''}
        </div>`;
  }).join('');
  const lines = connectionPairs(scene.flow, props.length).map(([fromIndex, toIndex], lineIndex) => {
    const { from, to } = connectorEndpoints(
      { ...layout[fromIndex], size: 210 }, props[fromIndex],
      { ...layout[toIndex], size: 210 }, props[toIndex],
      10,
    );
    const geometry = lineGeometry(from, to);
    return `<div data-hf-id="hf-${scene.id}-line-${lineIndex + 1}" class="connector" style="left:${from.x}px;top:${from.y}px;width:${geometry.length.toFixed(2)}px;clip-path:inset(0 100% 0 0);transform:rotate(${geometry.angle.toFixed(3)}deg)"></div>`;
  }).join('');

  return `
      <section data-hf-id="hf-phase-${scene.id}" id="phase-${scene.id}" class="phase${index === 0 ? ' is-first' : ''}" data-chapter="${escapeHtml(scene.chapter)}">
        <div class="ground-line"></div>
        <img data-hf-id="hf-${scene.id}-human" class="actor human-actor" src="${assetSrc('human', scene.human)}" alt="工程师 ${escapeHtml(scene.human)}">
        <img data-hf-id="hf-${scene.id}-agent" class="actor agent-actor" src="${assetSrc('agent', scene.agent)}" alt="Tiny Agent ${escapeHtml(scene.agent)}">
        <div data-hf-id="hf-${scene.id}-callout" class="callout accent-${escapeHtml(scene.accent || 'blue')}">${escapeHtml(scene.callout)}</div>
        <div class="prop-zone">${lines}${items}</div>
      </section>`;
}

function renderStoryLegacy(scenes, duration) {
  const phases = scenes.map(renderPhaseLegacy).join('\n');
  const timeline = [];
  timeline.push(`      tl.fromTo("#phase-${scenes[0].id} .human-actor", { x: -26, opacity: 0 }, { x: 0, opacity: 1, duration: 0.58, ease: "power3.out" }, 0.16);`);
  timeline.push(`      tl.fromTo("#phase-${scenes[0].id} .agent-actor", { x: 28, opacity: 0 }, { x: 0, opacity: 1, duration: 0.48, ease: "power2.out" }, 0.24);`);
  timeline.push(`      tl.fromTo("#phase-${scenes[0].id} .prop-item", { y: 20, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.52, stagger: 0.07, ease: "back.out(1.25)" }, 0.28);`);
  timeline.push(`      tl.fromTo("#phase-${scenes[0].id} .callout", { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, ease: "sine.out" }, 0.34);`);
  if (connectionPairs(scenes[0].flow, scenes[0].props.length).length > 0) {
    timeline.push(`      tl.fromTo("#phase-${scenes[0].id} .connector", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.48, stagger: 0.05, ease: "power2.out" }, 0.54);`);
  }

  scenes.forEach((scene, index) => {
    const selector = `#phase-${scene.id}`;
    const sceneDuration = scene.end - scene.start;
    const ambientAt = Math.min(scene.end - 1.6, scene.start + Math.max(2.2, sceneDuration * 0.42));
    if (ambientAt > scene.start + 0.8) {
      timeline.push(`      tl.to("${selector} .focus-prop img", { scale: 1.045, duration: 0.8, repeat: 1, yoyo: true, ease: "sine.inOut" }, ${ambientAt.toFixed(3)});`);
    }

    if (index === 0) return;
    const previous = scenes[index - 1];
    const transitionDuration = scene.chapterStart ? 0.5 : 0.38;
    const transitionAt = Math.max(previous.start + 0.4, scene.start - transitionDuration * 0.52);
    const outgoingMotion = scene.chapterStart ? '{ y: -54, opacity: 0 }' : '{ x: -38, opacity: 0 }';
    const incomingFrom = scene.chapterStart ? '{ y: 62, opacity: 0 }' : '{ x: 44, opacity: 0 }';
    timeline.push(`      tl.to("#phase-${previous.id}", { ...${outgoingMotion}, duration: ${transitionDuration.toFixed(2)}, ease: "power2.in" }, ${transitionAt.toFixed(3)});`);
    timeline.push(`      tl.fromTo("${selector}", ${incomingFrom}, { x: 0, y: 0, opacity: 1, duration: ${transitionDuration.toFixed(2)}, ease: "power3.out", immediateRender: false }, ${transitionAt.toFixed(3)});`);
    timeline.push(`      tl.fromTo("${selector} .human-actor", { x: -22, opacity: 0.45 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out", immediateRender: false }, ${(scene.start + 0.05).toFixed(3)});`);
    timeline.push(`      tl.fromTo("${selector} .agent-actor", { x: 24, opacity: 0.45 }, { x: 0, opacity: 1, duration: 0.42, ease: "power2.out", immediateRender: false }, ${(scene.start + 0.11).toFixed(3)});`);
    timeline.push(`      tl.fromTo("${selector} .prop-item", { y: 18, scale: 0.92, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.48, stagger: 0.055, ease: "back.out(1.2)", immediateRender: false }, ${(scene.start + 0.13).toFixed(3)});`);
    timeline.push(`      tl.fromTo("${selector} .callout", { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "sine.out", immediateRender: false }, ${(scene.start + 0.2).toFixed(3)});`);
    if (connectionPairs(scene.flow, scene.props.length).length > 0) {
      timeline.push(`      tl.fromTo("${selector} .connector", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.44, stagger: 0.045, ease: "power2.out", immediateRender: false }, ${(scene.start + 0.35).toFixed(3)});`);
    }
  });

  return `<!doctype html>
<html lang="zh-CN">
  <body>
    <template id="story-template">
      <div data-hf-id="hf-story-root" id="story-root" data-composition-id="story" data-width="1920" data-height="1080" data-start="0" data-duration="${duration.toFixed(3)}">
        <style>
          @font-face { font-family:"Tiny Agent CJK"; src:url("assets/fonts/HiraginoSansGB.ttc"); font-style:normal; font-weight:100 900; }
          #story-root { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; color:#111413; font-family:"Tiny Agent CJK",sans-serif; }
          #story-root .phase { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; opacity:0; }
          #story-root .phase.is-first { opacity:1; }
          #story-root .ground-line { position:absolute; right:84px; bottom:244px; left:84px; height:3px; background:rgba(17,20,19,.12); }
          #story-root .actor { position:absolute; z-index:20; object-fit:contain; }
          #story-root .human-actor { top:210px; left:68px; width:500px; height:590px; }
          #story-root .agent-actor { top:205px; left:500px; width:450px; height:600px; }
          #story-root .callout { position:absolute; top:142px; left:1008px; z-index:28; width:700px; min-height:68px; color:#111413; font-size:38px; font-weight:900; line-height:1.45; text-align:center; letter-spacing:0; }
          #story-root .prop-zone { position:absolute; inset:0; z-index:16; }
          #story-root .prop-item { position:absolute; z-index:18; width:230px; height:250px; text-align:center; transform-origin:center; }
          #story-root .prop-item img { display:block; width:210px; height:210px; margin:0 auto; object-fit:contain; transform-origin:center; }
          #story-root .prop-item span { display:block; margin-top:-6px; color:#47514e; font-size:23px; font-weight:800; line-height:1.25; letter-spacing:0; white-space:nowrap; }
          #story-root .connector { position:absolute; z-index:12; height:5px; border-radius:3px; background:#1597ea; opacity:.62; transform-origin:left center; }
        </style>
${phases}
        <script>
          window.__timelines = window.__timelines || {};
          const tl = gsap.timeline({ paused: true });
${timeline.join('\n')}
          window.__timelines.story = tl;
        </script>
      </div>
    </template>
  </body>
</html>
`;
}

function makePropPosition(x, y, size) {
  return { x, y, size };
}

function propPositionFromCenter(centerX, centerY, size) {
  return makePropPosition(centerX - size / 2 - 24, centerY - size / 2, size);
}

function balancedClusterPropPositions(count, region) {
  if (count === 0) return [];
  if (count === 1) return [propPositionFromCenter(region.centerX, region.centerY, 245)];
  if (count === 2) {
    const size = 195;
    const separation = Math.min(330, region.width * 0.44);
    return [
      propPositionFromCenter(region.centerX - separation / 2, region.centerY, size),
      propPositionFromCenter(region.centerX + separation / 2, region.centerY, size),
    ];
  }
  if (count === 3) {
    const size = 185;
    const side = Math.min(region.width * 0.5, region.height * 0.82);
    const height = side * Math.sqrt(3) / 2;
    return [
      propPositionFromCenter(region.centerX, region.centerY - height * 2 / 3, size),
      propPositionFromCenter(region.centerX - side / 2, region.centerY + height / 3, size),
      propPositionFromCenter(region.centerX + side / 2, region.centerY + height / 3, size),
    ];
  }
  if (count === 4) {
    const size = 170;
    const horizontal = Math.min(330, region.width * 0.46);
    const vertical = Math.min(280, region.height * 0.56);
    return [
      propPositionFromCenter(region.centerX - horizontal / 2, region.centerY - vertical / 2, size),
      propPositionFromCenter(region.centerX + horizontal / 2, region.centerY - vertical / 2, size),
      propPositionFromCenter(region.centerX - horizontal / 2, region.centerY + vertical / 2, size),
      propPositionFromCenter(region.centerX + horizontal / 2, region.centerY + vertical / 2, size),
    ];
  }
  if (count === 5) {
    const size = 145;
    const horizontal = Math.min(260, region.width * 0.31);
    const vertical = Math.min(240, region.height * 0.5);
    return [
      propPositionFromCenter(region.centerX - horizontal, region.centerY - vertical * 0.4, size),
      propPositionFromCenter(region.centerX, region.centerY - vertical * 0.4, size),
      propPositionFromCenter(region.centerX + horizontal, region.centerY - vertical * 0.4, size),
      propPositionFromCenter(region.centerX - horizontal / 2, region.centerY + vertical * 0.6, size),
      propPositionFromCenter(region.centerX + horizontal / 2, region.centerY + vertical * 0.6, size),
    ];
  }
  throw new Error(`Balanced prop group cannot contain ${count} props`);
}

function chainPropPositions(count, region) {
  const gap = count > 4 ? 28 : 42;
  const size = Math.max(130, Math.min(205, (region.width - (count - 1) * gap) / count - 48));
  const itemWidth = size + 48;
  const rowWidth = count * itemWidth + (count - 1) * gap;
  const firstCenter = region.centerX - rowWidth / 2 + itemWidth / 2;
  return Array.from({ length: count }, (_, index) => propPositionFromCenter(
    firstCenter + index * (itemWidth + gap),
    region.centerY,
    size,
  ));
}

function branchPropPositions(count, region) {
  const size = count > 4 ? 145 : 170;
  const childCount = count - 1;
  const childSpan = Math.min(region.width * 0.76, (childCount - 1) * (size + 86));
  const firstChildX = region.centerX - childSpan / 2;
  const rootY = region.centerY - Math.min(150, region.height * 0.3);
  const childY = region.centerY + Math.min(145, region.height * 0.3);
  return [
    propPositionFromCenter(region.centerX, rootY, size),
    ...Array.from({ length: childCount }, (_, index) => propPositionFromCenter(
      childCount === 1 ? region.centerX : firstChildX + childSpan * index / (childCount - 1),
      childY,
      size,
    )),
  ];
}

function loopPropPositions(count, region) {
  const size = count > 4 ? 145 : count === 4 ? 170 : 185;
  const radius = Math.min(region.width * 0.25, region.height * 0.34);
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return propPositionFromCenter(
      region.centerX + Math.cos(angle) * radius,
      region.centerY + Math.sin(angle) * radius,
      size,
    );
  });
}

function positionsForFlow(scene, region) {
  if (scene.flow === 'chain') return chainPropPositions(scene.props.length, region);
  if (scene.flow === 'branch') return branchPropPositions(scene.props.length, region);
  if (scene.flow === 'loop') return loopPropPositions(scene.props.length, region);
  return balancedClusterPropPositions(scene.props.length, region);
}

function comparisonPanelPropPositions(count, panelLeft) {
  if (count === 0) return [];
  if (count > 3) throw new Error(`Comparison panel cannot contain ${count} props`);
  return balancedClusterPropPositions(count, {
    centerX: panelLeft + 345,
    centerY: 500,
    width: 570,
    height: 350,
  });
}

function comparisonPropPositions(count) {
  const leftCount = Math.floor(count / 2);
  const rightCount = count - leftCount;
  return [
    ...comparisonPanelPropPositions(leftCount, 250),
    ...comparisonPanelPropPositions(rightCount, 980),
  ];
}

function validateComparisonPropPositions(scene) {
  const positions = comparisonPropPositions(scene.props.length);
  const leftCount = Math.floor(scene.props.length / 2);
  const groups = [positions.slice(0, leftCount), positions.slice(leftCount)];
  groups.forEach((group, groupIndex) => {
    if (group.length !== 2) return;
    const [first, second] = group;
    if (first.y !== second.y || first.size !== second.size) {
      throw new Error(`Comparison pair must share a baseline and size in ${scene.id}`);
    }
    const panelCenter = groupIndex === 0 ? 595 : 1325;
    const firstCenter = first.x + 24 + first.size / 2;
    const secondCenter = second.x + 24 + second.size / 2;
    if (Math.abs((firstCenter + secondCenter) / 2 - panelCenter) > 0.001) {
      throw new Error(`Comparison pair must be centered in its panel in ${scene.id}`);
    }
  });
}

const propRegions = {
  stage: { centerX: 1350, centerY: 485, width: 690, height: 450 },
  process: { centerX: 960, centerY: 480, width: 1260, height: 460 },
  grid: { centerX: 1265, centerY: 500, width: 820, height: 470 },
  hero: { centerX: 1320, centerY: 550, width: 760, height: 350 },
  focus: { centerX: 1320, centerY: 500, width: 720, height: 470 },
};

function baseLayoutPropPositions(scene) {
  const count = scene.props.length;
  if (scene.layout === 'comparison') {
    return comparisonPropPositions(count);
  }
  return positionsForFlow(scene, propRegions[scene.layout] || propRegions.stage);
}

function layoutPropPositions(scene) {
  let positions = baseLayoutPropPositions(scene);
  const mirrorable = new Set(['hero', 'focus', 'grid', 'stage']);
  if (scene.visualVariant === 'mirror' && mirrorable.has(scene.layout)) {
    positions = positions.map((position) => ({
      ...position,
      x: 1920 - position.x - position.size - 48,
    }));
  }
  if (positions.length === 0) return positions;
  const contentFloor = calloutContentFloor(scene);
  const props = scene.props.map(normalizeProp);
  const visibleTop = Math.min(...positions.map((position, index) => (
    propVisualBox(position, props[index], position.size, 24).top
  )));
  const requiredShift = Math.max(0, contentFloor - visibleTop);
  return requiredShift === 0
    ? positions
    : positions.map((position) => ({ ...position, y: position.y + requiredShift }));
}

const layoutGeometry = {
  stage: {
    human: { x: 68, y: 330, width: 450, height: 490 },
    agent: { x: 470, y: 320, width: 400, height: 500 },
    callout: { x: 1000, y: 145, width: 720, align: 'center' },
  },
  process: {
    human: { x: 56, y: 470, width: 230, height: 270 },
    agent: { x: 1619, y: 455, width: 245, height: 285 },
    callout: { x: 350, y: 132, width: 1220, align: 'center' },
  },
  grid: {
    human: { x: 68, y: 395, width: 250, height: 300 },
    agent: { x: 300, y: 350, width: 310, height: 360 },
    callout: { x: 420, y: 132, width: 1080, align: 'center' },
  },
  comparison: {
    human: { x: 56, y: 485, width: 230, height: 280 },
    agent: { x: 1614, y: 465, width: 250, height: 300 },
    callout: { x: 420, y: 132, width: 1080, align: 'center' },
  },
  hero: {
    human: { x: 74, y: 430, width: 300, height: 345 },
    agent: { x: 395, y: 410, width: 310, height: 355 },
    callout: { x: 420, y: 170, width: 1080, align: 'center' },
  },
  focus: {
    human: { x: 60, y: 440, width: 260, height: 300 },
    agent: { x: 300, y: 325, width: 410, height: 470 },
    callout: { x: 260, y: 135, width: 1400, align: 'center' },
  },
};

function mirrorFrame(frame) {
  return { ...frame, x: 1920 - frame.x - frame.width };
}

function sceneLayoutGeometry(scene) {
  const geometry = layoutGeometry[scene.layout] || layoutGeometry.stage;
  if (scene.visualVariant !== 'mirror' || !['hero', 'focus', 'grid', 'stage', 'comparison'].includes(scene.layout)) {
    return geometry;
  }
  const callout = scene.layout === 'stage'
    ? { ...mirrorFrame(geometry.callout), align: geometry.callout.align }
    : geometry.callout;
  return {
    human: mirrorFrame(geometry.human),
    agent: mirrorFrame(geometry.agent),
    callout,
  };
}

function frameStyle(frame) {
  return `left:${frame.x}px;top:${frame.y}px;width:${frame.width}px;height:${frame.height}px`;
}

function calloutStyle(frame) {
  return `left:${frame.x}px;top:${frame.y}px;width:${frame.width}px;text-align:${frame.align}`;
}

function propCenter(position) {
  return { x: position.x + 24 + position.size / 2, y: position.y + position.size / 2 };
}

function averagePoint(points) {
  return points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 });
}

function validatePropGroupGeometry(scene) {
  const positions = layoutPropPositions(scene);
  const centers = positions.map(propCenter);
  if (scene.layout === 'comparison') {
    validateComparisonPropPositions(scene);
    return;
  }

  if (scene.flow === 'cluster' || scene.flow === 'loop') {
    const total = averagePoint(centers);
    const centroid = { x: total.x / centers.length, y: total.y / centers.length };
    const region = propRegions[scene.layout] || propRegions.stage;
    const expectedX = scene.visualVariant === 'mirror' ? 1920 - region.centerX : region.centerX;
    if (Math.abs(centroid.x - expectedX) > 0.01 || centroid.y < region.centerY - 0.01) {
      throw new Error(`Prop group centroid is off its layout anchor in ${scene.id}`);
    }
  }

  if (scene.props.length === 2 && scene.flow === 'cluster') {
    if (positions[0].size !== positions[1].size || Math.abs(centers[0].y - centers[1].y) > 0.01) {
      throw new Error(`Two-prop group must use an equal horizontal pair in ${scene.id}`);
    }
  }

  if (scene.props.length === 3 && (scene.flow === 'cluster' || scene.flow === 'loop')) {
    const distances = [
      Math.hypot(centers[0].x - centers[1].x, centers[0].y - centers[1].y),
      Math.hypot(centers[1].x - centers[2].x, centers[1].y - centers[2].y),
      Math.hypot(centers[2].x - centers[0].x, centers[2].y - centers[0].y),
    ];
    if (Math.max(...distances) - Math.min(...distances) > 0.01) {
      throw new Error(`Three-prop group must form an equilateral triangle in ${scene.id}`);
    }
  }
}

function spriteVisibleBox(frame, bounds, canvas) {
  const scale = Math.min(frame.width / canvas.width, frame.height / canvas.height);
  const fittedWidth = canvas.width * scale;
  const fittedHeight = canvas.height * scale;
  const offsetX = frame.x + (frame.width - fittedWidth) / 2;
  const offsetY = frame.y + (frame.height - fittedHeight) / 2;
  return {
    left: offsetX + bounds.x * scale,
    top: offsetY + bounds.y * scale,
    right: offsetX + (bounds.x + bounds.width) * scale,
    bottom: offsetY + (bounds.y + bounds.height) * scale,
  };
}

function boxMass(box, salience = 1) {
  const width = Math.max(1, box.right - box.left);
  const height = Math.max(1, box.bottom - box.top);
  return {
    x: (box.left + box.right) / 2,
    y: (box.top + box.bottom) / 2,
    weight: width * height * salience,
  };
}

function calloutMass(scene, frame) {
  const metrics = calloutTextMetrics(scene, frame);
  const left = frame.align === 'left'
    ? frame.x
    : frame.align === 'right'
      ? frame.x + frame.width - metrics.textWidth
      : frame.x + (frame.width - metrics.textWidth) / 2;
  return boxMass({ left, top: frame.y, right: left + metrics.textWidth, bottom: frame.y + metrics.textHeight }, 1.15);
}

function calloutTextMetrics(scene, frame) {
  const baseFontSize = { hero: 78, focus: 76, grid: 54, process: 54, comparison: 53, stage: 44 }[scene.layout];
  const longFontSize = { hero: 64, focus: 60, grid: 48, process: 48, comparison: 48, stage: 40 }[scene.layout];
  const fontSize = [...scene.callout].length > 22 ? longFontSize : baseFontSize;
  const estimatedWidth = Math.max(fontSize * 2, [...scene.callout].length * fontSize);
  const lines = Math.max(1, Math.ceil(estimatedWidth / frame.width));
  const textWidth = Math.min(frame.width, estimatedWidth);
  const textHeight = lines * fontSize * 1.3;
  return { fontSize, lines, textWidth, textHeight };
}

function calloutContentFloor(scene) {
  const frame = sceneLayoutGeometry(scene).callout;
  return frame.y + calloutTextMetrics(scene, frame).textHeight + titleContentGap;
}

function validateTitleContentSeparation(scene) {
  const floor = calloutContentFloor(scene);
  const geometry = sceneLayoutGeometry(scene);
  const actorBoxes = [
    spriteVisibleBox(geometry.human, humanBoundsById.get(scene.human), { width: 512, height: 512 }),
    spriteVisibleBox(geometry.agent, agentBoundsById.get(scene.agent), { width: 384, height: 512 }),
  ];
  const props = scene.props.map(normalizeProp);
  const propBoxes = layoutPropPositions(scene).map((position, index) => (
    propVisualBox(position, props[index], position.size, 24)
  ));
  const contentTops = [
    ...actorBoxes.map((box) => box.top),
    ...propBoxes.map((box) => box.top),
  ];
  if (scene.layout === 'comparison') contentTops.push(228);
  const contentTop = Math.min(...contentTops);
  scene.titleLane = { titleBottom: floor - titleContentGap, contentTop, gap: contentTop - floor + titleContentGap };
  if (contentTop < floor - 0.5) {
    throw new Error(`Body content enters the title lane in ${scene.id}`);
  }
}

function measureSceneVisualBalance(scene) {
  const geometry = sceneLayoutGeometry(scene);
  const humanBounds = humanBoundsById.get(scene.human);
  const agentBounds = agentBoundsById.get(scene.agent);
  const masses = [
    boxMass(spriteVisibleBox(geometry.human, humanBounds, { width: 512, height: 512 }), 0.72),
    boxMass(spriteVisibleBox(geometry.agent, agentBounds, { width: 384, height: 512 }), 0.8),
    calloutMass(scene, geometry.callout),
  ];
  const positions = layoutPropPositions(scene);
  scene.props.map(normalizeProp).forEach((prop, index) => {
    const position = positions[index];
    const visualBox = propVisualBox(position, prop, position.size, 24);
    masses.push(boxMass(visualBox, 1.2));
  });
  const totalWeight = masses.reduce((sum, mass) => sum + mass.weight, 0);
  const centroid = masses.reduce((total, mass) => ({
    x: total.x + mass.x * mass.weight,
    y: total.y + mass.y * mass.weight,
  }), { x: 0, y: 0 });
  const result = {
    x: centroid.x / totalWeight,
    y: centroid.y / totalWeight,
  };
  return {
    ...result,
    offsetX: result.x - visualBalanceTarget.x,
    offsetY: result.y - visualBalanceTarget.y,
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function sceneContentBounds(scene) {
  const geometry = sceneLayoutGeometry(scene);
  const boxes = [geometry.human, geometry.agent, {
    x: geometry.callout.x,
    y: geometry.callout.y,
    width: geometry.callout.width,
    height: [...scene.callout].length > 22 ? 150 : 115,
  }];
  for (const position of layoutPropPositions(scene)) {
    boxes.push({ x: position.x, y: position.y, width: position.size + 48, height: position.size + 56 });
  }
  if (scene.layout === 'comparison') {
    boxes.push({ x: 250, y: 228, width: 690, height: 540 });
    boxes.push({ x: 980, y: 228, width: 690, height: 540 });
  }
  return {
    left: Math.min(...boxes.map((box) => box.x)),
    top: Math.min(...boxes.map((box) => box.y)),
    right: Math.max(...boxes.map((box) => box.x + box.width)),
    bottom: Math.max(...boxes.map((box) => box.y + box.height)),
  };
}

function validateSceneVisualBalance(scene) {
  const geometry = sceneLayoutGeometry(scene);
  const frames = [geometry.human, geometry.agent];
  for (const frame of frames) {
    if (frame.x < bodySafeArea.left || frame.x + frame.width > bodySafeArea.right || frame.y < bodySafeArea.top || frame.y + frame.height > bodySafeArea.bottom) {
      throw new Error(`Actor frame leaves the body safe area in ${scene.id}`);
    }
  }
  for (const position of layoutPropPositions(scene)) {
    if (position.x < bodySafeArea.left || position.x + position.size + 48 > bodySafeArea.right || position.y < bodySafeArea.top || position.y + position.size + 56 > bodySafeArea.bottom) {
      throw new Error(`Prop frame leaves the body safe area in ${scene.id}`);
    }
  }
  const rawBalance = measureSceneVisualBalance(scene);
  const bounds = sceneContentBounds(scene);
  const shiftX = clamp(
    -rawBalance.offsetX,
    bodySafeArea.left - bounds.left,
    bodySafeArea.right - bounds.right,
  );
  const shiftY = clamp(
    -rawBalance.offsetY,
    bodySafeArea.top - bounds.top,
    bodySafeArea.bottom - bounds.bottom,
  );
  scene.balanceShift = { x: shiftX, y: shiftY };
  scene.visualBalance = {
    x: rawBalance.x + shiftX,
    y: rawBalance.y + shiftY,
    offsetX: rawBalance.offsetX + shiftX,
    offsetY: rawBalance.offsetY + shiftY,
    rawOffsetX: rawBalance.offsetX,
    rawOffsetY: rawBalance.offsetY,
    appliedShiftX: shiftX,
    appliedShiftY: shiftY,
  };
  if (Math.abs(scene.visualBalance.offsetX) > 160 || Math.abs(scene.visualBalance.offsetY) > 100) {
    throw new Error(`Visual centroid is unbalanced in ${scene.id}: (${scene.visualBalance.offsetX.toFixed(1)}, ${scene.visualBalance.offsetY.toFixed(1)})`);
  }
}

function renderPhaseV2(scene, index) {
  if (scene.recap) {
    const summaryLabel = scene.finalSummary ? '总结' : `第 ${scene.chapterNumber} 章小结`;
    const summaryTitle = scene.finalSummary ? '使用深度研究任务模板\n把证据变成决策' : scene.chapter;
    const summaryCta = '';
    return `
      <section data-hf-id="hf-v2-phase-${scene.id}" id="v2-phase-${scene.id}" class="phase is-recap${scene.finalSummary ? ' is-final-summary' : ''}${index === 0 ? ' is-first' : ''}" style="z-index:${index + 1}" data-chapter="${escapeHtml(scene.chapter)}" data-layout-allow-overlap data-layout-allow-overflow data-layout-allow-occlusion>
        <div data-hf-id="hf-v2-${scene.id}-chapter-summary" class="chapter-summary">
          <div class="summary-side"><span>${escapeHtml(summaryLabel)}</span><strong>${escapeHtml(summaryTitle).replaceAll('\n', '<br>')}</strong></div>
          <div class="summary-body">
            ${scene.chapterSummary.map((point, pointIndex) => `<div class="summary-point summary-point-${pointIndex + 1}"><span>${pointIndex + 1}.</span><strong>${escapeHtml(point)}</strong></div>`).join('')}
            ${summaryCta}
          </div>
        </div>
      </section>`;
  }

  const props = scene.props.map(normalizeProp);
  const positions = layoutPropPositions(scene);
  const geometry = sceneLayoutGeometry(scene);
  const items = props.map((prop, propIndex) => {
    const position = positions[propIndex];
    return `
          <div data-hf-id="hf-v2-${scene.id}-prop-${propIndex + 1}" class="prop-item prop-${propIndex + 1}${propIndex === 0 ? ' focus-prop' : ''}" style="left:${position.x}px;top:${position.y}px;--prop-size:${position.size}px">
            <img src="${assetSrc('props', prop.id)}" alt="${escapeHtml(prop.label || prop.id)}">
            ${prop.label ? `<span>${escapeHtml(prop.label)}</span>` : ''}
          </div>`;
  }).join('');
  const lines = connectionPairs(scene.flow, props.length).map(([fromIndex, toIndex], lineIndex) => {
    const fromPosition = positions[fromIndex];
    const toPosition = positions[toIndex];
    const { from, to } = connectorEndpoints(
      fromPosition, props[fromIndex],
      toPosition, props[toIndex],
    );
    const geometry = lineGeometry(from, to);
    return `<div data-hf-id="hf-v2-${scene.id}-line-${lineIndex + 1}" class="connector connector-${lineIndex + 1}" style="left:${from.x}px;top:${from.y}px;width:${geometry.length.toFixed(2)}px;clip-path:inset(0 100% 0 0);transform:rotate(${geometry.angle.toFixed(3)}deg)"></div>`;
  }).join('');
  const comparison = scene.layout === 'comparison' ? `
          <div class="compare-panel compare-panel-left"><div class="compare-label">${escapeHtml(scene.labels[0])}</div></div>
          <div class="compare-panel compare-panel-right"><div class="compare-label">${escapeHtml(scene.labels[1])}</div></div>` : '';
  const chapterIntro = scene.showIntro ? `
        <div data-hf-id="hf-v2-${scene.id}-chapter-intro" class="chapter-intro">
          <div class="intro-rail"></div>
          <div class="intro-kicker">第 ${scene.chapterNumber} 章</div>
          <div class="intro-title">${escapeHtml(scene.chapter)}</div>
          <div class="intro-promise">${escapeHtml(scene.chapterIntro)}</div>
          <div class="intro-ghost" aria-hidden="true"></div>
          <div class="intro-mark intro-mark-a"></div>
          <div class="intro-mark intro-mark-b"></div>
        </div>` : '';

  return `
      <section data-hf-id="hf-v2-phase-${scene.id}" id="v2-phase-${scene.id}" class="phase layout-${escapeHtml(scene.layout)} variant-${escapeHtml(scene.visualVariant || 'standard')}${scene.showIntro ? ' has-chapter-intro' : ''}${index === 0 ? ' is-first' : ''}" style="z-index:${index + 1}" data-chapter="${escapeHtml(scene.chapter)}" data-layout-allow-overlap data-layout-allow-overflow data-layout-allow-occlusion>
        <div class="scene-content-shell">
          <div class="balance-layer" style="transform:translate(${scene.balanceShift?.x || 0}px,${scene.balanceShift?.y || 0}px)">
            <div class="ground-line"></div>
            ${comparison}
            <img data-hf-id="hf-v2-${scene.id}-human" class="actor human-actor" style="${frameStyle(geometry.human)}" src="${assetSrc('human', scene.human)}" alt="工程师 ${escapeHtml(scene.human)}">
            <img data-hf-id="hf-v2-${scene.id}-agent" class="actor agent-actor" style="${frameStyle(geometry.agent)}" src="${assetSrc('agent', scene.agent)}" alt="Tiny Agent ${escapeHtml(scene.agent)}">
            <div data-hf-id="hf-v2-${scene.id}-callout" class="callout${[...scene.callout].length > 22 ? ' callout-long' : ''} accent-${escapeHtml(scene.accent || 'blue')}" style="${calloutStyle(geometry.callout)}">${escapeHtml(scene.callout)}</div>
            <div class="prop-zone">${lines}${items}</div>
          </div>
        </div>
${chapterIntro}
      </section>`;
}

const transitionPrimeLead = 0.02;

function sceneEntranceTiming(scene, index) {
  const contentRevealAt = scene.showIntro ? scene.start + 2.18 : scene.start;
  const contentAt = scene.showIntro
    ? contentRevealAt + 0.16
    : scene.start + (index === 0 ? 0.16 : 0.04);
  return {
    primeAt: Math.max(0, contentRevealAt - transitionPrimeLead),
    contentRevealAt,
    contentAt,
    humanAt: contentAt,
    agentAt: contentAt + 0.04,
  };
}

function addSceneEntranceV2(timeline, scene, timing) {
  const selector = `#v2-phase-${scene.id}`;
  const { primeAt, contentAt, humanAt, agentAt } = timing;
  timeline.push(`      tl.set("${selector} .human-actor", { y: 8, opacity: 0 }, ${primeAt.toFixed(3)});
      tl.set("${selector} .agent-actor", { y: 10, opacity: 0 }, ${primeAt.toFixed(3)});
      tl.to("${selector} .human-actor", { y: 0, opacity: 1, duration: 0.56, ease: "sine.out" }, ${humanAt.toFixed(3)});
      tl.to("${selector} .agent-actor", { y: 0, opacity: 1, duration: 0.58, ease: "sine.out" }, ${agentAt.toFixed(3)});`);

  if (scene.layout === 'hero') {
    const calloutX = scene.visualVariant === 'mirror' ? 42 : -42;
    timeline.push(`      tl.set("${selector} .callout", { x: ${calloutX}, opacity: 0 }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .callout", { x: 0, opacity: 1, duration: 0.58, ease: "power2.out" }, ${contentAt.toFixed(3)});`);
  } else if (scene.layout === 'focus') {
    timeline.push(`      tl.set("${selector} .callout", { scale: 0.96, opacity: 0 }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .callout", { scale: 1, opacity: 1, duration: 0.52, ease: "power2.out" }, ${contentAt.toFixed(3)});`);
  } else if (scene.layout === 'comparison') {
    timeline.push(`      tl.set("${selector} .compare-panel-left", { clipPath: "inset(0 100% 0 0)" }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.set("${selector} .compare-panel-right", { clipPath: "inset(0 0 0 100%)" }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.set("${selector} .callout", { y: -12, opacity: 0 }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .compare-panel-left", { clipPath: "inset(0 0% 0 0)", duration: 0.54, ease: "power2.inOut" }, ${contentAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .compare-panel-right", { clipPath: "inset(0 0 0 0%)", duration: 0.54, ease: "power2.inOut" }, ${contentAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .callout", { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, ${(contentAt + 0.04).toFixed(3)});`);
  } else if (scene.layout === 'grid') {
    const calloutX = scene.visualVariant === 'mirror' ? 24 : -24;
    timeline.push(`      tl.set("${selector} .callout", { x: ${calloutX}, opacity: 0 }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .callout", { x: 0, opacity: 1, duration: 0.52, ease: "power2.out" }, ${contentAt.toFixed(3)});`);
  } else if (scene.layout === 'process') {
    timeline.push(`      tl.set("${selector} .callout", { y: -14, opacity: 0 }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .callout", { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, ${contentAt.toFixed(3)});`);
  } else {
    timeline.push(`      tl.set("${selector} .callout", { y: -16, opacity: 0 }, ${primeAt.toFixed(3)});`);
    timeline.push(`      tl.to("${selector} .callout", { y: 0, opacity: 1, duration: 0.54, ease: "sine.out" }, ${contentAt.toFixed(3)});`);
  }

  scene.propBeatTimes.forEach((beat, propIndex) => {
    const propSelector = `${selector} .prop-${propIndex + 1}`;
    const fromState = scene.layout === 'process'
      ? '{ x: -30, opacity: 0 }'
      : scene.layout === 'hero' || scene.layout === 'focus'
        ? '{ y: 18, scale: 1.12, opacity: 0 }'
        : '{ y: 24, scale: 0.94, opacity: 0 }';
    timeline.push(`      tl.fromTo("${propSelector}", ${fromState}, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.48, ease: "power3.out", immediateRender: false }, ${beat.toFixed(3)});`);
  });

  connectionPairs(scene.flow, scene.props.length).forEach(([fromIndex, toIndex], lineIndex) => {
    const connectorAt = Math.min(
      scene.end - 0.45,
      Math.max(scene.propBeatTimes[fromIndex], scene.propBeatTimes[toIndex]) + 0.18,
    );
    timeline.push(`      tl.fromTo("${selector} .connector-${lineIndex + 1}", { clipPath: "inset(0 100% 0 0)", opacity: 0 }, { clipPath: "inset(0 0% 0 0)", opacity: 0.62, duration: 0.42, ease: "power2.out", immediateRender: false }, ${connectorAt.toFixed(3)});`);
  });
}

function renderStoryV2(scenes, duration) {
  const phases = scenes.map(renderPhaseV2).join('\n');
  const timeline = [];

  scenes.forEach((scene, index) => {
    const selector = `#v2-phase-${scene.id}`;
    const entranceTiming = sceneEntranceTiming(scene, index);
    const { contentAt } = entranceTiming;
    if (index > 0) {
      const previous = scenes[index - 1];
      const previousSelector = `#v2-phase-${previous.id}`;
      let transitionDuration;
      let transitionAt;
      if (scene.chapterStart) {
        transitionDuration = 0.74;
        transitionAt = scene.start;
        timeline.push(`      tl.to("${previousSelector}", { scale: 0.992, duration: ${transitionDuration}, ease: "power2.inOut" }, ${transitionAt.toFixed(3)});`);
        timeline.push(`      tl.fromTo("${selector}", { clipPath: "inset(100% 0 0 0)", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1, duration: ${transitionDuration}, ease: "power2.inOut", immediateRender: false }, ${transitionAt.toFixed(3)});`);
      } else if (scene.layout === previous.layout) {
        transitionDuration = 0.48;
        transitionAt = scene.start;
        const direction = index % 2 === 0 ? 1 : -1;
        const incomingClip = direction > 0
          ? 'inset(0 0 0 100%)'
          : 'inset(0 100% 0 0)';
        timeline.push(`      tl.to("${previousSelector}", { scale: 0.995, duration: ${transitionDuration}, ease: "power2.inOut" }, ${transitionAt.toFixed(3)});`);
        timeline.push(`      tl.fromTo("${selector}", { clipPath: "${incomingClip}", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1, duration: ${transitionDuration}, ease: "power2.inOut", immediateRender: false }, ${transitionAt.toFixed(3)});`);
      } else {
        transitionDuration = 0.54;
        transitionAt = scene.start;
        const direction = index % 2 === 0 ? 1 : -1;
        const incomingClip = direction > 0
          ? 'inset(0 0 0 100%)'
          : 'inset(0 100% 0 0)';
        timeline.push(`      tl.to("${previousSelector}", { scale: 0.992, duration: ${transitionDuration}, ease: "power2.inOut" }, ${transitionAt.toFixed(3)});`);
        timeline.push(`      tl.fromTo("${selector}", { clipPath: "${incomingClip}", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1, duration: ${transitionDuration}, ease: "power3.inOut", immediateRender: false }, ${transitionAt.toFixed(3)});`);
      }
      timeline.push(`      tl.to("${previousSelector}", { opacity: 0, duration: 0.01, ease: "none" }, ${(transitionAt + transitionDuration).toFixed(3)});`);
    }

    if (scene.showIntro) {
      const introAt = scene.start + 0.04;
      const revealAt = entranceTiming.contentRevealAt;
      const introPrimeAt = Math.max(0, scene.start - transitionPrimeLead);
      timeline.push(`      tl.set("${selector} .intro-rail", { scaleY: 0 }, ${introPrimeAt.toFixed(3)});`);
      timeline.push(`      tl.set("${selector} .intro-kicker", { x: -55, opacity: 0 }, ${introPrimeAt.toFixed(3)});`);
      timeline.push(`      tl.set("${selector} .intro-title", { x: -90, opacity: 0 }, ${introPrimeAt.toFixed(3)});`);
      timeline.push(`      tl.set("${selector} .intro-promise", { y: 34, opacity: 0 }, ${introPrimeAt.toFixed(3)});`);
      timeline.push(`      tl.set("${selector} .intro-mark", { scale: 0.4, opacity: 0 }, ${introPrimeAt.toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .intro-rail", { scaleY: 1, duration: 0.62, ease: "power3.out" }, ${introAt.toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .intro-kicker", { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, ${(introAt + 0.14).toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .intro-title", { x: 0, opacity: 1, duration: 0.72, ease: "power4.out" }, ${(introAt + 0.2).toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .intro-promise", { y: 0, opacity: 1, duration: 0.62, ease: "power2.out" }, ${(introAt + 0.48).toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .intro-mark", { scale: 1, opacity: 1, duration: 0.64, stagger: 0.12, ease: "back.out(1.3)" }, ${(introAt + 0.34).toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .chapter-intro", { clipPath: "inset(0 0 100% 0)", duration: 0.64, ease: "power3.inOut" }, ${revealAt.toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .chapter-intro", { opacity: 0, duration: 0.01, ease: "none" }, ${(revealAt + 0.64).toFixed(3)});`);
      timeline.push(`      tl.set("${selector} .scene-content-shell", { clipPath: "inset(0 100% 0 0)", x: 46, opacity: 0 }, ${entranceTiming.primeAt.toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .scene-content-shell", { clipPath: "inset(0 0% 0 0)", x: 0, opacity: 1, duration: 0.64, ease: "power3.inOut" }, ${revealAt.toFixed(3)});`);
    }

    if (scene.recap) {
      const summaryAt = scene.start + 0.08;
      const summaryPrimeAt = Math.max(0, scene.start - transitionPrimeLead);
      timeline.push(`      tl.set("${selector} .summary-side span", { x: -35, opacity: 0 }, ${summaryPrimeAt.toFixed(3)});`);
      timeline.push(`      tl.set("${selector} .summary-side strong", { y: 26, opacity: 0 }, ${summaryPrimeAt.toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .summary-side span", { x: 0, opacity: 1, duration: 0.46, ease: "power3.out" }, ${summaryAt.toFixed(3)});`);
      timeline.push(`      tl.to("${selector} .summary-side strong", { y: 0, opacity: 1, duration: 0.62, ease: "power3.out" }, ${(summaryAt + 0.1).toFixed(3)});`);
      scene.summaryPointTimes.forEach((pointAt, pointIndex) => {
        const revealAt = Math.max(scene.start + 0.42, pointAt);
        timeline.push(`      tl.fromTo("${selector} .summary-point-${pointIndex + 1}", { x: 64, opacity: 0 }, { x: 0, opacity: 1, duration: 0.52, ease: "power3.out", immediateRender: false }, ${revealAt.toFixed(3)});`);
      });
      if (scene.ctaAt !== null) {
        timeline.push(`      tl.fromTo("${selector} .summary-cta", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58, ease: "power3.out", immediateRender: false }, ${scene.ctaAt.toFixed(3)});`);
      }
    } else {
      addSceneEntranceV2(timeline, scene, entranceTiming);
    }
  });

  return `<!doctype html>
<html lang="zh-CN">
  <body>
    <template id="story-template">
      <div data-hf-id="hf-v2-story-root" id="v2-story-root" data-composition-id="story" data-width="1920" data-height="1080" data-start="0" data-duration="${duration.toFixed(3)}">
        <style>
          @font-face { font-family:"Tiny Agent CJK"; src:url("assets/fonts/HiraginoSansGB.ttc"); font-style:normal; font-weight:100 900; }
          #v2-story-root { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; color:#111413; font-family:"Tiny Agent CJK",sans-serif; }
          #v2-story-root .phase { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; background-color:#ececea; background-image:linear-gradient(rgba(17,20,19,.035) 1px,rgba(236,236,234,0) 1px),linear-gradient(90deg,rgba(17,20,19,.035) 1px,rgba(236,236,234,0) 1px); background-size:48px 48px; opacity:0; transform-origin:center center; }
          #v2-story-root .phase.is-first { opacity:1; }
          #v2-story-root .scene-content-shell { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; transform-origin:center center; }
          #v2-story-root .balance-layer { position:absolute; inset:0; width:1920px; height:1080px; transform-origin:center center; }
          #v2-story-root .has-chapter-intro .scene-content-shell { opacity:0; }
          #v2-story-root .ground-line { position:absolute; right:84px; bottom:244px; left:84px; z-index:3; height:3px; background:#dfe7e4; }
          #v2-story-root .actor { position:absolute; z-index:24; object-fit:contain; transform-origin:center bottom; }
          #v2-story-root .callout { position:absolute; z-index:32; color:#111413; font-weight:900; line-height:1.3; letter-spacing:0; }
          #v2-story-root .prop-zone { position:absolute; inset:0; z-index:16; }
          #v2-story-root .prop-item { position:absolute; z-index:20; width:calc(var(--prop-size) + 48px); height:calc(var(--prop-size) + 62px); text-align:center; opacity:0; transform-origin:center; }
          #v2-story-root .prop-item img { position:relative; z-index:2; display:block; width:var(--prop-size); height:var(--prop-size); margin:0 auto; object-fit:contain; transform-origin:center; }
          #v2-story-root .prop-item span { position:relative; z-index:4; display:block; max-width:calc(var(--prop-size) + 44px); margin:8px auto 0; color:#47514e; font-size:24px; font-weight:800; line-height:1.24; letter-spacing:0; white-space:nowrap; }
          #v2-story-root .connector { position:absolute; z-index:12; height:5px; border-radius:3px; background:#1597ea; opacity:0; transform-origin:left center; }

          #v2-story-root .layout-stage .callout { font-size:44px; }

          #v2-story-root .layout-process .ground-line { right:180px; bottom:304px; left:180px; }
          #v2-story-root .layout-process .callout { font-size:54px; }

          #v2-story-root .layout-grid .ground-line { display:none; }
          #v2-story-root .layout-grid .callout { font-size:54px; }

          #v2-story-root .layout-comparison .ground-line { display:none; }
          #v2-story-root .layout-comparison .callout { font-size:53px; }
          #v2-story-root .compare-panel { position:absolute; top:228px; z-index:6; width:690px; height:540px; border:4px solid #dfe7e4; background:rgba(236,236,234,.96); }
          #v2-story-root .compare-panel-left { left:250px; border-top-color:#f5c84b; }
          #v2-story-root .compare-panel-right { right:250px; border-top-color:#1597ea; }
          #v2-story-root .compare-label { position:absolute; top:22px; right:32px; left:32px; font-size:34px; font-weight:900; text-align:center; }

          #v2-story-root .layout-hero .ground-line { display:none; }
          #v2-story-root .layout-hero .callout { font-size:78px; }

          #v2-story-root .layout-focus .ground-line { display:none; }
          #v2-story-root .layout-focus .callout { font-size:76px; }
          #v2-story-root .layout-hero .callout.callout-long { font-size:64px; }
          #v2-story-root .layout-focus .callout.callout-long { font-size:60px; }
          #v2-story-root .layout-grid .callout.callout-long,
          #v2-story-root .layout-process .callout.callout-long,
          #v2-story-root .layout-comparison .callout.callout-long { font-size:48px; }
          #v2-story-root .layout-stage .callout.callout-long { font-size:40px; }

          #v2-story-root .chapter-intro { position:absolute; inset:0; z-index:80; overflow:hidden; background:#ececea; clip-path:inset(0 0 0 0); }
          #v2-story-root .intro-rail { position:absolute; top:176px; left:176px; width:14px; height:560px; background:#1597ea; transform-origin:center top; }
          #v2-story-root .intro-kicker { position:absolute; top:186px; left:244px; color:#117abd; font-size:28px; font-weight:900; }
          #v2-story-root .intro-title { position:absolute; top:250px; left:236px; z-index:2; font-size:116px; font-weight:900; line-height:1.08; }
          #v2-story-root .intro-promise { position:absolute; top:430px; left:244px; z-index:2; width:1080px; font-size:44px; font-weight:700; line-height:1.45; }
          #v2-story-root .intro-ghost { position:absolute; top:118px; right:70px; width:520px; height:520px; border:12px solid rgba(17,122,189,.07); border-radius:50%; }
          #v2-story-root .intro-mark { position:absolute; border:7px solid #111413; border-radius:50%; }
          #v2-story-root .intro-mark-a { right:285px; bottom:245px; width:190px; height:190px; border-color:#1597ea; }
          #v2-story-root .intro-mark-b { right:185px; bottom:170px; width:92px; height:92px; border-color:#f5c84b; }

          #v2-story-root .chapter-summary { position:absolute; inset:0; z-index:90; display:grid; grid-template-columns:440px 1fr; background:#ececea; clip-path:inset(0 0 0 100%); }
          #v2-story-root .is-recap .chapter-summary { clip-path:none; }
          #v2-story-root .summary-side { display:flex; height:840px; flex-direction:column; justify-content:center; padding:90px 58px; border-right:12px solid #117abd; background:#ececea; color:#111413; }
          #v2-story-root .summary-side span { font-size:27px; font-weight:800; }
          #v2-story-root .summary-side strong { margin-top:24px; font-size:70px; font-weight:900; line-height:1.15; }
          #v2-story-root .summary-body { display:flex; height:840px; flex-direction:column; justify-content:center; gap:30px; padding:90px 130px 90px 100px; }
          #v2-story-root .summary-point { display:grid; grid-template-columns:82px 1fr; min-height:118px; align-items:center; border-bottom:4px solid #dfe7e4; opacity:0; }
          #v2-story-root .summary-point span { color:#117abd; font-size:27px; font-weight:900; }
          #v2-story-root .summary-point strong { font-size:42px; font-weight:900; line-height:1.3; }
          #v2-story-root .summary-cta { display:flex; align-items:center; gap:24px; min-height:84px; margin-top:8px; padding:18px 24px; border-left:8px solid #f5c84b; background:#ececea; opacity:0; }
          #v2-story-root .summary-cta strong { color:#117abd; font-size:30px; font-weight:900; }
          #v2-story-root .summary-cta span { color:#27312e; font-size:27px; font-weight:800; }
          #v2-story-root .is-final-summary .summary-side strong { font-size:62px; }
          #v2-story-root .is-final-summary .summary-body { gap:22px; }
          #v2-story-root .is-final-summary .summary-point strong { font-size:36px; }
        </style>
${phases}
        <script>
          window.__timelines = window.__timelines || {};
          const tl = gsap.timeline({ paused: true });
${timeline.join('\n')}
          window.__timelines.story = tl;
        </script>
      </div>
    </template>
  </body>
</html>
`;
}

function renderIndex({ duration, narrationDuration, chapters, captions, scenes }) {
  const captionMarkup = captions.map((caption, index) => `
        <div data-hf-id="hf-caption-${index + 1}" id="caption-${index + 1}" class="caption${index === 0 ? ' is-first' : ''}">${escapeHtml(caption.text)}</div>`).join('');
  const progressMarkup = chapters.map((chapter, index) => `
        <div data-hf-id="hf-progress-segment-${index + 1}" class="progress-segment" style="--chapter-weight:${chapter.duration.toFixed(3)}">
          <div data-hf-id="hf-progress-track-${index + 1}" class="progress-track"><div data-hf-id="hf-progress-fill-${index + 1}" id="progress-fill-${index + 1}" class="progress-fill"></div><div data-hf-id="hf-progress-label-${index + 1}" id="progress-label-${index + 1}" class="progress-label${index === 0 ? ' is-current' : ''}">${index + 1}. ${escapeHtml(chapter.label)}</div></div>
        </div>`).join('');

  const finalSummaryScene = scenes.find((scene) => scene.finalSummary);
  const ctaAt = finalSummaryScene?.ctaAt;
  if (!Number.isFinite(ctaAt)) throw new Error('Missing fixed Chinese CTA timing anchor');

  const timeline = [];
  captions.slice(1).forEach((caption, index) => {
    const at = Math.max(0.18, caption.start);
    timeline.push(`      tl.to("#caption-${index + 1}", { y: -8, opacity: 0, duration: 0.1, ease: "power2.in" }, ${(at - 0.1).toFixed(3)});`);
    timeline.push(`      tl.fromTo("#caption-${index + 2}", { y: 9, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, ease: "power2.out", immediateRender: false }, ${at.toFixed(3)});`);
  });
  chapters.forEach((chapter, index) => {
    const firstScene = scenes.find((scene) => scene.chapter === chapter.label && scene.chapterStart);
    const recapScene = scenes.find((scene) => scene.chapter === chapter.label && scene.recap);
    if (!firstScene.recap) {
      const mastheadInAt = firstScene.start + (firstScene.showIntro ? 3.08 : 0.4);
      const mastheadOutAt = Math.max(mastheadInAt + 0.5, (recapScene?.start ?? chapter.end) - 0.3);
      timeline.push(`      tl.fromTo(".masthead", { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.46, ease: "power3.out", immediateRender: false }, ${mastheadInAt.toFixed(3)});`);
      timeline.push(`      tl.to(".masthead", { y: -10, opacity: 0, duration: 0.3, ease: "power2.inOut" }, ${mastheadOutAt.toFixed(3)});`);
    }
    timeline.push(`      tl.to("#progress-fill-${index + 1}", { scaleX: 1, duration: ${chapter.duration.toFixed(3)}, ease: "none" }, ${chapter.start.toFixed(3)});`);
    if (index > 0) {
      timeline.push(`      tl.to("#progress-label-${index}", { fontWeight: 760, duration: 0.2, ease: "power2.out" }, ${chapter.start.toFixed(3)});`);
      timeline.push(`      tl.to("#progress-label-${index + 1}", { fontWeight: 900, duration: 0.2, ease: "power2.out" }, ${chapter.start.toFixed(3)});`);
    }
  });
  timeline.push(`      tl.set("#outro-underline", { scaleX: 0 }, 0);`);
  timeline.push(`      tl.set(".content-layer", { opacity: 0 }, ${ctaAt.toFixed(3)});`);
  timeline.push(`      tl.set("#outro-overlay", { opacity: 1 }, ${ctaAt.toFixed(3)});`);
  timeline.push(`      tl.to("#outro-mark", { scale: 1.08, duration: 0.28, ease: "power2.out" }, ${(ctaAt + 0.10).toFixed(3)});`);
  timeline.push(`      tl.to("#outro-mark", { scale: 1, duration: 0.32, ease: "power2.inOut" }, ${(ctaAt + 0.38).toFixed(3)});`);
  timeline.push(`      tl.to("#outro-underline", { scaleX: 1, duration: 0.62, ease: "power3.out" }, ${(ctaAt + 0.92).toFixed(3)});`);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=1920, height=1080">
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      :root { --board:#ececea; --ink:#111413; --muted:#6f7976; --blue:#117abd; --line:#dfe7e4; --progress-played:#c9cbc5; --progress-rest:#dde0da; }
      * { box-sizing:border-box; }
      html, body { width:1920px; height:1080px; margin:0; overflow:hidden; }
      @font-face { font-family:"Tiny Agent CJK"; src:url("assets/fonts/HiraginoSansGB.ttc"); font-style:normal; font-weight:100 900; }
      body { color:var(--ink); font-family:"Tiny Agent CJK",sans-serif; letter-spacing:0; }
      #root { position:relative; width:1920px; height:1080px; overflow:hidden; }
      .board-fill { position:absolute; inset:0; background-color:var(--board); background-image:linear-gradient(rgba(17,20,19,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(17,20,19,.035) 1px,transparent 1px); background-size:48px 48px; }
      .masthead { position:absolute; top:42px; right:72px; left:72px; z-index:80; display:flex; height:76px; align-items:center; opacity:0; }
      .brand { color:var(--blue); font-family:"Inter",sans-serif; font-size:27px; font-weight:900; }
      .title { margin:0 0 0 52px; font-size:44px; font-weight:900; line-height:1.3; }
      .story-slot { position:absolute; inset:0; z-index:10; width:1920px; height:1080px; }
      .caption-band { position:absolute; right:154px; bottom:100px; left:154px; z-index:90; height:142px; background:rgba(236,236,234,.985); }
      .caption { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:10px 54px 4px; font-size:35px; font-weight:700; line-height:1.38; text-align:center; opacity:0; }
      .caption.is-first { opacity:1; }
      .chapter-progress { position:absolute; right:0; bottom:0; left:0; z-index:96; display:flex; height:52px; align-items:flex-start; gap:4px; }
      .progress-segment { flex:var(--chapter-weight) 1 0; min-width:0; }
      .progress-label { position:absolute; inset:0; z-index:2; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0; color:var(--ink); font-size:20px; font-weight:760; line-height:1; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
      .progress-label.is-current { font-weight:900; }
      .progress-track { position:relative; width:100%; height:52px; overflow:hidden; background:var(--progress-rest); }
      .progress-fill { position:absolute; inset:0; background:var(--progress-played); transform:scaleX(0); transform-origin:left center; }
      .outro-overlay { position:absolute; inset:0; z-index:200; width:1920px; height:1080px; overflow:hidden; background:#ececea; opacity:0; }
      .outro-character { position:absolute; inset:0; display:block; width:1920px; height:1080px; object-fit:cover; }
      .outro-copy { position:absolute; top:214px; right:82px; z-index:4; width:850px; min-height:660px; padding:52px 40px 48px 54px; }
      .outro-follow-row { display:flex; align-items:center; gap:28px; }
      .outro-mark { position:relative; display:block; flex:0 0 82px; width:82px; height:82px; border:8px solid var(--blue); border-radius:50%; }
      .outro-mark::before, .outro-mark::after { position:absolute; top:50%; left:50%; display:block; width:38px; height:8px; border-radius:5px; background:var(--blue); content:""; transform:translate(-50%,-50%); }
      .outro-mark::after { transform:translate(-50%,-50%) rotate(90deg); }
      .outro-heading { color:var(--blue); font-size:78px; font-weight:900; line-height:1.02; letter-spacing:-2px; white-space:nowrap; }
      .outro-rule { display:block; width:100%; height:5px; margin:44px 0 42px; background:#c9cbc5; }
      .outro-benefit { max-width:790px; margin:0; font-size:68px; font-weight:900; line-height:1.22; letter-spacing:-1.5px; }
      .outro-benefit span { display:block; }
      .outro-underline { display:block; width:728px; height:12px; margin-top:36px; border-radius:8px; background:var(--blue); transform-origin:left center; }
    </style>
  </head>
  <body>
    <div data-hf-id="hf-main-root" id="root" data-composition-id="main" data-start="0" data-duration="${duration.toFixed(3)}" data-width="1920" data-height="1080">
      <div data-hf-id="hf-board" class="board-fill content-layer"></div>
      <div data-hf-id="hf-story-slot" id="story-slot" class="story-slot content-layer" data-composition-id="story" data-composition-src="compositions/story.html" data-start="0" data-duration="${duration.toFixed(3)}" data-track-index="1" data-layout-allow-overlap data-layout-allow-overflow></div>
      <header data-hf-id="hf-masthead" class="masthead content-layer"><div class="brand">Tiny Agent</div><h1 class="title">深度研究任务模板</h1></header>
      <div data-hf-id="hf-caption-band" class="caption-band content-layer">${captionMarkup}
      </div>
      <nav data-hf-id="hf-chapter-progress" class="chapter-progress content-layer" aria-label="视频章节进度">${progressMarkup}
      </nav>
      <section data-hf-id="hf-outro-overlay" id="outro-overlay" class="outro-overlay" aria-label="关注 Tiny Agent">
        <img class="outro-character" src="assets/images/tiny-agent-outro-key-art-papergray.png" alt="微笑并挥手的 Tiny Agent">
        <div class="outro-copy">
          <div class="outro-follow-row"><span id="outro-mark" class="outro-mark" aria-hidden="true"></span><h1 class="outro-heading">关注 Tiny Agent</h1></div>
          <span class="outro-rule" aria-hidden="true"></span>
          <p class="outro-benefit"><span>成为更擅长</span><span>使用 AI 的人！</span></p>
          <span id="outro-underline" class="outro-underline" aria-hidden="true"></span>
        </div>
      </section>
      <audio data-hf-id="hf-narration" id="narration" class="clip" data-start="0" data-duration="${narrationDuration.toFixed(3)}" data-track-index="10" data-media-start="0" data-volume="1" src="assets/audio/narration.zh.normalized.mp3"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${timeline.join('\n')}
      window.__timelines.main = tl;
    </script>
  </body>
</html>
`;
}

async function compile() {
  const chapters = parseSource(await readFile(sourcePath, 'utf8'));
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const animationPlan = JSON.parse(await readFile(animationPlanPath, 'utf8'));
  const propsManifest = projectAssetPack.manifests.props;
  const humanManifest = projectAssetPack.manifests.human;
  const agentManifest = projectAssetPack.manifests.agent;
  propBoundsById = new Map(propsManifest.assets.map((asset) => [asset.id, asset.bounds]));
  humanBoundsById = new Map(humanManifest.assets.map((asset) => [asset.id, asset.bounds]));
  agentBoundsById = new Map(agentManifest.assets.map((asset) => [asset.id, asset.bounds]));
  validatePlan(chapters, plan);

  for (let index = 0; index < chapters.length; index += 1) {
    const chapterNumber = String(index + 1).padStart(2, '0');
    await access(path.join(audioDir, `chapter-${chapterNumber}.mp3`));
    await access(path.join(audioDir, `chapter-${chapterNumber}.vtt`));
  }

  const chapterTimings = [];
  const chapterCueGroups = [];
  const captions = [];
  let offset = 0;
  for (let index = 0; index < chapters.length; index += 1) {
    const chapterNumber = String(index + 1).padStart(2, '0');
    const audioPath = path.join(audioDir, `chapter-${chapterNumber}.mp3`);
    const vttPath = path.join(audioDir, `chapter-${chapterNumber}.vtt`);
    const duration = probeDuration(audioPath);
    chapterTimings.push({ label: chapters[index].label, start: offset, end: offset + duration, duration });
    const cues = parseVtt(await readFile(vttPath, 'utf8'));
    chapterCueGroups.push(cues);
    for (const cue of cues) {
      const pieces = splitCue({ start: offset + cue.start, end: offset + cue.end, text: cue.text });
      for (const piece of pieces) {
        if (/^[,.;:!?，。！？；：]+$/.test(piece.text) && captions.length > 0) {
          captions.at(-1).text += piece.text;
          captions.at(-1).end = piece.end;
        } else {
          captions.push(piece);
        }
      }
    }
    offset += duration;
  }

  const narrationPath = await mergeAudio(chapters);
  const narrationDuration = probeDuration(narrationPath);
  const spokenEnd = Math.min(captions.at(-1)?.end ?? narrationDuration, detectTrailingSpeechEnd(narrationPath, narrationDuration));
  captions[captions.length - 1].end = spokenEnd;
  chapterCueGroups.at(-1).at(-1).end = spokenEnd - chapterTimings.at(-1).start;
  const duration = spokenEnd + 0.22;
  chapterTimings[chapterTimings.length - 1].end = duration;
  chapterTimings[chapterTimings.length - 1].duration = duration - chapterTimings[chapterTimings.length - 1].start;
  const chapterAlignments = chapters.map((chapter, index) => (
    alignParagraphsToVtt(chapter, chapterCueGroups[index], chapterTimings[index])
  ));
  const scenes = assignVisualVariants(buildTimedScenes(
    chapters,
    plan,
    chapterTimings,
    chapterAlignments,
    captions,
    animationPlan,
  ));
  const bodySceneIds = new Set(scenes.filter((scene) => scene.props.length > 0).map((scene) => scene.id));
  for (const sceneId of bodySceneIds) {
    if (!animationPlan.scenes[sceneId]) throw new Error(`Animation plan is missing ${sceneId}`);
  }
  for (const sceneId of Object.keys(animationPlan.scenes)) {
    if (!bodySceneIds.has(sceneId)) throw new Error(`Animation plan contains unknown or empty scene ${sceneId}`);
  }
  validateTimedScenes(chapters, plan, chapterTimings, scenes);

  const combinedVtt = ['WEBVTT', '', ...captions.flatMap((caption, index) => [
    String(index + 1),
    `${secondsToTimestamp(caption.start)} --> ${secondsToTimestamp(caption.end)}`,
    caption.text,
    '',
  ])].join('\n');

  await writeFile(path.join(audioDir, 'narration.zh.vtt'), combinedVtt);
  await writeFile(path.join(projectRoot, 'captions.json'), `${JSON.stringify(captions, null, 2)}\n`);
  await writeFile(path.join(projectRoot, 'timeline.json'), `${JSON.stringify({ duration, voice, rate, chapters: chapterTimings, scenes }, null, 2)}\n`);
  await writeFile(path.join(projectRoot, 'timing-map.json'), `${JSON.stringify({
    source: sourcePath,
    timingSource: 'edge-tts-vtt',
    fixedCta: {
      text: '关注 Tiny Agent，成为更擅长使用 AI 的人！',
      start: scenes.find((scene) => scene.finalSummary)?.ctaAt,
      outroStart: scenes.find((scene) => scene.finalSummary)?.ctaAt,
      frameErrorSeconds: 0,
      spokenEnd,
      videoEnd: duration,
      tailSeconds: duration - spokenEnd,
    },
    chapters: chapterAlignments.map((chapter) => ({
      label: chapter.label,
      paragraphs: chapter.paragraphs.map(({ number, text, start, end }) => ({ number, text, start, end })),
    })),
    scenes: scenes.map((scene, index) => ({
      id: scene.id,
      chapter: scene.chapter,
      paragraphs: scene.paragraphs,
      start: scene.start,
      end: scene.end,
      transition: scene.recap ? null : sceneEntranceTiming(scene, index),
      propBeatTimes: scene.propBeatTimes,
      semanticBeats: scene.semanticBeats || [],
      titleLane: scene.titleLane || null,
      summaryPointTimes: scene.summaryPointTimes,
      ctaAt: scene.ctaAt,
      visualBalance: scene.visualBalance || null,
    })),
  }, null, 2)}\n`);
  const semanticBeatScenes = scenes.filter((scene) => scene.props.length > 0).map((scene) => ({
    id: scene.id,
    narration: scene.narration,
    props: scene.props.map(normalizeProp),
    beats: scene.semanticBeats,
  }));
  await writeFile(path.join(projectRoot, 'qa/semantic-beat-report.json'), `${JSON.stringify({
    policy: animationPlan.policy,
    scenes: semanticBeatScenes.length,
    props: semanticBeatScenes.reduce((sum, scene) => sum + scene.props.length, 0),
    beats: semanticBeatScenes.reduce((sum, scene) => sum + scene.beats.length, 0),
    fallbackBeats: 0,
    sceneResults: semanticBeatScenes,
  }, null, 2)}\n`);
  const titleLaneScenes = scenes.filter((scene) => scene.props.length > 0).map((scene) => ({
    id: scene.id,
    ...scene.titleLane,
  }));
  await writeFile(path.join(projectRoot, 'qa/title-content-report.json'), `${JSON.stringify({
    minimumGap: titleContentGap,
    scenes: titleLaneScenes.length,
    failedScenes: titleLaneScenes.filter((scene) => scene.gap < titleContentGap - 0.5).length,
    sceneResults: titleLaneScenes,
  }, null, 2)}\n`);
  await writeFile(path.join(projectRoot, 'compositions/story.html'), renderStoryV2(scenes, duration));
  await writeFile(path.join(projectRoot, 'index.html'), renderIndex({ duration, narrationDuration: Math.min(narrationDuration, duration), chapters: chapterTimings, captions, scenes }));

  const storyboardRows = scenes.map((scene, index) => `| ${String(index + 1).padStart(2, '0')} | ${scene.chapter} | ${secondsToTimestamp(scene.start).slice(0, 8)}-${secondsToTimestamp(scene.end).slice(0, 8)} | ${scene.layout} | ${scene.callout} | ${scene.human} / ${scene.agent} |`).join('\n');
  await writeFile(path.join(projectRoot, 'STORYBOARD.md'), `# Storyboard\n\n| # | 章节 | 时间 | 构图 | 画面重点 | 角色姿势 |\n| ---: | --- | --- | --- | --- | --- |\n${storyboardRows}\n`);
  await writeFile(path.join(projectRoot, 'summary.json'), `${JSON.stringify({
    title: 'Deep Research 怎样提问，才不会只得到一堆资料？',
    source: sourcePath,
    language: 'zh-CN',
    speech: { provider: 'edge-tts', voice, rate, integratedLoudnessTarget: '-20 LUFS mono / approximately -17 LUFS final stereo' },
    alignment: { timingSource: 'edge-tts-vtt', scriptFirst: true, sceneBoundaries: 'paragraph-to-vtt', propBeats: 'semantic-trigger-v1' },
    composition: { designVersion: 'v7-transition-continuity', width: 1920, height: 1080, fps: 30, durationSeconds: duration, chapters: chapterTimings, visualStates: scenes.length, captions: captions.length },
    qa: {
      visualBalance: {
        method: 'safe-area visible-bounds estimate plus saliency-weighted rendered-pixel centroid',
        safeArea: bodySafeArea,
        target: visualBalanceTarget,
        sourceLimits: { offsetX: 160, offsetY: 100 },
        pixelLimits: { offsetX: 150, offsetY: 100 },
        command: 'pnpm run check:balance',
        status: 'pending',
      },
      semanticBeats: {
        method: 'explicit narration trigger to final caption timeline',
        report: 'qa/semantic-beat-report.json',
        fallbackBeats: 0,
        status: 'pending',
      },
      transitionContinuity: {
        method: 'prime hidden state before reveal, then animate monotonically to rest',
        command: 'pnpm run check:transitions',
        report: 'qa/transition-continuity-report.json',
        status: 'pending',
      },
      hyperframesCheck: { command: 'pnpm run check', status: 'pending' },
    },
    output: { file: 'renders/2026-07-20-03-deep-research-brief-longform.zh-CN.mp4', status: 'pending' },
  }, null, 2)}\n`);
  process.stdout.write(`compiled duration=${duration.toFixed(3)} scenes=${scenes.length} captions=${captions.length}\n`);
}

const command = process.argv[2];
if (command === '--prepare') await prepare();
else if (command === '--tts') await generateTts();
else if (command === '--compile') await compile();
else throw new Error('Use --prepare, --tts, or --compile');
