import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentAssets, counts, humanAssets, propAssets } from '../catalog.mjs';

const qaDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(qaDir, '..');
const manifestDir = join(rootDir, 'manifests');

const sets = [
  {
    id: 'human',
    label: 'Human',
    canvas: { width: 512, height: 512 },
    sheet: { path: 'sprites/human-sprite.png', columns: 5, rows: 6 },
    expectedAssets: 30,
    registration: { kind: 'feet', x: 256, y: 472 },
    registrationTolerance: 1,
    coverage: { min: 0.09, max: 0.34 },
    minPadding: 12,
    assets: humanAssets
  },
  {
    id: 'agent',
    label: 'Tiny Agent',
    canvas: { width: 384, height: 512 },
    sheet: { path: 'sprites/agent-sprite.png', columns: 5, rows: 8 },
    expectedAssets: 40,
    registration: { kind: 'feet', x: 192, y: 456 },
    registrationTolerance: 1,
    coverage: { min: 0.13, max: 0.38 },
    minPadding: 12,
    assets: agentAssets
  },
  {
    id: 'props',
    label: 'Props',
    canvas: { width: 320, height: 320 },
    sheet: { path: 'sprites/props-sprite.png', columns: 10, rows: 8 },
    expectedAssets: 75,
    registration: { kind: 'center', x: 160, y: 160 },
    registrationTolerance: 8,
    coverage: { min: 0.025, max: 0.58 },
    minPadding: 10,
    assets: propAssets
  }
];

function runMagick(args) {
  return execFileSync('magick', args, { encoding: 'utf8' }).trim();
}

function inspectImage(filePath) {
  const [width, height, channels] = runMagick([
    'identify', '-ping', '-format', '%w|%h|%[channels]', filePath
  ]).split('|');
  const [boxWidth, boxHeight, x, y, canvasWidth, canvasHeight] = runMagick([
    filePath,
    '-trim',
    '-format', '%w|%h|%[fx:page.x]|%[fx:page.y]|%[fx:page.width]|%[fx:page.height]',
    'info:'
  ]).split('|').map(Number);
  const coverage = Number(runMagick([
    filePath, '-alpha', 'extract', '-threshold', '1', '-format', '%[fx:mean]', 'info:'
  ]));
  const greenResidue = Number(runMagick([
    filePath,
    '-fx', 'a>0.05 && g>0.6 && g>r*1.4 && g>b*1.4 ? 1 : 0',
    '-format', '%[fx:mean]',
    'info:'
  ]));
  const maxX = Number(width) - 1;
  const maxY = Number(height) - 1;
  const corners = runMagick([
    filePath,
    '-alpha', 'extract',
    '-format', `%[fx:u.p{0,0}]|%[fx:u.p{${maxX},0}]|%[fx:u.p{0,${maxY}}]|%[fx:u.p{${maxX},${maxY}}]`,
    'info:'
  ]).split('|').map(Number);

  return {
    width: Number(width),
    height: Number(height),
    channels,
    bounds: {
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      right: Number(canvasWidth) - x - boxWidth,
      bottom: Number(canvasHeight) - y - boxHeight
    },
    coverage,
    greenResidue,
    cornerAlpha: corners
  };
}

function inspectPropBodyCoverage(filePath) {
  return Number(runMagick([
    filePath,
    '-crop', '200x175+40+40',
    '+repage',
    '-alpha', 'extract',
    '-threshold', '1',
    '-format', '%[fx:mean]',
    'info:'
  ]));
}

function addCheck(checks, id, passed, actual, expected) {
  checks.push({ id, status: passed ? 'pass' : 'fail', actual, expected });
}

mkdirSync(manifestDir, { recursive: true });
const checks = [];
const manifests = [];

