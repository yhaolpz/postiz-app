import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const outputDir = path.join(projectDir, 'snapshots', 'review');
const times = (process.argv[2] || '0.1,1.2,2.4,3.5,4.3,4.65,52.6,147,278,453,594,617.85,620.5')
  .split(',')
  .map(Number)
  .filter(Number.isFinite);

mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--allow-file-access-from-files']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(projectDir, 'index.html')).href, { waitUntil: 'load', timeout: 30000 });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : image.decode().catch(() => undefined)));
});

for (let index = 0; index < times.length; index += 1) {
  const time = times[index];
  await page.evaluate((value) => {
    const timeline = window.__timelines?.main;
    if (!timeline) throw new Error('Missing main timeline');
    timeline.pause(value, false);
  }, time);
  await page.waitForTimeout(80);
  const filename = `${String(index + 1).padStart(2, '0')}-${time.toFixed(2).replace('.', '_')}s.png`;
  await page.screenshot({ path: path.join(outputDir, filename), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

await browser.close();
process.stdout.write(`captured ${times.length} review frames\n`);
