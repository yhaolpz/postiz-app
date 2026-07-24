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
  const cards = [...document.querySelectorAll('.semantic-label-card')].map((element) => {
    const box = rect(element);
    const sceneBox = rect(element.closest('.scene'));
    const lines = [...element.querySelectorAll('.label-line')].map((line) => ({ text: line.textContent.trim(), rect: rect(line) }));
    const style = getComputedStyle(element);
    const expectedFontPx = element.closest('.intro-copy') ? 120 : element.closest('.emphasis-sub') ? 84 : 68;
    const stylePass = style.backgroundColor === 'rgb(244, 197, 66)'
      && parseFloat(style.borderTopWidth) >= 7
      && style.borderTopColor === 'rgb(17, 20, 19)'
      && parseFloat(style.borderRadius) >= 28
      && parseFloat(style.fontSize) >= expectedFontPx
      && style.color === 'rgb(17, 20, 19)';
    const geometryPass = within(box, sceneBox, 1) && lines.length > 0 && lines.every((line) => within(line.rect, box));
    return {
      sceneId: element.closest('.scene')?.id?.replace('scene-', ''),
      className: element.parentElement?.className || '',
      box,
      lines,
      expectedFontPx,
      computed: {
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        borderRadius: style.borderRadius,
        fontSize: style.fontSize,
        color: style.color
      },
      stylePass,
      geometryPass,
      pass: stylePass && geometryPass
    };
  });
  const forbiddenUnderlines = document.querySelectorAll('.semantic-underline-target,.semantic-underline-segment').length;
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
  const hookLines = [...document.querySelectorAll('.hook-line')].map((element) => rect(element));
  const hookMarker = rect(document.querySelector('.hook-marker'));
  const hookBurst = rect(document.querySelector('.hook-burst'));
  const glyphUnion = hookGlyphs.reduce((box, item) => ({
    left: Math.min(box.left, item.rect.left),
    top: Math.min(box.top, item.rect.top),
    right: Math.max(box.right, item.rect.right),
    bottom: Math.max(box.bottom, item.rect.bottom)
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  glyphUnion.width = round(glyphUnion.right - glyphUnion.left);
  glyphUnion.height = round(glyphUnion.bottom - glyphUnion.top);
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const agentGlyphOverlap = hookGlyphs.some((item) => overlaps(item.rect, hookAgent));
  const questionAreaRatio = round((hookQuestion.width * hookQuestion.height) / (innerWidth * innerHeight));
  const fullFrameTypography = glyphUnion.left <= 100 && glyphUnion.top <= 150 && glyphUnion.right >= 1540 && glyphUnion.bottom >= 760 && questionAreaRatio >= 0.55;
  const hook = {
    question: hookQuestion,
    agent: hookAgent,
    marker: hookMarker,
    burst: hookBurst,
    lines: hookLines,
    glyphUnion,
    questionAreaRatio,
    fullFrameTypography,
    agentGlyphOverlap,
    glyphs: hookGlyphs,
    pass: within(hookQuestion, viewport)
      && within(hookAgent, viewport)
      && within(hookMarker, viewport)
      && within(hookBurst, viewport)
      && hookGlyphs.every((item) => within(item.rect, viewport))
      && fullFrameTypography
      && !agentGlyphOverlap
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    pass: hook.pass && cards.length > 0 && cards.every((item) => item.pass) && forbiddenUnderlines === 0 && generated.every((item) => item.pass) && props.every((item) => item.pass) && generatedArt.every((item) => item.pass),
    hook,
    cards,
    forbiddenUnderlines,
    generated,
    internalProps: props,
    generatedArt
  };
});

await browser.close();
writeFileSync(path.join(qaDir, 'dom-layout-report.json'), `${JSON.stringify(result, null, 2)}\n`);
const cardStyleFailureCount = result.cards.filter((item) => !item.stylePass).length;
const cardOverflowCount = result.cards.filter((item) => !item.geometryPass).length;
const cardFontSizeFailureCount = result.cards.filter((item) => parseFloat(item.computed.fontSize) < item.expectedFontPx).length;
const forbiddenUnderlineCount = result.forbiddenUnderlines;
const existingHighlight = JSON.parse(readFileSync(path.join(qaDir, 'highlight-layout-report.json'), 'utf8'));
const generatedPolicyPass = existingHighlight.generatedLayouts.every((item) => item.oppositeSides && item.maxMeasuredCharsPerLine <= existingHighlight.policy.generatedHighlightMaxMeasuredCharsPerLine)
  && new Set(existingHighlight.generatedLayouts.map((item) => item.artSide)).size === 2
  && existingHighlight.generatedLayouts.slice(1).every((item, index) => item.artSide !== existingHighlight.generatedLayouts[index].artSide)
  && existingHighlight.yellowHighlights.every((item) => item.maxMeasuredCharsPerLine <= item.limit);
writeFileSync(path.join(qaDir, 'highlight-layout-report.json'), `${JSON.stringify({
  ...existingHighlight,
  pass: generatedPolicyPass
    && cardStyleFailureCount === 0
    && cardOverflowCount === 0
    && cardFontSizeFailureCount === 0
    && forbiddenUnderlineCount === 0,
  cardStyleFailureCount,
  cardOverflowCount,
  cardFontSizeFailureCount,
  forbiddenUnderlineCount,
  renderedCards: result.cards
}, null, 2)}\n`);
if (!result.pass) {
  process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`dom-layout: pass (${result.cards.length} semantic cards, ${result.generated.length} generated layouts, ${result.internalProps.length} internal props)\n`);
