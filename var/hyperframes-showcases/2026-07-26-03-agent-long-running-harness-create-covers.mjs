import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = '/Users/bytedance/Documents/postiz-app';
const enProject = path.join(root, 'var/hyperframes-showcases/2026-07-26-03-agent-long-running-harness-longform-en-US');
const zhProject = path.join(root, 'var/hyperframes-showcases/2026-07-26-03-agent-long-running-harness-longform-zh-CN');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\\n${result.stderr || result.stdout}`);
}

function makeGrid(width, height) {
  return `<defs><pattern id="paper-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0L0 0 0 48" fill="none" stroke="#111413" stroke-width="1" opacity="0.035"/></pattern></defs><rect width="${width}" height="${height}" fill="#ECECEA"/><rect width="${width}" height="${height}" fill="url(#paper-grid)"/>`;
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function prepareSharedAssets(projectDir) {
  const thumbnails = path.join(projectDir, 'thumbnails');
  const pack = path.join(projectDir, 'assets/pack/sprites');
  mkdirSync(thumbnails, { recursive: true });
  const agentSource = path.join(pack, 'agent/handoff-left.png');
  const agentAsset = path.join(thumbnails, 'stable-agent.handoff.trimmed.png');
  const topicSource = path.join(pack, 'props/handoff.png');
  const topicAsset = path.join(thumbnails, 'topic-object.handoff.png');
  run('magick', [agentSource, '-trim', '+repage', '-colorspace', 'sRGB', agentAsset]);
  copyFileSync(topicSource, topicAsset);
  return { thumbnails, agentSource, agentAsset, topicSource, topicAsset };
}

function svg16x9({ headline, second, third, agent, topic, locale }) {
  const font = locale === 'zh' ? 'Hiragino Sans GB, PingFang SC, sans-serif' : 'Arial Black, Arial, sans-serif';
  const sizes = locale === 'zh' ? [138, 164, 156] : [124, 114, 108];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="720" viewBox="0 0 1280 720">${makeGrid(1280, 720)}<image x="962" y="142" width="244" height="480" preserveAspectRatio="xMidYMid meet" xlink:href="${agent}"/><image x="720" y="358" width="232" height="232" preserveAspectRatio="xMidYMid meet" xlink:href="${topic}"/><rect x="44" y="42" width="176" height="14" rx="7" fill="#117ABD"/><rect x="44" y="652" width="675" height="18" rx="9" fill="#F4C542"/><g fill="#111413" stroke="#ECECEA" stroke-width="9" stroke-linejoin="round" paint-order="stroke" font-family="${font}" font-weight="900" letter-spacing="-4"><text x="42" y="170" font-size="${sizes[0]}"><tspan fill="#117ABD">AI Agent</tspan></text><text x="42" y="360" font-size="${sizes[1]}">${second}</text><text x="42" y="548" font-size="${sizes[2]}">${third}</text></g></svg>`;
}

function svg4x3({ agent, topic }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="900" viewBox="0 0 1200 900">${makeGrid(1200, 900)}<image x="874" y="152" width="252" height="610" preserveAspectRatio="xMidYMid meet" xlink:href="${agent}"/><image x="642" y="470" width="220" height="220" preserveAspectRatio="xMidYMid meet" xlink:href="${topic}"/><rect x="38" y="28" width="176" height="14" rx="7" fill="#117ABD"/><rect x="38" y="882" width="624" height="18" rx="9" fill="#F4C542"/><g fill="#111413" stroke="#ECECEA" stroke-width="9" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-4"><text x="38" y="188" font-size="132"><tspan fill="#117ABD">AI Agent</tspan></text><text x="38" y="412" font-size="176">如何</text><text x="38" y="618" font-size="166">交接？</text></g></svg>`;
}

function svg3x4({ agent, topic }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="900" height="1200" viewBox="0 0 900 1200">${makeGrid(900, 1200)}<image x="478" y="756" width="286" height="388" preserveAspectRatio="xMidYMid meet" xlink:href="${agent}"/><image x="188" y="796" width="252" height="252" preserveAspectRatio="xMidYMid meet" xlink:href="${topic}"/><rect x="36" y="30" width="160" height="14" rx="7" fill="#117ABD"/><rect x="36" y="711" width="556" height="18" rx="9" fill="#F4C542"/><g fill="#111413" stroke="#ECECEA" stroke-width="9" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-4"><text x="36" y="196" font-size="116"><tspan fill="#117ABD">AI Agent</tspan></text><text x="36" y="416" font-size="174">如何</text><text x="36" y="628" font-size="164">交接？</text></g></svg>`;
}

