import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(projectDir, '../../..');
const config = JSON.parse(readFileSync(path.join(projectDir, 'sample-config.json'), 'utf8'));

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
  ensureDirs();
  const resolvedSegments = [];
  const allCues = [];
  for (const segment of config.segments) {
    const placedStart = segment.audioStart ?? segment.start;
    const audioFile = path.join(projectDir, 'audio/segments', `${segment.id}.mp3`);
    const vttFile = path.join(projectDir, 'captions/segments', `${segment.id}.vtt`);
    run('uvx', ['edge-tts', '--voice', config.voice, '--rate', config.rate, '--text', segment.text, '--write-media', audioFile, '--write-subtitles', vttFile]);
    const duration = mediaDuration(audioFile);
    const localCues = parseVtt(vttFile);
    const localCueEnd = localCues.at(-1)?.end ?? duration;
    if (placedStart + localCueEnd > segment.end + 0.35) {
      throw new Error(`${segment.id} VTT ends at ${(placedStart + localCueEnd).toFixed(3)}s but its slot ends at ${segment.end.toFixed(3)}s`);
    }
    const cues = localCues.map((cue) => ({
      start: cue.start + placedStart,
      end: Math.min(config.duration, cue.end + placedStart),
      text: cue.text,
      segmentId: segment.id
    }));
    allCues.push(...cues);
    resolvedSegments.push({
      ...segment,
      audioStart: placedStart,
      audioDuration: Number(duration.toFixed(3)),
      spokenStart: Number((cues[0]?.start ?? placedStart).toFixed(3)),
      spokenEnd: Number((cues.at(-1)?.end ?? Math.min(config.duration, placedStart + duration)).toFixed(3)),
      gapAfterSpeech: Number((segment.end - (cues.at(-1)?.end ?? Math.min(config.duration, placedStart + duration))).toFixed(3))
    });
  }

  const ffmpegArgs = ['-y', '-f', 'lavfi', '-t', String(config.duration), '-i', 'anullsrc=r=48000:cl=stereo'];
  for (const segment of config.segments) ffmpegArgs.push('-i', path.join('audio/segments', `${segment.id}.mp3`));
  const delayed = config.segments.map((segment, index) => {
    const placedStart = segment.audioStart ?? segment.start;
    return `[${index + 1}:a]aresample=48000,adelay=${Math.round(placedStart * 1000)}|${Math.round(placedStart * 1000)}[s${index}]`;
  });
  const mixInputs = ['[0:a]', ...config.segments.map((_, index) => `[s${index}]`)].join('');
  const filter = `${delayed.join(';')};${mixInputs}amix=inputs=${config.segments.length + 1}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-17:LRA=7:TP=-1.5[out]`;
  const localizedNarration = path.join('audio', `narration.${config.locale}.mp3`);
  ffmpegArgs.push('-filter_complex', filter, '-map', '[out]', '-t', String(config.duration), '-c:a', 'libmp3lame', '-b:a', '192k', localizedNarration);
  run('ffmpeg', ffmpegArgs);
  copyFileSync(path.join(projectDir, localizedNarration), path.join(projectDir, 'audio', 'narration.mp3'));

  allCues.sort((a, b) => a.start - b.start);
  const vtt = ['WEBVTT', '', ...allCues.flatMap((cue, index) => [String(index + 1), `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`, cue.text, ''])].join('\n');
  writeFileSync(path.join(projectDir, 'captions/narration.vtt'), `${vtt}\n`);
  writeFileSync(path.join(projectDir, 'captions/cues.json'), `${JSON.stringify(allCues, null, 2)}\n`);

  const checkpoints = {
    coverFirstFrame: 0,
    coverHardCut: 0.8,
    firstSentenceEnd: resolvedSegments[0].spokenEnd,
    authorityStart: resolvedSegments[1].spokenStart,
    authorityEnd: resolvedSegments[1].spokenEnd,
    benefitEnd: resolvedSegments[2].spokenEnd,
    artifactStart: resolvedSegments[3].spokenStart,
    explanationStart: resolvedSegments[4].spokenStart,
    finalSpeechEnd: resolvedSegments.at(-1).spokenEnd
  };
  const timing = {
    locale: config.locale,
    duration: config.duration,
    voice: config.voice,
    rate: config.rate,
    source: 'final edge-tts audio and VTT',
    segments: resolvedSegments,
    checkpoints,
    requiredSnapshotTimes: [0, 2, 5, 12, 20, 30, 45, 58]
  };
  writeFileSync(path.join(projectDir, 'timing-map.json'), `${JSON.stringify(timing, null, 2)}\n`);
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
  if (sceneId === 'hook') return `<div class="core-card context-stack"><img src="${propSrc('document-stack')}" alt=""><strong>HIGH SIGNAL?</strong></div>`;
  if (sceneId === 'authority') return `<div class="core-card source-card"><span class="source-name">${esc(l.source)}</span><img src="${propSrc('document')}" alt=""><strong>${esc(l.sourceConclusion)}</strong></div>`;
  if (sceneId === 'stakes') return `<div class="core-card stakes-card"><img src="${propSrc('target')}" alt=""><strong>${esc(l.stakes)}</strong><span class="benefit-label">${esc(l.benefit)}</span></div>`;
  if (sceneId === 'artifact') return `<div class="core-card pack-card"><img src="${propSrc('package')}" alt=""><div class="pack-lines">${l.pack.map((item, index) => `<span><b>${index + 1}</b>${esc(item)}</span>`).join('')}</div></div>`;
  if (sceneId === 'budget') return `<div class="core-card budget-device"><div class="budget-state state-raw"><span>${esc(l.budgetRaw)}</span><strong>24%</strong><i></i></div><div class="budget-state state-focus"><span>${esc(l.budgetFocused)}</span><strong>68%</strong><i></i></div><div class="budget-state state-retrieve"><span>${esc(l.budgetRetrieve)}</span><strong>92%</strong><i></i></div></div>`;
  return `<div class="core-card decision-card"><img src="${propSrc('task-list')}" alt=""><div class="decision-lines">${l.decision.map((item) => `<span>${esc(item)}</span>`).join('')}</div><strong class="decision-ready">${esc(l.decisionReady)}</strong></div>`;
}

