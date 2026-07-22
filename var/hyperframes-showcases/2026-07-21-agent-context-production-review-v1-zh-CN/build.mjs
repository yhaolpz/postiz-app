import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(projectDir, '../../..');
const config = JSON.parse(readFileSync(path.join(projectDir, 'production-config.json'), 'utf8'));
const profile = JSON.parse(readFileSync(path.join(projectDir, 'production-profile.json'), 'utf8'));

function assertProductionProfile() {
  const firstSentence = config.segments[0]?.text;
  const fixedOpening = config.segments.find((segment) => segment.id === 'opening-fixed')?.text;
  if (profile.opening.coverCutBasis !== 'firstSentenceSpokenEndNextFrame') {
    throw new Error('Production profile must bind the cover cut to the first rendered frame after the first sentence ends.');
  }
  if (firstSentence !== profile.opening.firstSentence) {
    throw new Error('The first spoken sentence must exactly match the production-profile hook.');
  }
  if (fixedOpening !== profile.opening.fixedValueSentence) {
    throw new Error('The fixed value and follow/save sentence is missing or changed.');
  }
  if (profile.visual.sceneAgentCount !== 1 || profile.visual.sceneCoreObjectCount !== 1) {
    throw new Error('Retention production scenes require one Agent and one core object.');
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function ensureDirs() {
  for (const dir of ['audio', 'audio/segments', 'captions', 'captions/segments', 'snapshots', 'renders', 'qa']) {
    mkdirSync(path.join(projectDir, dir), { recursive: true });
  }
}

function mediaDuration(file) {
  return Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]));
}

function audibleRange(file, duration) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-50dB:d=0.05', '-f', 'null', '-'], {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) throw new Error(`Unable to measure audible range for ${file}\n${result.stderr}`);
  const log = `${result.stdout}\n${result.stderr}`;
  const starts = [...log.matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  const ends = [...log.matchAll(/silence_end:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  const audibleStart = starts[0] <= 0.02 && Number.isFinite(ends[0]) ? ends[0] : 0;
  const lastSilenceStart = starts.at(-1);
  const lastSilenceEnd = ends.at(-1);
  const audibleEnd = Number.isFinite(lastSilenceStart) && lastSilenceEnd >= duration - 0.05 ? lastSilenceStart : duration;
  return {
    start: Number(audibleStart.toFixed(3)),
    end: Number(Math.max(audibleStart, audibleEnd).toFixed(3))
  };
}

function parseTimestamp(value) {
  const match = value.match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/);
  if (!match) throw new Error(`Invalid VTT timestamp: ${value}`);
  return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4]}`);
}

function formatTimestamp(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rem = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(rem).padStart(3, '0')}`;
}

function parseVtt(file) {
  const blocks = readFileSync(file, 'utf8').replace(/\r/g, '').split(/\n\n+/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const [start, end] = lines[timingIndex].split('-->').map((value) => value.trim().split(' ')[0]);
    const text = lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) cues.push({ start: parseTimestamp(start), end: parseTimestamp(end), text });
  }
  return cues;
}