function renderPng(svgPath, pngPath, width, height) {
  const temp = `${pngPath}.tmp.png`;
  run('rsvg-convert', ['--width', String(width), '--height', String(height), '--output', temp, svgPath]);
  run('magick', [temp, '-strip', '-colorspace', 'sRGB', pngPath]);
  run('rm', ['-f', temp]);
}

function buildEnglish() {
  const assets = prepareSharedAssets(enProject);
  const metadata = JSON.parse(readFileSync(path.join(enProject, 'publish-metadata.en-US.json'), 'utf8'));
  const svg = svg16x9({ headline: metadata.thumbnailText, second: 'Handoff', third: 'System', agent: path.basename(assets.agentAsset), topic: path.basename(assets.topicAsset), locale: 'en' });
  writeFileSync(path.join(assets.thumbnails, 'thumbnail.en-US.svg'), `${svg}\n`);
  writeJson(path.join(assets.thumbnails, 'thumbnail-spec.en-US.16x9.json'), {
    language: 'en-US', aspectRatio: '16x9', width: 1280, height: 720, headline: metadata.thumbnailText,
    titleLines: ['AI Agent', 'Handoff', 'System'], titleIdentity: true, stableAgentAsset: path.basename(assets.agentAsset),
    stableAgentTransform: 'alpha-trim only', stableAgentSource: '../assets/pack/sprites/agent/handoff-left.png',
    topicObjectAsset: path.basename(assets.topicAsset), topicObjectSource: '../assets/pack/sprites/props/handoff.png',
    illustrationFit: 'contain', titlePalette: { agentIdentity: '#117ABD', remainingTitle: '#111413', decorativeRule: '#F4C542' },
    composition: 'text-left complete-approved-agent-right with one handoff object; title-hero; no opaque panel', auxiliaryCoverCopy: false, generatedIllustrationText: false,
  });
}

function buildChinese() {
  const assets = prepareSharedAssets(zhProject);
  const metadata = JSON.parse(readFileSync(path.join(zhProject, 'publish-metadata.zh-CN.json'), 'utf8'));
  const variants = [
    ['16x9', 'thumbnail.zh-CN.svg', 'thumbnail.zh-CN.16x9.png', 1280, 720, svg16x9({ headline: metadata.thumbnailText, second: '如何', third: '交接？', agent: path.basename(assets.agentAsset), topic: path.basename(assets.topicAsset), locale: 'zh' }), 'text-left complete-approved-agent-right with one handoff object; title-hero; no opaque panel'],
    ['4x3', 'thumbnail.zh-CN.4x3.svg', 'thumbnail.zh-CN.4x3.png', 1200, 900, svg4x3({ agent: path.basename(assets.agentAsset), topic: path.basename(assets.topicAsset) }), 'text-left complete-approved-agent-right with one handoff object; title-hero; no opaque panel'],
    ['3x4', 'thumbnail.zh-CN.3x4.svg', 'thumbnail.zh-CN.3x4.png', 900, 1200, svg3x4({ agent: path.basename(assets.agentAsset), topic: path.basename(assets.topicAsset) }), 'top-60-percent-title; bottom-40-percent-contained; one approved agent and one handoff object; no opaque panel'],
  ];
  for (const [ratio, svgName, pngName, width, height, svg, composition] of variants) {
    const svgPath = path.join(assets.thumbnails, svgName);
    writeFileSync(svgPath, `${svg}\n`);
    renderPng(svgPath, path.join(assets.thumbnails, pngName), width, height);
    writeJson(path.join(assets.thumbnails, `thumbnail-spec.zh-CN.${ratio}.json`), {
      language: 'zh-CN', aspectRatio: ratio, width, height, headline: metadata.thumbnailText,
      titleLines: ['AI Agent', '如何', '交接？'], titleIdentity: true,
      referenceLayout: '2026-07-23-approved-title-hero',
      referenceSvg: '../../2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/thumbnails/thumbnail.zh-CN.svg',
      stableAgentAsset: path.basename(assets.agentAsset), stableAgentTransform: 'alpha-trim only', stableAgentSource: '../assets/pack/sprites/agent/handoff-left.png',
      topicObjectAsset: path.basename(assets.topicAsset), topicObjectSource: '../assets/pack/sprites/props/handoff.png', illustrationFit: 'contain',
      titlePalette: { agentIdentity: '#117ABD', remainingTitle: '#111413', decorativeRule: '#F4C542' }, composition,
      auxiliaryCoverCopy: false, generatedIllustrationText: false,
    });
  }
  copyFileSync(path.join(assets.thumbnails, 'thumbnail.zh-CN.16x9.png'), path.join(assets.thumbnails, 'thumbnail.zh-CN.png'));
}

buildEnglish();
buildChinese();
