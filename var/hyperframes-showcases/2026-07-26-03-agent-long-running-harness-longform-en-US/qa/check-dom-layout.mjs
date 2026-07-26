import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const baseHref = `${pathToFileURL(projectDir).href}/`;
const documentHtml = readFileSync(path.join(projectDir, 'index.html'), 'utf8')
  .replace('<head>', `<head><base href="${baseHref}">`)
  .replace(/<audio\b[^>]*><\/audio>/g, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
await page.setContent(documentHtml, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]); });

const result = await page.evaluate(() => {
  document.querySelectorAll('.hook-glyph,.hook-agent,.hook-marker,.hook-burst').forEach((element) => {
    element.style.transform = 'none';
    element.style.visibility = 'visible';
    element.style.opacity = '1';
  });
  const round = (value) => Math.round(value * 100) / 100;
  const rect = (element) => {
    const value = element.getBoundingClientRect();
    return { left: round(value.left), top: round(value.top), right: round(value.right), bottom: round(value.bottom), width: round(value.width), height: round(value.height) };
  };
  const within = (inner, outer, tolerance = 1) => inner.left >= outer.left - tolerance && inner.right <= outer.right + tolerance && inner.top >= outer.top - tolerance && inner.bottom <= outer.bottom + tolerance;
  const highlights = [...document.querySelectorAll('.yellow-highlight')].map((element) => {
    const box = rect(element);
    const lines = [...element.querySelectorAll('.label-line')].map((line) => ({ text: line.textContent.trim(), rect: rect(line) }));
    return { sceneId: element.closest('.scene')?.id?.replace('scene-', ''), className: element.className, box, lines, pass: lines.length > 0 && lines.every((line) => within(line.rect, box)) };
  });
  const generated = [...document.querySelectorAll('.generated-stage')].map((stage) => {
    const art = rect(stage.querySelector('.generated-art'));
    const label = rect(stage.querySelector('.generated-label'));
    const expectedArtSide = stage.classList.contains('art-left') ? 'left' : 'right';
    const actualArtSide = (art.left + art.right) / 2 < (label.left + label.right) / 2 ? 'left' : 'right';
    const noOverlap = art.right <= label.left || label.right <= art.left;
    return { sceneId: stage.closest('.scene')?.id?.replace('scene-', ''), expectedArtSide, actualArtSide, art, label, noOverlap, pass: expectedArtSide === actualArtSide && noOverlap };
  });
  const props = [...document.querySelectorAll('.featured-object')].map((element) => {
    const style = getComputedStyle(element);
    const pass = parseFloat(style.borderTopWidth) === 0 && style.borderRadius === '0px' && style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.boxShadow === 'none';
    return { sceneId: element.closest('.scene')?.id?.replace('scene-', ''), borderTopWidth: style.borderTopWidth, borderRadius: style.borderRadius, backgroundColor: style.backgroundColor, boxShadow: style.boxShadow, pass };
  });
  const generatedArt = [...document.querySelectorAll('.generated-art')].map((element) => {
    const style = getComputedStyle(element);
    return { sceneId: element.closest('.scene')?.id?.replace('scene-', ''), borderTopWidth: style.borderTopWidth, borderRadius: style.borderRadius, boxShadow: style.boxShadow, pass: parseFloat(style.borderTopWidth) === 0 && style.borderRadius === '0px' && style.boxShadow === 'none' };
  });
  const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight };
  const hookQuestion = rect(document.querySelector('.hook-question'));
  const hookAgent = rect(document.querySelector('.hook-agent'));
  const hookGlyphs = [...document.querySelectorAll('.hook-glyph')].map((element) => ({ text: element.textContent, rect: rect(element) }));
  const hookMarker = rect(document.querySelector('.hook-marker'));
  const hookBurst = rect(document.querySelector('.hook-burst'));
  const hook = {
    question: hookQuestion,
    agent: hookAgent,
    marker: hookMarker,
    burst: hookBurst,
    glyphs: hookGlyphs,
    pass: within(hookQuestion, viewport) && within(hookAgent, viewport) && within(hookMarker, viewport) && within(hookBurst, viewport) && hookGlyphs.every((item) => within(item.rect, viewport))
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    pass: hook.pass && highlights.every((item) => item.pass) && generated.every((item) => item.pass) && props.every((item) => item.pass) && generatedArt.every((item) => item.pass),
    hook,
    highlights,
    generated,
    internalProps: props,
    generatedArt
  };
});

await browser.close();
writeFileSync(path.join(qaDir, 'dom-layout-report.json'), `${JSON.stringify(result, null, 2)}\n`);
if (!result.pass) {
  process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`dom-layout: pass (${result.highlights.length} highlights, ${result.generated.length} generated layouts, ${result.internalProps.length} internal props)\n`);