function normalized(value) {
  return value.toLocaleLowerCase(config.locale).replace(/[’']/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function resolveBeat(beat, cues) {
  const needle = normalized(beat.phrase);
  const cue = cues.find((item) => normalized(item.text).includes(needle));
  if (!cue) throw new Error(`Animation phrase not found in final VTT: ${beat.phrase}`);
  return { ...beat, resolvedStart: Number(cue.start.toFixed(3)), resolvedEnd: Number(cue.end.toFixed(3)), source: 'final-vtt' };
}

function generateTts() {
  assertProductionProfile();
  ensureDirs();
  const generatedSegments = [];
  for (const segment of config.segments) {
    const audioFile = path.join(projectDir, 'audio/segments', `${segment.id}.mp3`);
    const vttFile = path.join(projectDir, 'captions/segments', `${segment.id}.vtt`);
    run('uvx', ['edge-tts', '--voice', config.voice, '--rate', config.rate, '--text', segment.text, '--write-media', audioFile, '--write-subtitles', vttFile]);
    const duration = mediaDuration(audioFile);
    const localCues = parseVtt(vttFile);
    if (localCues.length === 0) throw new Error(`No VTT cues generated for ${segment.id}`);
    generatedSegments.push({
      ...segment,
      audioDuration: Number(duration.toFixed(3)),
      localCues,
      audible: audibleRange(audioFile, duration)
    });
  }

  const resolvedSegments = [];
  const allCues = [];
  let previousAudibleEnd = 0;
  for (const [index, segment] of generatedSegments.entries()) {
    const desiredGap = index === 0 ? 0 : Number(segment.gapBefore ?? config.defaultGap ?? 0.2);
    const placedStart = index === 0 ? 0 : Math.max(0, previousAudibleEnd + desiredGap - segment.audible.start);
    const spokenStart = placedStart + segment.audible.start;
    const spokenEnd = placedStart + segment.audible.end;
    const cues = segment.localCues.map((cue) => ({
      start: cue.start + placedStart,
      end: cue.end + placedStart,
      text: cue.text,
      segmentId: segment.id,
      sceneId: segment.sceneId
    }));
    allCues.push(...cues);
    resolvedSegments.push({
      id: segment.id,
      sceneId: segment.sceneId,
      text: segment.text,
      desiredGapBefore: desiredGap,
      actualGapBefore: Number((index === 0 ? 0 : spokenStart - previousAudibleEnd).toFixed(3)),
      audioStart: Number(placedStart.toFixed(3)),
      audioDuration: segment.audioDuration,
      audibleLocalStart: segment.audible.start,
      audibleLocalEnd: segment.audible.end,
      spokenStart: Number(spokenStart.toFixed(3)),
      spokenEnd: Number(spokenEnd.toFixed(3))
    });
    previousAudibleEnd = spokenEnd;
  }

  const duration = Number((Math.ceil((previousAudibleEnd + Number(config.tailPad ?? 0.3)) * 30) / 30).toFixed(6));

  const ffmpegArgs = ['-y', '-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo'];
  for (const segment of config.segments) ffmpegArgs.push('-i', path.join('audio/segments', `${segment.id}.mp3`));
  const delayed = resolvedSegments.map((segment, index) => {
    const placedStart = segment.audioStart;
    return `[${index + 1}:a]aresample=48000,adelay=${Math.round(placedStart * 1000)}|${Math.round(placedStart * 1000)}[s${index}]`;
  });
  const mixInputs = ['[0:a]', ...config.segments.map((_, index) => `[s${index}]`)].join('');
  const filter = `${delayed.join(';')};${mixInputs}amix=inputs=${config.segments.length + 1}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-17:LRA=7:TP=-1.5[out]`;
  const localizedNarration = path.join('audio', `narration.${config.locale}.mp3`);
  ffmpegArgs.push('-filter_complex', filter, '-map', '[out]', '-t', String(duration), '-c:a', 'libmp3lame', '-b:a', '192k', localizedNarration);
  run('ffmpeg', ffmpegArgs);
  copyFileSync(path.join(projectDir, localizedNarration), path.join(projectDir, 'audio', 'narration.mp3'));

  allCues.sort((a, b) => a.start - b.start);
  for (let index = 1; index < allCues.length; index += 1) {
    const previous = allCues[index - 1];
    const current = allCues[index];
    if (previous.end > current.start) previous.end = Number(current.start.toFixed(3));
  }
  for (const cue of allCues) cue.end = Number(Math.min(duration, cue.end).toFixed(3));
  const vtt = ['WEBVTT', '', ...allCues.flatMap((cue, index) => [String(index + 1), `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`, cue.text, ''])].join('\n');
  writeFileSync(path.join(projectDir, 'captions/narration.vtt'), `${vtt}\n`);
  writeFileSync(path.join(projectDir, 'captions/cues.json'), `${JSON.stringify(allCues, null, 2)}\n`);

  const scenePlanPath = path.join(projectDir, 'scene-plan.json');
  const scenePlan = JSON.parse(readFileSync(scenePlanPath, 'utf8'));
  const scenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  for (const [index, scene] of scenes.entries()) {
    const firstSegment = resolvedSegments.find((segment) => segment.sceneId === scene.id);
    if (!firstSegment) throw new Error(`No narration segment mapped to scene ${scene.id}`);
    scene.start = index === 0 ? 0 : firstSegment.audioStart;
    scene.end = index === scenes.length - 1 ? duration : resolvedSegments.find((segment) => segment.sceneId === scenes[index + 1].id).audioStart;
  }
  writeFileSync(scenePlanPath, `${JSON.stringify(scenePlan, null, 2)}\n`);

  const group = (sceneId) => resolvedSegments.filter((segment) => segment.sceneId === sceneId);
  const first = (sceneId) => group(sceneId)[0];
  const last = (sceneId) => group(sceneId).at(-1);

  const firstSentenceEnd = last('hook').spokenEnd;
  const coverHardCutFrame = Number((Math.ceil(firstSentenceEnd * 30) / 30).toFixed(6));
  const coverTimelineCutAt = Number(Math.max(firstSentenceEnd, coverHardCutFrame - 0.001).toFixed(6));
  const checkpoints = {
    coverFirstFrame: 0,
    coverHardCut: coverHardCutFrame,
    coverTimelineCutAt,
    coverCutBasis: profile.opening.coverCutBasis,
    questionEnd: firstSentenceEnd,
    firstSentenceEnd,
    promiseStart: first('promise').spokenStart,
    promiseEnd: last('promise').spokenEnd,
    authorityStart: first('authority').spokenStart,
    authorityEnd: last('authority').spokenEnd,
    artifactStart: first('artifact').spokenStart,
    explanationStart: first('budget').spokenStart,
    decisionStart: first('decision').spokenStart,
    finalSpeechEnd: resolvedSegments.at(-1).spokenEnd,
    maximumInterUtteranceGap: Number(Math.max(...resolvedSegments.slice(1).map((segment) => segment.actualGapBefore)).toFixed(3))
  };
  const requiredSnapshotTimes = [...new Set([
    0,
    2,
    ...scenes.slice(1).map((scene) => Number(scene.start.toFixed(3))),
    ...scenes.map((scene) => Number(((scene.start + scene.end) / 2).toFixed(3))),
    Number(Math.max(0, duration - 2).toFixed(3))
  ])].sort((a, b) => a - b);
  const timing = {
    locale: config.locale,
    duration,
    voice: config.voice,
    rate: config.rate,
    source: 'final edge-tts audio and VTT; utterances placed from measured audible bounds',
    segments: resolvedSegments,
    checkpoints,
    requiredSnapshotTimes
  };
  writeFileSync(path.join(projectDir, 'timing-map.json'), `${JSON.stringify(timing, null, 2)}\n`);
  const hyperframes = JSON.parse(readFileSync(path.join(projectDir, 'hyperframes.json'), 'utf8'));
  hyperframes.canvas.duration = duration;
  writeFileSync(path.join(projectDir, 'hyperframes.json'), `${JSON.stringify(hyperframes, null, 2)}\n`);
  const animation = {
    locale: config.locale,
    source: 'final-vtt',
    beats: config.beats.map((beat) => resolveBeat(beat, allCues))
  };
  writeFileSync(path.join(projectDir, 'animation-plan.json'), `${JSON.stringify(animation, null, 2)}\n`);
  return { timing, allCues, animation };
}

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function agentSrc(id) {
  const manifest = JSON.parse(readFileSync(path.join(projectDir, 'assets/pack/manifests/agent.json'), 'utf8'));
  const asset = manifest.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown local agent asset: ${id}`);
  return `assets/pack/${asset.path}`;
}

function propSrc(id) {
  const manifest = JSON.parse(readFileSync(path.join(projectDir, 'assets/pack/manifests/props.json'), 'utf8'));
  const asset = manifest.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown local prop asset: ${id}`);
  return `assets/pack/${asset.path}`;
}

function renderCore(sceneId) {
  const l = config.labels;
  if (sceneId === 'hook') return `<div class="core-card context-stack"><img src="${propSrc('question')}" alt=""><strong>${esc(l.hookCore)}</strong></div>`;
  if (sceneId === 'promise') return `<div class="core-card promise-card"><span class="promise-source">${esc(l.promiseSource)}</span><img src="${propSrc('result-card')}" alt=""><strong>${esc(l.promiseBenefit)}</strong><span class="save-label">${esc(l.promiseSave)}</span></div>`;
  if (sceneId === 'authority') return `<div class="core-card source-card"><span class="source-name">${esc(l.source)}</span><img src="${propSrc('document')}" alt=""><strong>${esc(l.sourceConclusion)}</strong></div>`;
  if (sceneId === 'artifact') return `<div class="core-card pack-card"><img src="${propSrc('package')}" alt=""><div class="pack-lines">${l.pack.map((item, index) => `<span><b>${index + 1}</b>${esc(item)}</span>`).join('')}</div></div>`;
  if (sceneId === 'budget') return `<div class="core-card budget-device"><div class="budget-state state-raw"><span>${esc(l.budgetRaw)}</span><strong>24%</strong><i></i></div><div class="budget-state state-focus"><span>${esc(l.budgetFocused)}</span><strong>68%</strong><i></i></div><div class="budget-state state-retrieve"><span>${esc(l.budgetRetrieve)}</span><strong>92%</strong><i></i></div></div>`;
  if (sceneId === 'memory') return `<div class="core-card memory-card"><img src="${propSrc('memory')}" alt=""><strong>${esc(l.memoryRule)}</strong><span>${esc(l.memoryAction)}</span></div>`;
  return `<div class="core-card decision-card"><img src="${propSrc('task-list')}" alt=""><div class="decision-lines">${l.decision.map((item) => `<span>${esc(item)}</span>`).join('')}</div><strong class="decision-ready">${esc(l.decisionReady)}</strong></div>`;
}

function renderHtml(timing, cues, animation, scenePlan) {
  const scenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  const sceneMarkup = scenes.map((scene, index) => {
    const side = ['hook', 'promise', 'artifact', 'decision'].includes(scene.id) ? 'agent-right' : 'agent-left';
    return `<section data-hf-id="hf-scene-${scene.id}" id="scene-${scene.id}" class="scene ${side} ${index === 0 ? 'scene-first' : ''}"><h1>${esc(config.headlines[scene.id])}</h1><div class="scene-body"><div class="agent-wrap"><img class="agent" src="${agentSrc(scene.agent)}" alt="Tiny Agent"></div><div class="core-wrap">${renderCore(scene.id)}</div></div></section>`;
  }).join('');
  const captionMarkup = cues.map((cue, index) => `<div data-hf-id="hf-caption-${index + 1}" id="caption-${index + 1}" class="caption-cue">${esc(cue.text)}</div>`).join('');

  const sceneTimeline = [];
  scenes.forEach((scene, index) => {
    const side = ['hook', 'promise', 'artifact', 'decision'].includes(scene.id) ? 'agent-right' : 'agent-left';
    if (index === 0) {
      sceneTimeline.push(`tl.set("#scene-${scene.id}", { autoAlpha: 1 }, 0);`);
    } else {
      const previous = scenes[index - 1];
      sceneTimeline.push(`tl.set("#scene-${previous.id}", { autoAlpha: 0 }, ${scene.start.toFixed(3)});`);
      sceneTimeline.push(`tl.set("#scene-${scene.id}", { autoAlpha: 1 }, ${scene.start.toFixed(3)});`);
    }
    const introAt = scene.id === 'hook' ? timing.checkpoints.coverTimelineCutAt : scene.start;
    sceneTimeline.push(`tl.fromTo("#scene-${scene.id} h1", { x: 42 }, { x: 0, duration: 0.38, ease: "power3.out" }, ${introAt.toFixed(3)});`);
    sceneTimeline.push(`tl.fromTo("#scene-${scene.id} .agent", { y: 10 }, { y: 0, duration: 0.42, ease: "power2.out" }, ${introAt.toFixed(3)});`);
    sceneTimeline.push(`tl.fromTo("#scene-${scene.id} .core-card", { x: ${side === 'agent-right' ? -34 : 34} }, { x: 0, duration: 0.42, ease: "power2.out" }, ${introAt.toFixed(3)});`);
  });
  const beatMap = Object.fromEntries(animation.beats.map((beat) => [beat.id, beat.resolvedStart]));
  sceneTimeline.push(`tl.set("#cover", { autoAlpha: 0 }, ${Number(timing.checkpoints.coverTimelineCutAt).toFixed(3)});`);
  sceneTimeline.push(`tl.to("#scene-promise .save-label", { backgroundColor: "#F4C542", scale: 1.04, duration: 0.28, ease: "power2.out" }, ${Number(beatMap['save-cue']).toFixed(3)});`);
  sceneTimeline.push(`tl.to("#scene-artifact .pack-card", { scale: 1.05, duration: 0.28, yoyo: true, repeat: 1, ease: "power2.inOut" }, ${(Number(beatMap['artifact-preview']) + 1.2).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-raw", { autoAlpha: 0 }, ${Number(beatMap['budget-focus']).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-focus", { autoAlpha: 1 }, ${Number(beatMap['budget-focus']).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-focus", { autoAlpha: 0 }, ${Number(beatMap['budget-retrieve']).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-retrieve", { autoAlpha: 1 }, ${Number(beatMap['budget-retrieve']).toFixed(3)});`);
  sceneTimeline.push(`tl.to("#scene-decision .decision-ready", { backgroundColor: "#F4C542", scale: 1.04, duration: 0.32, ease: "power2.out" }, ${Number(beatMap['decision-ready']).toFixed(3)});`);
  sceneTimeline.push(`tl.to("#scene-memory .memory-card", { scale: 1.045, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.inOut" }, ${Number(beatMap['memory-refresh']).toFixed(3)});`);
  const captionTimeline = cues.flatMap((cue, index) => [
    `tl.set("#caption-${index + 1}", { autoAlpha: 1, y: 0 }, ${cue.start.toFixed(3)});`,
    `tl.set("#caption-${index + 1}", { autoAlpha: 0 }, ${cue.end.toFixed(3)});`
  ]);

  return `<!doctype html>
<html lang="${esc(config.locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(config.topic)} Production Review</title>
  <script src="assets/vendor/gsap.min.js"></script>
  <style>
    @font-face{font-family:TA;src:url("assets/fonts/HiraginoSansGB.ttc") format("truetype");font-weight:100 900}
    :root{--paper:#ECECEA;--ink:#111413;--blue:#117ABD;--yellow:#F4C542;--red:#D84B3E;--muted:#C9CBC5}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--paper);font-family:TA,"Arial Black",Arial,sans-serif;color:var(--ink)}
    .composition{position:relative;width:1920px;height:1080px;overflow:hidden;background-color:var(--paper);background-image:linear-gradient(rgba(17,20,19,.038) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.038) 2px,transparent 2px);background-size:64px 64px}
    .cover{position:absolute;inset:0;z-index:40;background:var(--paper)}.cover img{width:100%;height:100%;display:block;object-fit:cover}
    .scene{position:absolute;inset:0;visibility:hidden;opacity:0;padding:58px 72px 188px}.scene h1{position:relative;z-index:3;margin:0 auto;width:1776px;min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:${profile.visual.headlinePx}px;line-height:.99;letter-spacing:-1.5px;font-weight:900;-webkit-text-stroke:1px var(--ink);text-wrap:balance}
    .scene-body{height:700px;display:flex;align-items:center;justify-content:center;gap:92px}.agent-right .agent-wrap{order:2}.agent-right .core-wrap{order:1}.agent-left .agent-wrap{order:1}.agent-left .core-wrap{order:2}
    .agent-wrap{width:520px;height:640px;display:flex;align-items:flex-end;justify-content:center}.agent{width:480px;height:${profile.visual.agentElementHeightPx}px;object-fit:contain;filter:drop-shadow(0 15px 0 rgba(17,20,19,.08))}
    .core-wrap{width:570px;height:570px;display:flex;align-items:center;justify-content:center}.core-card{position:relative;width:${profile.visual.coreObjectPx}px;height:${profile.visual.coreObjectPx}px;border:10px solid var(--ink);border-radius:42px;background:var(--paper);box-shadow:18px 18px 0 rgba(17,20,19,.12);overflow:hidden}
    .context-stack{display:flex;align-items:center;justify-content:center;flex-direction:column}.context-stack img{width:430px;height:390px;object-fit:contain}.context-stack strong{position:absolute;bottom:28px;padding:12px 24px;border:6px solid var(--ink);border-radius:18px;background:var(--red);color:var(--paper);font-size:40px;letter-spacing:1px}
    .source-card{display:grid;grid-template-rows:auto 1fr auto;place-items:center;padding:22px}.source-card .source-name{font-size:52px;font-weight:900;color:var(--blue);letter-spacing:2px}.source-card img{width:240px;height:240px;object-fit:contain}.source-card strong{font-size:38px;padding:8px 16px;border-top:7px solid var(--yellow);text-align:center}
    .promise-card{display:grid;grid-template-rows:auto 152px auto auto;place-items:center;padding:12px 20px;gap:2px}.promise-source{font-size:38px;font-weight:900;color:var(--blue);letter-spacing:1px}.promise-card img{width:152px;height:152px;object-fit:contain}.promise-card>strong{font-size:34px;line-height:1.02;text-align:center}.save-label{padding:6px 14px;border:5px solid var(--ink);border-radius:16px;font-size:32px;line-height:1;font-weight:900;background:var(--paper)}
    .pack-card{display:grid;grid-template-columns:138px 1fr;align-items:center;padding:26px}.pack-card>img{width:138px;height:138px;object-fit:contain}.pack-lines{display:flex;flex-direction:column;gap:10px}.pack-lines span{display:flex;align-items:center;gap:14px;font-size:34px;font-weight:850;line-height:1.08}.pack-lines b{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border:4px solid var(--ink);border-radius:50%;background:var(--yellow);font-size:32px}
    .budget-device{display:grid;place-items:center}.budget-state{position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;place-items:center;padding:42px}.budget-state span{font-size:42px;font-weight:900}.budget-state strong{display:grid;place-items:center;width:300px;height:300px;border:34px solid var(--red);border-radius:50%;font-size:92px;background:var(--paper)}.budget-state i{width:320px;height:18px;border-radius:9px;background:linear-gradient(90deg,var(--red) 24%,var(--muted) 24%)}.state-focus,.state-retrieve{visibility:hidden;opacity:0}.state-focus strong{border-color:var(--yellow)}.state-focus i{background:linear-gradient(90deg,var(--yellow) 68%,var(--muted) 68%)}.state-retrieve strong{border-color:var(--blue)}.state-retrieve i{background:linear-gradient(90deg,var(--blue) 92%,var(--muted) 92%)}
    .decision-card{display:grid;grid-template-columns:110px 1fr;grid-template-rows:1fr auto;padding:22px;gap:8px 18px}.decision-card>img{width:110px;height:110px;object-fit:contain}.decision-lines{display:flex;flex-direction:column;justify-content:center;gap:8px}.decision-lines span{font-size:36px;font-weight:900;border-bottom:5px solid var(--muted);padding-bottom:4px}.decision-ready{grid-column:1/-1;justify-self:center;padding:8px 12px;border:5px solid var(--ink);border-radius:14px;font-size:32px;text-align:center;background:var(--paper)}
    .memory-card{display:grid;grid-template-rows:210px auto auto;place-items:center;padding:28px 30px 24px;gap:12px}.memory-card img{width:210px;height:210px;object-fit:contain}.memory-card strong{font-size:40px;line-height:1.04;text-align:center}.memory-card span{padding-top:10px;border-top:7px solid var(--yellow);font-size:32px;font-weight:900;text-align:center}
    .captions{position:absolute;z-index:30;left:100px;right:100px;bottom:28px;height:132px;display:grid;place-items:center}.caption-cue{position:absolute;visibility:hidden;opacity:0;max-width:1720px;padding:18px 32px 20px;border:${profile.visual.captionBorderPx}px solid var(--ink);border-radius:24px;background:rgba(236,236,234,.96);box-shadow:10px 10px 0 rgba(17,20,19,.12);font-size:${profile.visual.captionPx}px;line-height:1.14;font-weight:800;text-align:center;text-wrap:balance}
  </style>
</head>
<body>
  <div data-hf-id="hf-root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${timing.duration}" data-fps="30" id="composition" class="composition">
    ${sceneMarkup}
    <div data-hf-id="hf-captions" class="captions">${captionMarkup}</div>
    <div data-hf-id="hf-cover" id="cover" class="cover"><img src="assets/cover.png" alt="${esc(config.coverAlt)}"></div>
    <audio data-hf-id="hf-narration" id="narration" class="clip" data-start="0" data-duration="${timing.duration}" data-track-index="1" data-media-start="0" data-volume="1" src="audio/narration.${esc(config.locale)}.mp3"></audio>
  </div>
  <script>
    window.__timelines=window.__timelines||{};
    const tl=gsap.timeline({paused:true});
    ${sceneTimeline.join('\n    ')}
    ${captionTimeline.join('\n    ')}
    window.__timelines.main=tl;
  </script>
</body>
</html>`;
}

async function compile() {
  assertProductionProfile();
  ensureDirs();
  for (const file of ['timing-map.json', 'captions/cues.json', 'animation-plan.json']) {
    if (!existsSync(path.join(projectDir, file))) throw new Error(`Run --tts first; missing ${file}`);
  }
  const timing = JSON.parse(readFileSync(path.join(projectDir, 'timing-map.json'), 'utf8'));
  const cues = JSON.parse(readFileSync(path.join(projectDir, 'captions/cues.json'), 'utf8'));
  const animation = JSON.parse(readFileSync(path.join(projectDir, 'animation-plan.json'), 'utf8'));
  const scenePlan = JSON.parse(readFileSync(path.join(projectDir, 'scene-plan.json'), 'utf8'));
  const assetsModule = await import(pathToFileURL(path.join(rootDir, 'scripts/ai-video-pipeline/hyperframes/tiny-agent-assets.mjs')).href);
  const pack = assetsModule.loadTinyAgentAssetPack({ packRoot: path.join(projectDir, 'assets/pack'), requirePass: true });
  assetsModule.assertTinyAgentScenePlanAssets(scenePlan, pack, { requireDirectionMetadata: true });
  writeFileSync(path.join(projectDir, 'index.html'), `${renderHtml(timing, cues, animation, scenePlan)}\n`);
  writeFileSync(path.join(projectDir, 'assets-manifest.json'), `${JSON.stringify({ pack: pack.index.id, status: pack.index.status, assets: scenePlan.chapters.flatMap((c) => c.scenes).map((s) => ({ sceneId: s.id, agent: s.agent, props: s.props })) }, null, 2)}\n`);
}

const mode = process.argv[2] || '--all';
if (mode === '--tts' || mode === '--all') generateTts();
if (mode === '--compile' || mode === '--all') await compile();