function renderHtml(timing, cues, animation, scenePlan) {
  const scenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  const sceneMarkup = scenes.map((scene, index) => {
    const side = ['hook', 'stakes', 'artifact', 'decision'].includes(scene.id) ? 'agent-right' : 'agent-left';
    return `<section data-hf-id="hf-scene-${scene.id}" id="scene-${scene.id}" class="scene ${side} ${index === 0 ? 'scene-first' : ''}"><h1>${esc(config.headlines[scene.id])}</h1><div class="scene-body"><div class="agent-wrap"><img class="agent" src="${agentSrc(scene.agent)}" alt="Tiny Agent"></div><div class="core-wrap">${renderCore(scene.id)}</div></div></section>`;
  }).join('');
  const captionMarkup = cues.map((cue, index) => `<div data-hf-id="hf-caption-${index + 1}" id="caption-${index + 1}" class="caption-cue">${esc(cue.text)}</div>`).join('');

  const sceneTimeline = [];
  scenes.forEach((scene, index) => {
    const side = ['hook', 'stakes', 'artifact', 'decision'].includes(scene.id) ? 'agent-right' : 'agent-left';
    if (index === 0) {
      sceneTimeline.push(`tl.set("#scene-${scene.id}", { autoAlpha: 1 }, 0);`);
    } else {
      const previous = scenes[index - 1];
      sceneTimeline.push(`tl.set("#scene-${previous.id}", { autoAlpha: 0 }, ${scene.start.toFixed(3)});`);
      sceneTimeline.push(`tl.set("#scene-${scene.id}", { autoAlpha: 1 }, ${scene.start.toFixed(3)});`);
    }
    const introAt = scene.id === 'hook' ? 0.8 : scene.start;
    sceneTimeline.push(`tl.fromTo("#scene-${scene.id} h1", { x: 42 }, { x: 0, duration: 0.38, ease: "power3.out" }, ${introAt.toFixed(3)});`);
    sceneTimeline.push(`tl.fromTo("#scene-${scene.id} .agent", { y: 10 }, { y: 0, duration: 0.42, ease: "power2.out" }, ${introAt.toFixed(3)});`);
    sceneTimeline.push(`tl.fromTo("#scene-${scene.id} .core-card", { x: ${side === 'agent-right' ? -34 : 34} }, { x: 0, duration: 0.42, ease: "power2.out" }, ${introAt.toFixed(3)});`);
  });
  const beatMap = Object.fromEntries(animation.beats.map((beat) => [beat.id, beat.resolvedStart]));
  sceneTimeline.push(`tl.set("#cover", { autoAlpha: 0 }, 0.800);`);
  sceneTimeline.push(`tl.to("#scene-stakes .benefit-label", { backgroundColor: "#F4C542", duration: 0.28, ease: "power2.out" }, ${Number(beatMap.benefit).toFixed(3)});`);
  sceneTimeline.push(`tl.to("#scene-artifact .pack-card", { scale: 1.05, duration: 0.28, yoyo: true, repeat: 1, ease: "power2.inOut" }, ${Math.max(25, Number(beatMap['artifact-preview']) + 2).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-raw", { autoAlpha: 0 }, ${Number(beatMap['budget-focus']).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-focus", { autoAlpha: 1 }, ${Number(beatMap['budget-focus']).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-focus", { autoAlpha: 0 }, ${Number(beatMap['budget-retrieve']).toFixed(3)});`);
  sceneTimeline.push(`tl.set("#scene-budget .state-retrieve", { autoAlpha: 1 }, ${Number(beatMap['budget-retrieve']).toFixed(3)});`);
  sceneTimeline.push(`tl.to("#scene-decision .decision-ready", { backgroundColor: "#F4C542", scale: 1.04, duration: 0.32, ease: "power2.out" }, ${Number(beatMap['decision-ready']).toFixed(3)});`);
  const captionTimeline = cues.flatMap((cue, index) => [
    `tl.set("#caption-${index + 1}", { autoAlpha: 1, y: 0 }, ${cue.start.toFixed(3)});`,
    `tl.set("#caption-${index + 1}", { autoAlpha: 0 }, ${cue.end.toFixed(3)});`
  ]);

  return `<!doctype html>
<html lang="${esc(config.locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(config.topic)} Retention Sample</title>
  <script src="assets/vendor/gsap.min.js"></script>
  <style>
    @font-face{font-family:TA;src:url("assets/fonts/HiraginoSansGB.ttc") format("truetype");font-weight:100 900}
    :root{--paper:#ECECEA;--ink:#111413;--blue:#117ABD;--yellow:#F4C542;--red:#D84B3E;--muted:#C9CBC5}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--paper);font-family:TA,"Arial Black",Arial,sans-serif;color:var(--ink)}
    .composition{position:relative;width:1920px;height:1080px;overflow:hidden;background-color:var(--paper);background-image:linear-gradient(rgba(17,20,19,.038) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.038) 2px,transparent 2px);background-size:64px 64px}
    .cover{position:absolute;inset:0;z-index:40;background:var(--paper)}.cover img{width:100%;height:100%;display:block;object-fit:cover}
    .scene{position:absolute;inset:0;visibility:hidden;opacity:0;padding:58px 72px 188px}.scene h1{position:relative;z-index:3;margin:0 auto;width:1776px;min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:82px;line-height:1.03;letter-spacing:-2px;font-weight:900;text-wrap:balance}
    .scene-body{height:700px;display:flex;align-items:center;justify-content:center;gap:92px}.agent-right .agent-wrap{order:2}.agent-right .core-wrap{order:1}.agent-left .agent-wrap{order:1}.agent-left .core-wrap{order:2}
    .agent-wrap{width:520px;height:640px;display:flex;align-items:flex-end;justify-content:center}.agent{width:480px;height:620px;object-fit:contain;filter:drop-shadow(0 15px 0 rgba(17,20,19,.08))}
    .core-wrap{width:570px;height:570px;display:flex;align-items:center;justify-content:center}.core-card{position:relative;width:480px;height:480px;border:10px solid var(--ink);border-radius:42px;background:var(--paper);box-shadow:18px 18px 0 rgba(17,20,19,.12);overflow:hidden}
    .context-stack{display:flex;align-items:center;justify-content:center;flex-direction:column}.context-stack img{width:430px;height:390px;object-fit:contain}.context-stack strong{position:absolute;bottom:28px;padding:12px 24px;border:6px solid var(--ink);border-radius:18px;background:var(--red);color:var(--paper);font-size:40px;letter-spacing:1px}
    .source-card{display:grid;grid-template-rows:auto 1fr auto;place-items:center;padding:22px}.source-card .source-name{font-size:52px;font-weight:900;color:var(--blue);letter-spacing:2px}.source-card img{width:240px;height:240px;object-fit:contain}.source-card strong{font-size:38px;padding:8px 16px;border-top:7px solid var(--yellow);text-align:center}
    .stakes-card{display:grid;grid-template-rows:1fr auto auto;place-items:center;padding:20px}.stakes-card img{width:220px;height:220px;object-fit:contain;filter:saturate(.75)}.stakes-card>strong{font-size:36px;line-height:1.05;text-align:center;color:var(--red)}.benefit-label{margin-top:6px;padding:6px 16px;border:5px solid var(--ink);border-radius:16px;font-size:32px;font-weight:900;background:var(--paper)}
    .pack-card{display:grid;grid-template-columns:138px 1fr;align-items:center;padding:26px}.pack-card>img{width:138px;height:138px;object-fit:contain}.pack-lines{display:flex;flex-direction:column;gap:10px}.pack-lines span{display:flex;align-items:center;gap:14px;font-size:34px;font-weight:850;line-height:1.08}.pack-lines b{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border:4px solid var(--ink);border-radius:50%;background:var(--yellow);font-size:32px}
    .budget-device{display:grid;place-items:center}.budget-state{position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;place-items:center;padding:42px}.budget-state span{font-size:42px;font-weight:900}.budget-state strong{display:grid;place-items:center;width:300px;height:300px;border:34px solid var(--red);border-radius:50%;font-size:92px;background:var(--paper)}.budget-state i{width:320px;height:18px;border-radius:9px;background:linear-gradient(90deg,var(--red) 24%,var(--muted) 24%)}.state-focus,.state-retrieve{visibility:hidden;opacity:0}.state-focus strong{border-color:var(--yellow)}.state-focus i{background:linear-gradient(90deg,var(--yellow) 68%,var(--muted) 68%)}.state-retrieve strong{border-color:var(--blue)}.state-retrieve i{background:linear-gradient(90deg,var(--blue) 92%,var(--muted) 92%)}
    .decision-card{display:grid;grid-template-columns:110px 1fr;grid-template-rows:1fr auto;padding:22px;gap:8px 18px}.decision-card>img{width:110px;height:110px;object-fit:contain}.decision-lines{display:flex;flex-direction:column;justify-content:center;gap:8px}.decision-lines span{font-size:36px;font-weight:900;border-bottom:5px solid var(--muted);padding-bottom:4px}.decision-ready{grid-column:1/-1;justify-self:center;padding:8px 12px;border:5px solid var(--ink);border-radius:14px;font-size:32px;text-align:center;background:var(--paper)}
    .captions{position:absolute;z-index:30;left:100px;right:100px;bottom:28px;height:132px;display:grid;place-items:center}.caption-cue{position:absolute;visibility:hidden;opacity:0;max-width:1720px;padding:18px 32px 20px;border:6px solid var(--ink);border-radius:24px;background:rgba(236,236,234,.96);box-shadow:10px 10px 0 rgba(17,20,19,.12);font-size:46px;line-height:1.14;font-weight:800;text-align:center;text-wrap:balance}
  </style>
</head>
<body>
  <div data-hf-id="hf-root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="60" data-fps="30" id="composition" class="composition">
    ${sceneMarkup}
    <div data-hf-id="hf-captions" class="captions">${captionMarkup}</div>
    <div data-hf-id="hf-cover" id="cover" class="cover"><img src="assets/cover.png" alt="${esc(config.coverAlt)}"></div>
    <audio data-hf-id="hf-narration" id="narration" class="clip" data-start="0" data-duration="${config.duration}" data-track-index="1" data-media-start="0" data-volume="1" src="audio/narration.${esc(config.locale)}.mp3"></audio>
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
