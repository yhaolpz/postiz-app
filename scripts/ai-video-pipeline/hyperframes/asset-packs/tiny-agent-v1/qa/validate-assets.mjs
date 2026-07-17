import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const qaDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(qaDir, '..');
const manifestDir = join(rootDir, 'manifests');

const sets = [
  {
    id: 'human',
    label: 'Human',
    canvas: { width: 512, height: 512 },
    sheet: { path: 'sprites/human-sprite.png', columns: 3, rows: 2 },
    registration: { kind: 'feet', x: 256, y: 472 },
    coverage: { min: 0.12, max: 0.25 },
    minPadding: 16,
    assets: [
      ['idle', '待机', 'Neutral standing pose.'],
      ['point-right', '指向', 'Points toward content on the right.'],
      ['think', '思考', 'One hand at the chin in a thinking pose.'],
      ['approve', '认可', 'Thumbs-up approval pose.'],
      ['operate', '操作', 'Both hands operate an imaginary interface.'],
      ['surprised', '惊讶', 'Raised hands and surprised expression.']
    ]
  },
  {
    id: 'agent',
    label: 'Tiny Agent',
    canvas: { width: 384, height: 512 },
    sheet: { path: 'sprites/agent-sprite.png', columns: 4, rows: 2 },
    registration: { kind: 'feet', x: 192, y: 456 },
    coverage: { min: 0.17, max: 0.30 },
    minPadding: 16,
    assets: [
      ['idle', '待机', 'Neutral ready state.'],
      ['search', '搜索', 'Leans forward and scans for information.'],
      ['receive-tool', '接工具', 'Open hand ready to receive a tool.'],
      ['execute', '执行', 'Presses an imaginary control to execute.'],
      ['store-memory', '存记忆', 'Moves information toward the tool-belt memory.'],
      ['recall-memory', '取记忆', 'Retrieves information from the tool belt.'],
      ['success', '成功', 'Confident thumbs-up success state.'],
      ['failure', '失败', 'Slumped failure state with a sad face.']
    ]
  },
  {
    id: 'props',
    label: 'Props',
    canvas: { width: 320, height: 320 },
    sheet: { path: 'sprites/props-sprite.png', columns: 5, rows: 3 },
    registration: { kind: 'center', x: 160, y: 160 },
    coverage: { min: 0.05, max: 0.45 },
    minPadding: 16,
    assets: [
      ['document', '文档', 'Single input document.'],
      ['document-stack', '文档组', 'Multiple input documents.'],
      ['search', '搜索', 'Search or retrieval operation.'],
      ['browser', '浏览器', 'Browser or web page.'],
      ['api-plug', 'API', 'API or external service connection.'],
      ['database', '数据库', 'Structured data storage.'],
      ['memory', '记忆', 'Agent memory store.'],
      ['result-card', '结果卡', 'Successful output result.'],
      ['branch', '分支', 'Conditional branch.'],
      ['loop', '循环', 'Repeated execution loop.'],
      ['warning', '警告', 'Warning or attention state.'],
      ['success', '成功', 'Successful completion badge.'],
      ['error', '错误', 'Error or failed result badge.'],
      ['tool', '工具', 'Generic callable tool.'],
      ['timeout', '超时', 'Timeout or latency state.']
    ]
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

function addCheck(checks, id, passed, actual, expected) {
  checks.push({ id, status: passed ? 'pass' : 'fail', actual, expected });
}

mkdirSync(manifestDir, { recursive: true });

const checks = [];
const manifests = [];

for (const set of sets) {
  const expectedSheetWidth = set.canvas.width * set.sheet.columns;
  const expectedSheetHeight = set.canvas.height * set.sheet.rows;
  const sheetPath = join(rootDir, set.sheet.path);
  const sheetInfo = inspectImage(sheetPath);

  addCheck(
    checks,
    `${set.id}.sheet-dimensions`,
    sheetInfo.width === expectedSheetWidth && sheetInfo.height === expectedSheetHeight,
    `${sheetInfo.width}x${sheetInfo.height}`,
    `${expectedSheetWidth}x${expectedSheetHeight}`
  );
  addCheck(
    checks,
    `${set.id}.asset-count`,
    set.assets.length === set.sheet.columns * set.sheet.rows,
    set.assets.length,
    set.sheet.columns * set.sheet.rows
  );

  const assets = set.assets.map(([id, zhName, description], index) => {
    const row = Math.floor(index / set.sheet.columns);
    const column = index % set.sheet.columns;
    const assetPath = `sprites/${set.id}/${id}.png`;
    const imageInfo = inspectImage(join(rootDir, assetPath));
    const padding = imageInfo.bounds;

    addCheck(
      checks,
      `${set.id}.${id}.dimensions`,
      imageInfo.width === set.canvas.width && imageInfo.height === set.canvas.height,
      `${imageInfo.width}x${imageInfo.height}`,
      `${set.canvas.width}x${set.canvas.height}`
    );
    addCheck(
      checks,
      `${set.id}.${id}.alpha`,
      imageInfo.channels.toLowerCase().includes('a'),
      imageInfo.channels,
      'alpha channel present'
    );
    addCheck(
      checks,
      `${set.id}.${id}.transparent-corners`,
      imageInfo.cornerAlpha.every((value) => value <= 0.001),
      imageInfo.cornerAlpha,
      'all corner alpha <= 0.001'
    );
    addCheck(
      checks,
      `${set.id}.${id}.padding`,
      Math.min(padding.x, padding.y, padding.right, padding.bottom) >= set.minPadding,
      padding,
      `each side >= ${set.minPadding}px`
    );
    addCheck(
      checks,
      `${set.id}.${id}.coverage`,
      imageInfo.coverage >= set.coverage.min && imageInfo.coverage <= set.coverage.max,
      Number(imageInfo.coverage.toFixed(6)),
      `${set.coverage.min}..${set.coverage.max}`
    );
    addCheck(
      checks,
      `${set.id}.${id}.green-residue`,
      imageInfo.greenResidue <= 0.0001,
      Number(imageInfo.greenResidue.toFixed(8)),
      '<= 0.0001'
    );

    const measuredRegistration = set.registration.kind === 'feet'
      ? {
          x: imageInfo.bounds.x + imageInfo.bounds.width / 2,
          y: imageInfo.bounds.y + imageInfo.bounds.height
        }
      : {
          x: imageInfo.bounds.x + imageInfo.bounds.width / 2,
          y: imageInfo.bounds.y + imageInfo.bounds.height / 2
        };
    const registrationDelta = {
      x: Math.abs(measuredRegistration.x - set.registration.x),
      y: Math.abs(measuredRegistration.y - set.registration.y)
    };
    addCheck(
      checks,
      `${set.id}.${id}.registration`,
      registrationDelta.x <= 1 && registrationDelta.y <= 1,
      { measured: measuredRegistration, delta: registrationDelta },
      { target: set.registration, tolerance: '1px' }
    );

    return {
      id,
      zhName,
      description,
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
    schemaVersion: 1,
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

const manualReview = JSON.parse(readFileSync(join(qaDir, 'manual-review.json'), 'utf8'));
for (const gate of manualReview.gates) {
  addCheck(checks, `manual.${gate.id}`, gate.status === 'pass', gate.status, 'pass');
}

const failed = checks.filter((check) => check.status === 'fail');
const report = {
  schemaVersion: 1,
  pack: 'tiny-agent-v1',
  status: failed.length === 0 ? 'pass' : 'fail',
  generatedAt: new Date().toISOString(),
  summary: {
    assets: sets.reduce((total, set) => total + set.assets.length, 0),
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length
  },
  checks,
  manualReview
};

writeFileSync(join(qaDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const reportLines = [
  '# Tiny Agent Asset Pack QA',
  '',
  `- Status: **${report.status.toUpperCase()}**`,
  `- Assets: ${report.summary.assets}`,
  `- Checks: ${report.summary.passed}/${report.summary.checks} passed`,
  `- Generated: ${report.generatedAt}`,
  '',
  '## Automatic Gates',
  '',
  '| Set | Sheet | Assets | Registration |',
  '| --- | --- | ---: | --- |',
  ...manifests.map((manifest) =>
    `| ${manifest.label} | ${manifest.sheet.width}x${manifest.sheet.height} | ${manifest.assets.length} | ${manifest.registration.kind} (${manifest.registration.x}, ${manifest.registration.y}) |`
  ),
  '',
  failed.length === 0 ? 'All dimension, alpha, corner, padding, coverage, registration, and chroma-residue checks passed.' : '### Failures',
  ...(failed.length === 0 ? [] : ['', ...failed.map((check) => `- \`${check.id}\`: expected ${JSON.stringify(check.expected)}, got ${JSON.stringify(check.actual)}`)]),
  '',
  '## Manual Visual Gates',
  '',
  ...manualReview.gates.map((gate) => `- **${gate.status.toUpperCase()}** \`${gate.id}\`: ${gate.note}`),
  '',
  '## Contact Sheets',
  '',
  '- `human-contact-sheet.png`',
  '- `agent-contact-sheet.png`',
  '- `props-contact-sheet.png`',
  ''
];

writeFileSync(join(qaDir, 'report.md'), reportLines.join('\n'));

const indexManifest = {
  schemaVersion: 1,
  id: 'tiny-agent-v1',
  style: 'whiteboard-doodle',
  assets: report.summary.assets,
  status: report.status,
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

console.log(`${report.status.toUpperCase()}: ${report.summary.passed}/${report.summary.checks} checks passed for ${report.summary.assets} assets.`);
if (failed.length > 0) {
  process.exitCode = 1;
}
