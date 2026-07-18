import { execFileSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from 'lucide-react';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { propAssets } from '../catalog.mjs';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(toolsDir, '..');
const palette = {
  blue: { top: '#45c4ff', bottom: '#078ee8' },
  red: { top: '#ff6965', bottom: '#f2262f' },
  yellow: { top: '#ffd65a', bottom: '#ffb51d' },
  brown: { top: '#c89368', bottom: '#9a603d' }
};

function iconBody(Icon) {
  const markup = renderToStaticMarkup(createElement(Icon, {
    width: 24,
    height: 24,
    color: '#111111',
    fill: 'none',
    strokeWidth: 2.35,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  }));
  return markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

const propStyles = {
  folder: { fillAccent: [0] },
  clipboard: { fillAccent: [0], fillPaper: [1] },
  note: { fillAccent: [0], fillPaper: [1] },
  book: { fillAccent: [0, 1] },
  image: { fillPaper: [0], fillAccent: [1], strokeAccent: [2] },
  audio: { fillPaper: [0], fillAccent: [2, 3], strokeAccent: [4], offsetX: 9 },
  video: { fillPaper: [0], fillAccent: [1] },
  'code-file': { fillPaper: [0], strokeAccent: [2, 3], offsetX: 9 },
  spreadsheet: { fillPaper: [0], strokeAccent: [1, 2, 3, 4] },
  keyboard: { fillPaper: [0], strokeAccent: [1, 2, 3, 4, 5, 6, 7] },
  terminal: { fillPaper: [2], strokeAccent: [0, 1] },
  email: { fillPaper: [0], strokeAccent: [1] },
  chat: { fillAccent: [0] },
  calendar: { fillPaper: [0], strokeAccent: [3, 4, 5, 6, 7, 8, 9] },
  cloud: { fillAccent: [0] },
  webhook: { strokeAccent: [0, 1, 2] },
  form: { strokeAccent: [0, 1] },
  dashboard: { fillPaper: [0, 1, 2], fillAccent: [3] },
  repository: { fillAccent: [1, 2], strokeAccent: [3] },
  package: { fillAccent: [1] },
  settings: { fillAccent: [0], fillPaper: [1] },
  notification: { fillAccent: [0] },
  'task-list': { fillAccent: [0], strokeAccent: [1] },
  workflow: { fillAccent: [0, 2], strokeAccent: [1] },
  queue: { strokeAccent: [0, 1, 2] },
  pipeline: { fillAccent: [0, 1, 2] },
  handoff: { fillAccent: [0, 1], strokeAccent: [2, 3] },
  'parallel-agents': { fillAccent: [0, 1] },
  'single-agent': { fillAccent: [0], fillPaper: [1] },
  milestone: { fillAccent: [0] },
  progress: { fillAccent: [1], strokeAccent: [0] },
  timer: { fillAccent: [2], strokeAccent: [1] },
  dependency: { strokeAccent: [2] },
  merge: { fillAccent: [0, 1], strokeAccent: [2] },
  route: { fillPaper: [0], strokeAccent: [1, 2] },
  checklist: { fillPaper: [0, 1], strokeAccent: [2] },
  scorecard: { strokeAccent: [1, 2, 3] },
  ruler: { fillAccent: [0, 1] },
  experiment: { fillAccent: [0] },
  evidence: { fillPaper: [0], strokeAccent: [2] },
  citation: { fillAccent: [0, 1] },
  compare: { fillAccent: [0] },
  target: { fillAccent: [0, 2], fillPaper: [1] },
  'trend-up': { strokeAccent: [0, 1] },
  'trend-down': { strokeAccent: [0, 1] },
  approval: { fillAccent: [0], strokeAccent: [1] },
  shield: { fillAccent: [0], strokeAccent: [1] },
  'permission-key': { fillAccent: [0], fillPaper: [1] },
  privacy: { strokeAccent: [3] },
  'prompt-injection': { fillAccent: [0] },
  'human-gate': { fillAccent: [0, 1, 2, 3] },
  stop: { fillAccent: [0] },
  uncertainty: { strokeAccent: [0, 1, 2, 3, 4, 5, 6, 7] },
  question: { fillAccent: [0] },
  idea: { fillAccent: [0], strokeAccent: [1, 2] },
  archive: { fillAccent: [0, 1] },
  forget: { fillAccent: [1], strokeAccent: [3, 4] },
  summary: { fillPaper: [0], strokeAccent: [2, 3, 4] },
  'skill-card': { fillAccent: [0, 1] },
  team: { fillAccent: [0, 1] }
};

function styledIconBody(body, asset, accent) {
  const style = propStyles[asset.id];
  if (!style) throw new Error(`Missing filled-prop style for ${asset.id}`);
  let index = 0;
  const elements = [];
  body.replace(/<(path|circle|rect|line|polyline|polygon|ellipse)([^>]*)><\/\1>/g, (match, tag, attributes) => {
    const cleaned = attributes
      .replace(/\s(?:fill|stroke|stroke-width)="[^"]*"/g, '')
      .trim();
    const fill = style.fillAccent?.includes(index)
      ? 'url(#accent)'
      : style.fillPaper?.includes(index)
        ? 'url(#paper)'
        : 'none';
    const stroke = style.strokeAccent?.includes(index) ? accent.bottom : '#080b0d';
    elements.push({ tag, attributes: cleaned, fill, stroke });
    index += 1;
    return match;
  });
  const fills = elements
    .filter((element) => element.fill !== 'none')
    .map((element) => `<${element.tag}${element.attributes ? ` ${element.attributes}` : ''} fill="${element.fill}" stroke="none"></${element.tag}>`)
    .join('\n');
  const strokes = elements
    .map((element) => `<${element.tag}${element.attributes ? ` ${element.attributes}` : ''} fill="none" stroke="${element.stroke}" stroke-width="1.5"></${element.tag}>`)
    .join('\n');
  return `<g>${fills}</g><g>${strokes}</g>`;
}

function buildSvg(asset) {
  const Icon = icons[asset.icon];
  if (!Icon) throw new Error(`Unknown lucide icon ${asset.icon} for ${asset.id}`);
  const accent = palette[asset.accent] || palette.blue;
  const style = propStyles[asset.id];
  const body = styledIconBody(iconBody(Icon), asset, accent);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eef3f7"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${accent.top}"/>
      <stop offset="1" stop-color="${accent.bottom}"/>
    </linearGradient>
  </defs>
  <g transform="matrix(9 0 0 9 ${52 + (style.offsetX || 0)} 50)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${body}
  </g>
</svg>`;
}

for (const asset of propAssets.filter((item) => item.source === 'svg')) {
  const outPath = join(rootDir, 'sprites', 'props', `${asset.id}.png`);
  execFileSync('rsvg-convert', [
    '--format', 'png',
    '--width', '320',
    '--height', '320',
    '--output', outPath,
    '-'
  ], {
    input: buildSvg(asset),
    encoding: 'utf8'
  });
  console.log(`built props/${asset.id}.png`);
}