for (const set of sets) {
  const expectedSheetWidth = set.canvas.width * set.sheet.columns;
  const expectedSheetHeight = set.canvas.height * set.sheet.rows;
  const sheetInfo = inspectImage(join(rootDir, set.sheet.path));
  addCheck(checks, `${set.id}.sheet-dimensions`, sheetInfo.width === expectedSheetWidth && sheetInfo.height === expectedSheetHeight, `${sheetInfo.width}x${sheetInfo.height}`, `${expectedSheetWidth}x${expectedSheetHeight}`);
  addCheck(checks, `${set.id}.asset-count`, set.assets.length === set.expectedAssets, set.assets.length, set.expectedAssets);

  const assets = set.assets.map((asset, index) => {
    const row = Math.floor(index / set.sheet.columns);
    const column = index % set.sheet.columns;
    const assetPath = `sprites/${set.id}/${asset.id}.png`;
    const imageInfo = inspectImage(join(rootDir, assetPath));
    const padding = imageInfo.bounds;

    addCheck(checks, `${set.id}.${asset.id}.dimensions`, imageInfo.width === set.canvas.width && imageInfo.height === set.canvas.height, `${imageInfo.width}x${imageInfo.height}`, `${set.canvas.width}x${set.canvas.height}`);
    addCheck(checks, `${set.id}.${asset.id}.alpha`, imageInfo.channels.toLowerCase().includes('a'), imageInfo.channels, 'alpha channel present');
    addCheck(checks, `${set.id}.${asset.id}.transparent-corners`, imageInfo.cornerAlpha.every((value) => value <= 0.001), imageInfo.cornerAlpha, 'all corner alpha <= 0.001');
    addCheck(checks, `${set.id}.${asset.id}.padding`, Math.min(padding.x, padding.y, padding.right, padding.bottom) >= set.minPadding, padding, `each side >= ${set.minPadding}px`);
    addCheck(checks, `${set.id}.${asset.id}.coverage`, imageInfo.coverage >= set.coverage.min && imageInfo.coverage <= set.coverage.max, Number(imageInfo.coverage.toFixed(6)), `${set.coverage.min}..${set.coverage.max}`);
    addCheck(checks, `${set.id}.${asset.id}.green-residue`, imageInfo.greenResidue <= 0.0002, Number(imageInfo.greenResidue.toFixed(8)), '<= 0.0002');
    if (set.id === 'props' && asset.source !== 'v1') {
      const bodyCoverage = inspectPropBodyCoverage(join(rootDir, assetPath));
      addCheck(
        checks,
        `${set.id}.${asset.id}.icon-body`,
        bodyCoverage >= 0.08,
        Number(bodyCoverage.toFixed(6)),
        '>= 0.08 alpha coverage inside the icon-body region'
      );
    }

    const measuredRegistration = set.registration.kind === 'feet'
      ? { x: imageInfo.bounds.x + imageInfo.bounds.width / 2, y: imageInfo.bounds.y + imageInfo.bounds.height }
      : { x: imageInfo.bounds.x + imageInfo.bounds.width / 2, y: imageInfo.bounds.y + imageInfo.bounds.height / 2 };
    const registrationDelta = {
      x: Math.abs(measuredRegistration.x - set.registration.x),
      y: Math.abs(measuredRegistration.y - set.registration.y)
    };
    addCheck(
      checks,
      `${set.id}.${asset.id}.registration`,
      registrationDelta.x <= set.registrationTolerance && registrationDelta.y <= set.registrationTolerance,
      { measured: measuredRegistration, delta: registrationDelta },
      { target: set.registration, tolerance: `${set.registrationTolerance}px` }
    );

    return {
      id: asset.id,
      zhName: asset.zhName,
      description: asset.action || asset.zhName,
      direction: asset.direction || 'none',
      category: asset.category,
      source: asset.source,
      path: assetPath,
      cell: {
        index,
        row,
        column,
        x: column * set.canvas.width,
        y: row * set.canvas.height,
        width: set.canvas.width,
        height: set.canvas.height
      },
      anchors: {
        registration: set.registration,
        center: { x: set.canvas.width / 2, y: set.canvas.height / 2 }
      },
      bounds: imageInfo.bounds
    };
  });

  const manifest = {
    schemaVersion: 2,
    id: set.id,
    label: set.label,
    canvas: set.canvas,
    registration: set.registration,
    sheet: {
      path: set.sheet.path,
      width: expectedSheetWidth,
      height: expectedSheetHeight,
      columns: set.sheet.columns,
      rows: set.sheet.rows,
      cellWidth: set.canvas.width,
      cellHeight: set.canvas.height
    },
    assets
  };
  writeFileSync(join(manifestDir, `${set.id}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  manifests.push(manifest);
}

const failed = checks.filter((check) => check.status === 'fail');
const manualReview = JSON.parse(readFileSync(join(qaDir, 'manual-review.json'), 'utf8'));
const manualPending = manualReview.gates.some((gate) => gate.status !== 'pass');
const status = failed.length > 0 ? 'fail' : manualPending ? 'review' : 'pass';
const report = {
  schemaVersion: 2,
  pack: 'tiny-agent-v2',
  status,
  automaticStatus: failed.length === 0 ? 'pass' : 'fail',
  manualStatus: manualPending ? 'pending' : 'pass',
  generatedAt: new Date().toISOString(),
  summary: {
    assets: counts.total,
    human: counts.human,
    agent: counts.agent,
    props: counts.props,
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length
  },
  checks,
  manualReview
};
writeFileSync(join(qaDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const reportLines = [
  '# Tiny Agent Asset Pack v2 QA',
  '',
  `- Pack status: **${status.toUpperCase()}**`,
  `- Automatic status: **${report.automaticStatus.toUpperCase()}**`,
  `- Manual review: **${report.manualStatus.toUpperCase()}**`,
  `- Assets: ${counts.total} (${counts.human} human, ${counts.agent} agent, ${counts.props} props)`,
  `- Checks: ${report.summary.passed}/${report.summary.checks} passed`,
  `- Generated: ${report.generatedAt}`,
  '',
  '## Automatic failures',
  '',
  ...(failed.length === 0 ? ['None.'] : failed.map((check) => `- \`${check.id}\`: expected ${JSON.stringify(check.expected)}, got ${JSON.stringify(check.actual)}`)),
  '',
  '## Manual gates',
  '',
  ...manualReview.gates.map((gate) => `- **${gate.status.toUpperCase()}** \`${gate.id}\`: ${gate.note}`),
  '',
  '## Contact sheets',
  '',
  '- `human-contact-sheet.png`',
  '- `agent-contact-sheet.png`',
  '- `props-contact-sheet.png`',
  ''
];
writeFileSync(join(qaDir, 'report.md'), reportLines.join('\n'));

const indexManifest = {
  schemaVersion: 2,
  id: 'tiny-agent-v2',
  supersedes: 'tiny-agent-v1',
  basedOn: 'tiny-agent-v1',
  fallback: 'tiny-agent-v1',
  style: 'whiteboard-doodle',
  assets: counts.total,
  status,
  activation: 'approved',
  manifests: manifests.map((manifest) => ({
    id: manifest.id,
    path: relative(rootDir, join(manifestDir, `${manifest.id}.json`))
  })),
  qa: {
    report: 'qa/report.json',
    manualReview: 'qa/manual-review.json'
  }
};
writeFileSync(join(manifestDir, 'asset-pack.json'), `${JSON.stringify(indexManifest, null, 2)}\n`);

console.log(`${status.toUpperCase()}: ${report.summary.passed}/${report.summary.checks} automatic checks passed for ${counts.total} assets.`);
if (failed.length > 0) process.exitCode = 1;
