import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const POSE_PACK_PATH = path.join(SCRIPT_DIR, 'pose-packs', 'tiny-agent-v1.json');
const ACTION_TYPES = new Set(['pose', 'fly', 'plug', 'store']);

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function safeId(value) {
  return String(value).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function validatePlan(plan, posePack) {
  invariant(plan?.version === 1, 'animation plan version must be 1');
  invariant(Number.isFinite(plan.duration) && plan.duration > 0, 'duration must be positive');
  invariant(typeof plan.audio === 'string' && plan.audio.length > 0, 'audio is required');
  invariant(Array.isArray(plan.scenes) && plan.scenes.length > 0, 'at least one scene is required');

  let previousEnd = 0;
  const sceneIds = new Set();
  for (const scene of plan.scenes) {
    invariant(!sceneIds.has(scene.id), `duplicate scene id: ${scene.id}`);
    sceneIds.add(scene.id);
    invariant(scene.start >= previousEnd - 0.001, `scene ${scene.id} overlaps the previous scene`);
    invariant(scene.end > scene.start, `scene ${scene.id} has invalid timing`);
    invariant(scene.end <= plan.duration + 0.001, `scene ${scene.id} exceeds composition duration`);
    previousEnd = scene.end;

    for (const actor of ['human', 'agent']) {
      const poseName = scene.actors?.[actor];
      invariant(posePack.characters?.[actor]?.poses?.[poseName], `unknown ${actor} pose: ${poseName}`);
    }

    const actionIds = new Set();
    for (const action of scene.actions ?? []) {
      invariant(ACTION_TYPES.has(action.type), `unknown action type: ${action.type}`);
      invariant(!actionIds.has(action.id), `duplicate action id in ${scene.id}: ${action.id}`);
      actionIds.add(action.id);
      invariant(action.at >= 0, `action ${action.id} starts before its scene`);
      invariant(action.at + action.duration <= scene.end - scene.start + 0.001, `action ${action.id} exceeds scene ${scene.id}`);
      if (action.type === 'pose') {
        const actorPoses = posePack.characters?.[action.actor]?.poses;
        invariant(actorPoses?.[action.from], `unknown pose ${action.actor}.${action.from}`);
        invariant(actorPoses?.[action.to], `unknown pose ${action.actor}.${action.to}`);
      } else {
        for (const key of ['from', 'to']) {
          invariant(Array.isArray(action[key]) && action[key].length === 2, `${action.id}.${key} must be a point`);
        }
        if (action.type === 'fly') {
          invariant(Array.isArray(action.via) && action.via.length === 2, `${action.id}.via must be a point`);
        }
      }
    }
  }
  invariant(Math.abs(previousEnd - plan.duration) < 0.01, 'last scene must end at composition duration');
}

function posesForScene(scene, actor) {
  const poses = new Set([scene.actors[actor]]);
  for (const action of scene.actions) {
    if (action.type === 'pose' && action.actor === actor) {
      poses.add(action.from);
      poses.add(action.to);
    }
  }
  return [...poses];
}

function renderPoseState(scene, actor, poseName, posePack) {
  const actorDef = posePack.characters[actor];
  const pose = actorDef.poses[poseName];
  const crop = pose.crop;
  const slot = actorDef.slot;
  const scale = Math.min(slot.width / crop.width, slot.height / crop.height);
  const scaledWidth = crop.width * scale;
  const scaledHeight = crop.height * scale;
  const left = (slot.width - scaledWidth) / 2;
  const top = slot.height - scaledHeight;
  const initialOpacity = scene.actors[actor] === poseName ? 1 : 0;
  const id = `${safeId(scene.id)}-pose-${actor}-${safeId(poseName)}`;

  return `
            <div id="${id}" class="pose-state" data-actor="${actor}" data-pose="${escapeHtml(poseName)}" style="opacity:${initialOpacity}">
              <div class="pose-crop" data-layout-allow-overflow="" data-layout-allow-occlusion="" aria-label="${actor} ${escapeHtml(poseName)} pose" style="left:${left.toFixed(2)}px;top:${top.toFixed(2)}px;width:${crop.width}px;height:${crop.height}px;transform:scale(${scale.toFixed(5)});background-image:url('assets/source/${escapeHtml(pose.src)}');background-position:-${crop.x}px -${crop.y}px"></div>
            </div>`;
}

function renderActor(scene, actor, posePack) {
  const slot = posePack.characters[actor].slot;
  const states = posesForScene(scene, actor)
    .map((poseName) => renderPoseState(scene, actor, poseName, posePack))
    .join('');
  return `
          <div id="${safeId(scene.id)}-${actor}-slot" class="actor-slot actor-${actor}" style="left:${slot.x}px;top:${slot.y}px;width:${slot.width}px;height:${slot.height}px">
            ${states}
          </div>`;
}

function lineGeometry(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return {
    width: Math.hypot(dx, dy),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function renderAction(action, scene) {
  const prefix = `${safeId(scene.id)}-${safeId(action.id)}`;
  if (action.type === 'pose') return '';

  if (action.type === 'fly') {
    return `
          <div id="${prefix}" class="action-prop doc-card accent-${escapeHtml(action.accent ?? 'ink')}" style="left:${action.from[0]}px;top:${action.from[1]}px">
            <span>${escapeHtml(action.label)}</span><i></i><i></i><i></i>
          </div>`;
  }

  if (action.type === 'plug') {
    const line = lineGeometry(action.from, action.to);
    const result = action.result
      ? `<div id="${prefix}-result" class="result-chip" style="left:${Math.max(action.to[0] - 40, 300)}px;top:${Math.max(action.to[1] - 94, 56)}px">${escapeHtml(action.result)}</div>`
      : '';
    return `
          <div id="${prefix}-wire" class="connector" style="left:${action.from[0] + 22}px;top:${action.from[1] + 28}px;width:${line.width}px;transform:rotate(${line.angle.toFixed(3)}deg) scaleX(0)"></div>
          <div id="${prefix}" class="action-prop tool-chip" style="left:${action.from[0]}px;top:${action.from[1]}px">
            <b></b><span>${escapeHtml(action.label)}</span><i></i>
          </div>
          ${result}`;
  }

  const result = action.result
    ? `<div id="${prefix}-result" class="result-chip state-result">${escapeHtml(action.result)}</div>`
    : '';
  return `
          <div id="${prefix}" class="action-prop memory-card" data-layout-allow-overlap="" style="left:${action.from[0]}px;top:${action.from[1]}px">
            <span>${escapeHtml(action.label)}</span>
          </div>
          ${result}`;
}

function renderTemplateDecor(scene) {
  const id = safeId(scene.id);
  if (scene.template === 'augment') {
    return `<div class="port-dot" style="left:590px;top:338px"></div>`;
  }
  if (scene.template === 'retrieve') {
    return `
          <div class="paper-stack"><i></i><i></i><i></i></div>
          <div class="target-ring" style="left:465px;top:330px"></div>`;
  }
  if (scene.template === 'tools') {
    return `<div class="tool-port" style="left:575px;top:405px"><i></i></div>`;
  }
  return `
          <div id="${id}-memory-bank" class="memory-bank">
            <div class="memory-slots"><i></i><i></i><i></i></div>
          </div>`;
}

function renderScene(scene, index, posePack) {
  const actions = scene.actions.map((action) => renderAction(action, scene)).join('');
  return `
      <section id="scene-${safeId(scene.id)}" class="scene${index === 0 ? ' is-first' : ''}" data-scene-id="${escapeHtml(scene.id)}">
        <div class="stage">
          <div class="scene-title"><span></span>${escapeHtml(scene.title)}</div>
          ${renderTemplateDecor(scene)}
          ${renderActor(scene, 'human', posePack)}
          ${renderActor(scene, 'agent', posePack)}
          ${actions}
        </div>
        <div class="caption-box"><div class="caption">${escapeHtml(scene.caption)}</div></div>
      </section>`;
}

function actionTimeline(scene, action) {
  const prefix = `${safeId(scene.id)}-${safeId(action.id)}`;
  const start = scene.start + action.at;
  const duration = action.duration;
  const agentSlot = `#${safeId(scene.id)}-agent-slot`;

  if (action.type === 'pose') {
    const from = `#${safeId(scene.id)}-pose-${action.actor}-${safeId(action.from)}`;
    const to = `#${safeId(scene.id)}-pose-${action.actor}-${safeId(action.to)}`;
    return `
      tl.to(${JSON.stringify(from)}, { opacity: 0, x: -16, duration: ${(duration * 0.48).toFixed(3)}, ease: "power2.in" }, ${start.toFixed(3)});
      tl.fromTo(${JSON.stringify(to)}, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: ${(duration * 0.6).toFixed(3)}, ease: "power3.out", immediateRender: false }, ${(start + duration * 0.28).toFixed(3)});`;
  }

  if (action.type === 'fly') {
    const travelDuration = Math.max(0.1, duration - 0.16);
    const dx1 = action.via[0] - action.from[0];
    const dy1 = action.via[1] - action.from[1];
    const dx2 = action.to[0] - action.from[0];
    const dy2 = action.to[1] - action.from[1];
    return `
      tl.fromTo("#${prefix}", { opacity: 0, scale: 0.72, rotation: -8 }, { opacity: 1, scale: 1, rotation: -2, duration: 0.16, ease: "back.out(1.5)", immediateRender: false }, ${start.toFixed(3)});
      tl.to("#${prefix}", { keyframes: [
        { x: ${dx1.toFixed(2)}, y: ${dy1.toFixed(2)}, rotation: 5, duration: ${(travelDuration * 0.5).toFixed(3)}, ease: "power2.out" },
        { x: ${dx2.toFixed(2)}, y: ${dy2.toFixed(2)}, rotation: 0, scale: 0.82, duration: ${(travelDuration * 0.5).toFixed(3)}, ease: "power3.inOut" }
      ], ease: "none" }, ${(start + 0.16).toFixed(3)});
      tl.to(${JSON.stringify(agentSlot)}, { scale: 1.035, duration: 0.12, repeat: 1, yoyo: true, ease: "power2.inOut" }, ${(start + duration - 0.05).toFixed(3)});`;
  }

  if (action.type === 'plug') {
    const travelDuration = Math.max(0.1, duration - 0.18);
    const dx = action.to[0] - action.from[0];
    const dy = action.to[1] - action.from[1];
    const result = action.result
      ? `\n      tl.fromTo("#${prefix}-result", { opacity: 0, scale: 0.72, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: "back.out(1.5)", immediateRender: false }, ${(start + duration + 0.12).toFixed(3)});`
      : '';
    return `
      tl.fromTo("#${prefix}", { opacity: 0, scale: 0.68 }, { opacity: 1, scale: 1, duration: 0.18, ease: "back.out(1.5)", immediateRender: false }, ${start.toFixed(3)});
      tl.to("#${prefix}", { x: ${dx.toFixed(2)}, y: ${dy.toFixed(2)}, duration: ${travelDuration.toFixed(3)}, ease: "power3.inOut" }, ${(start + 0.18).toFixed(3)});
      tl.fromTo("#${prefix}-wire", { scaleX: 0 }, { scaleX: 1, duration: ${(duration * 0.52).toFixed(3)}, ease: "power2.out", immediateRender: false }, ${(start + duration * 0.5).toFixed(3)});
      tl.to(${JSON.stringify(agentSlot)}, { scale: 1.045, duration: 0.12, repeat: 1, yoyo: true, ease: "power2.inOut" }, ${(start + duration).toFixed(3)});${result}`;
  }

  const travelDuration = Math.max(0.1, duration - 0.16);
  const dx = action.to[0] - action.from[0];
  const dy = action.to[1] - action.from[1];
  const bank = `#${safeId(scene.id)}-memory-bank`;
  const result = action.result
    ? `\n      tl.fromTo("#${prefix}-result", { opacity: 0, scale: 0.72, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)", immediateRender: false }, ${(start + duration + 0.14).toFixed(3)});`
    : '';
  return `
      tl.fromTo("#${prefix}", { opacity: 0, scale: 0.8, rotation: -5 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.16, ease: "back.out(1.4)", immediateRender: false }, ${start.toFixed(3)});
      tl.to("#${prefix}", { x: ${dx.toFixed(2)}, y: ${dy.toFixed(2)}, scale: 0.62, rotation: 2, duration: ${travelDuration.toFixed(3)}, ease: "power3.inOut" }, ${(start + 0.16).toFixed(3)});
      tl.to("#${prefix}", { opacity: 0.22, duration: 0.14, ease: "power2.out" }, ${(start + duration).toFixed(3)});
      tl.to(${JSON.stringify(bank)}, { scale: 1.035, duration: 0.13, repeat: 1, yoyo: true, ease: "power2.inOut" }, ${(start + duration - 0.04).toFixed(3)});${result}`;
}

function renderTimeline(plan) {
  const lines = [];
  lines.push('      tl.from(".brand", { y: -18, opacity: 0, duration: 0.42, ease: "power3.out" }, 0);');
  lines.push('      tl.from(".episode-title", { y: -16, opacity: 0, duration: 0.48, ease: "power3.out" }, 0.08);');

  plan.scenes.forEach((scene, index) => {
    const selector = `#scene-${safeId(scene.id)}`;
    if (index > 0) {
      const previous = `#scene-${safeId(plan.scenes[index - 1].id)}`;
      lines.push(`      tl.to(${JSON.stringify(previous)}, { opacity: 0, duration: 0.24, ease: "power2.in" }, ${(scene.start - 0.16).toFixed(3)});`);
      lines.push(`      tl.fromTo(${JSON.stringify(selector)}, { opacity: 0 }, { opacity: 1, duration: 0.34, ease: "power2.out", immediateRender: false }, ${scene.start.toFixed(3)});`);
    }
    lines.push(`      tl.from(${JSON.stringify(`${selector} .scene-title`)}, { x: -34, opacity: 0, duration: 0.42, ease: "power3.out", immediateRender: false }, ${(scene.start + 0.08).toFixed(3)});`);
    lines.push(`      tl.from(${JSON.stringify(`${selector} .scene-title span`)}, { scaleX: 0, duration: 0.38, ease: "power2.out", immediateRender: false }, ${(scene.start + 0.34).toFixed(3)});`);
    lines.push(`      tl.from(${JSON.stringify(`${selector} .actor-human`)}, { x: -24, opacity: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, ${(scene.start + 0.08).toFixed(3)});`);
    lines.push(`      tl.from(${JSON.stringify(`${selector} .actor-agent`)}, { x: 24, opacity: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, ${(scene.start + 0.14).toFixed(3)});`);
    lines.push(`      tl.from(${JSON.stringify(`${selector} .caption-box`)}, { y: 18, opacity: 0, duration: 0.34, ease: "power3.out", immediateRender: false }, ${(scene.start + 0.1).toFixed(3)});`);
    for (const action of scene.actions) lines.push(actionTimeline(scene, action));
  });

  return lines.join('\n');
}

function renderHtml(plan, posePack) {
  const scenes = plan.scenes.map((scene, index) => renderScene(scene, index, posePack)).join('\n');
  const timeline = renderTimeline(plan);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080, height=1920">
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      :root { --board:#fcfdfc; --ink:#111413; --blue:#1597ea; --red:#f04438; --line:#d9e1de; }
      * { box-sizing:border-box; margin:0; padding:0; }
      html, body { width:1080px; height:1920px; overflow:hidden; }
      body { color:var(--ink); font-family:"Montserrat", Arial, sans-serif; }
      #root { position:relative; width:1080px; height:1920px; overflow:hidden; }
      .board-fill { position:absolute; inset:0; background:var(--board); }
      .brand { position:absolute; top:58px; left:80px; z-index:40; color:var(--blue); font-size:34px; font-weight:900; letter-spacing:0; }
      .episode-title { position:absolute; top:118px; right:80px; left:80px; z-index:40; padding-bottom:22px; border-bottom:4px solid var(--ink); font-size:64px; font-weight:900; line-height:1.02; letter-spacing:0; }
      .episode-title::after { position:absolute; bottom:-10px; left:0; width:168px; height:16px; content:""; background:var(--blue); opacity:.28; }
      .scene { position:absolute; inset:0; z-index:10; width:1080px; height:1920px; opacity:0; }
      .scene.is-first { opacity:1; }
      .stage { position:absolute; top:300px; left:80px; width:920px; height:810px; overflow:hidden; border-bottom:4px solid var(--line); background:var(--board); }
      .scene-title { position:absolute; top:14px; left:18px; z-index:24; font-family:"IBM Plex Mono", monospace; font-size:42px; font-weight:700; letter-spacing:0; }
      .scene-title span { display:inline-block; width:54px; height:10px; margin:0 18px 7px 0; background:var(--blue); transform-origin:left center; }
      .actor-slot { position:absolute; z-index:10; transform-origin:center bottom; }
      .pose-state { position:absolute; inset:0; overflow:visible; }
      .pose-crop { position:absolute; overflow:hidden; background-size:1080px 1920px; background-repeat:no-repeat; mix-blend-mode:multiply; transform-origin:top left; }
      .caption-box { position:absolute; top:1130px; left:80px; z-index:28; display:flex; width:920px; height:300px; align-items:center; justify-content:center; border:7px solid var(--ink); border-radius:8px; background:var(--board); }
      .caption { max-width:800px; text-align:center; font-family:"IBM Plex Mono", monospace; font-size:50px; font-weight:700; line-height:1.24; letter-spacing:0; }
      .action-prop { position:absolute; z-index:18; opacity:0; transform-origin:center; }
      .doc-card { display:flex; width:136px; height:104px; flex-direction:column; gap:8px; border:5px solid var(--ink); border-radius:5px; padding:12px 14px; background:var(--board); box-shadow:9px 9px 0 rgba(17,20,19,.08); }
      .doc-card span { font-family:"IBM Plex Mono", monospace; font-size:22px; font-weight:700; }
      .doc-card i { display:block; width:100%; height:6px; background:var(--line); }
      .doc-card i:last-child { width:66%; }
      .doc-card.accent-blue { border-color:var(--blue); }
      .doc-card.accent-red { border-color:var(--red); }
      .tool-chip { display:flex; min-width:162px; height:66px; align-items:center; gap:12px; border:5px solid var(--ink); border-radius:7px; padding:0 18px; background:var(--board); font-family:"IBM Plex Mono", monospace; font-size:23px; font-weight:700; white-space:nowrap; }
      .tool-chip b { width:17px; height:17px; border-radius:50%; background:var(--blue); }
      .tool-chip i { position:absolute; right:-19px; width:20px; height:28px; border-top:5px solid var(--ink); border-right:5px solid var(--ink); border-bottom:5px solid var(--ink); border-radius:0 4px 4px 0; }
      .connector { position:absolute; z-index:7; height:5px; border-radius:3px; background:var(--ink); transform-origin:left center; opacity:.72; }
      .connector::after { position:absolute; top:-5px; right:-7px; width:12px; height:12px; border:4px solid var(--blue); border-radius:50%; content:""; background:var(--board); }
      .result-chip { position:absolute; z-index:25; min-width:170px; border:5px solid var(--blue); border-radius:7px; padding:15px 18px; color:var(--ink); background:var(--board); font-family:"IBM Plex Mono", monospace; font-size:22px; font-weight:700; opacity:0; text-align:center; }
      .state-result { top:220px; left:380px; border-color:var(--blue); }
      .memory-card { display:grid; width:150px; height:82px; place-items:center; border:5px solid var(--ink); border-radius:5px; background:var(--board); box-shadow:7px 7px 0 rgba(17,20,19,.08); font-family:"IBM Plex Mono", monospace; font-size:20px; font-weight:700; }
      .memory-bank { position:absolute; top:355px; left:370px; z-index:8; width:225px; height:205px; border:6px solid var(--ink); border-radius:7px; background:var(--board); transform-origin:center; }
      .memory-bank::before { position:absolute; top:55px; right:-18px; left:-18px; height:88px; border:6px solid var(--ink); border-radius:6px; content:""; background:var(--board); }
      .memory-slots { position:absolute; top:76px; left:30px; z-index:3; display:flex; gap:13px; }
      .memory-slots i { width:43px; height:48px; border:4px solid var(--blue); border-radius:3px; background:var(--board); }
      .port-dot { position:absolute; z-index:15; width:27px; height:27px; border:5px solid var(--ink); border-radius:50%; background:var(--blue); }
      .paper-stack { position:absolute; top:635px; left:355px; z-index:5; width:180px; height:105px; }
      .paper-stack i { position:absolute; inset:0; border:5px solid var(--ink); border-radius:5px; background:var(--board); }
      .paper-stack i:nth-child(1) { transform:rotate(-8deg); }
      .paper-stack i:nth-child(2) { transform:rotate(6deg); }
      .paper-stack i:nth-child(3) { transform:translateY(-12px); }
      .target-ring { position:absolute; z-index:6; width:165px; height:165px; border:8px dashed var(--blue); border-radius:50%; opacity:.28; }
      .tool-port { position:absolute; z-index:8; width:58px; height:58px; border:6px solid var(--ink); border-radius:50%; background:var(--board); }
      .tool-port i { position:absolute; inset:12px; border-radius:50%; background:var(--blue); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${plan.duration}" data-width="1080" data-height="1920">
      <div class="board-fill"></div>
      <div class="brand">Tiny Agent</div>
      <h1 class="episode-title">Augmented LLM First</h1>
${scenes}
      <audio id="narration" class="clip" data-start="0" data-duration="${plan.duration}" data-track-index="10" data-media-start="0" data-volume="1" src="${escapeHtml(plan.audio)}"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${timeline}
      window.__timelines.main = tl;
    </script>
  </body>
</html>
`;
}

async function main() {
  const project = path.resolve(readArg('--project', process.cwd()));
  const planPath = path.join(project, 'animation-plan.json');
  const outputPath = path.join(project, 'index.html');
  const [plan, posePack] = await Promise.all([
    readFile(planPath, 'utf8').then(JSON.parse),
    readFile(POSE_PACK_PATH, 'utf8').then(JSON.parse),
  ]);

  validatePlan(plan, posePack);
  await writeFile(outputPath, renderHtml(plan, posePack), 'utf8');
  await writeFile(path.join(project, 'pose-pack.json'), `${JSON.stringify(posePack, null, 2)}\n`, 'utf8');
  process.stdout.write(`built ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
