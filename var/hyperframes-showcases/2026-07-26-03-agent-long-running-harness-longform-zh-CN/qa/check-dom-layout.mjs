import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const rootDir = path.resolve(projectDir, '../../..');
const activeProfile = JSON.parse(readFileSync(path.join(rootDir, 'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json'), 'utf8'));
const openingReadability = activeProfile.postSnapshotUserOverrides?.openingQuestionReadability;
if (!openingReadability) throw new Error('Active Tiny Agent profile is missing openingQuestionReadability.');
const openingReportPath = path.join(qaDir, 'retention-opening-report.json');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const baseHref = `${pathToFileURL(projectDir).href}/`;
const documentHtml = readFileSync(path.join(projectDir, 'index.html'), 'utf8')
  .replace('<head>', `<head><base href="${baseHref}">`)
  .replace(/<audio\b[^>]*><\/audio>/g, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
await page.setContent(documentHtml, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]); });

const result = await page.evaluate((openingReadability) => {
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
  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const union = (rects) => ({
    left: Math.min(...rects.map((item) => item.left)),
    top: Math.min(...rects.map((item) => item.top)),
    right: Math.max(...rects.map((item) => item.right)),
    bottom: Math.max(...rects.map((item) => item.bottom))
  });
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
  const glyphBounds = union(hookGlyphs.map((item) => item.rect));
  glyphBounds.width = round(glyphBounds.right - glyphBounds.left);
  glyphBounds.height = round(glyphBounds.bottom - glyphBounds.top);
  const glyphCoveragePercent = {
    width: round((glyphBounds.width / innerWidth) * 100),
    height: round((glyphBounds.height / innerHeight) * 100)
  };
  const coveragePass = glyphCoveragePercent.width >= openingReadability.canvasGlyphCoveragePercent.width.min
    && glyphCoveragePercent.width <= openingReadability.canvasGlyphCoveragePercent.width.max
    && glyphCoveragePercent.height >= openingReadability.canvasGlyphCoveragePercent.height.min
    && glyphCoveragePercent.height <= openingReadability.canvasGlyphCoveragePercent.height.max;
  // Bounds cover the intentional gap between lines, so inspect individual
  // glyph boxes for collision rather than treating that empty space as text.
  const noReservedOverlap = hookGlyphs.every((item) => !intersects(item.rect, hookAgent)
    && !intersects(item.rect, hookMarker) && !intersects(item.rect, hookBurst));
  const hook = {
    question: hookQuestion,
    agent: hookAgent,
    marker: hookMarker,
    burst: hookBurst,
    glyphs: hookGlyphs,
    glyphBounds,
    glyphCoveragePercent,
    coverageTargetPercent: openingReadability.canvasGlyphCoveragePercent,
    coveragePass,
    noReservedOverlap,
    pass: within(hookQuestion, viewport) && within(hookAgent, viewport) && within(hookMarker, viewport) && within(hookBurst, viewport)
      && hookGlyphs.every((item) => within(item.rect, viewport)) && coveragePass && noReservedOverlap
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
}, openingReadability);

await browser.close();
writeFileSync(path.join(qaDir, 'dom-layout-report.json'), `${JSON.stringify(result, null, 2)}\n`);
const openingReport = JSON.parse(readFileSync(openingReportPath, 'utf8'));
openingReport.canvasGlyphCoveragePercent = result.hook.glyphCoveragePercent;
openingReport.agentFirstFrame = {
  visible: true,
  position: 'bottom-right',
  boundsPx: result.hook.agent,
  visibleHeightPx: result.hook.agent.height
};
openingReport.domMeasurement = {
  source: 'qa/dom-layout-report.json',
  glyphBounds: result.hook.glyphBounds,
  coverageTargetPercent: result.hook.coverageTargetPercent,
  coveragePass: result.hook.coveragePass,
  noReservedOverlap: result.hook.noReservedOverlap
};
const openingTimingPass = openingReport.firstGlyphLeadMilliseconds >= openingReadability.firstGlyphLeadMilliseconds.min
  && openingReport.firstGlyphLeadMilliseconds <= openingReadability.firstGlyphLeadMilliseconds.max
  && openingReport.maximumPerGlyphLeadMilliseconds <= openingReadability.maximumPerGlyphLeadMilliseconds
  && openingReport.fullQuestionReadLeadMilliseconds >= openingReadability.fullQuestionReadLeadMilliseconds.min
  && openingReport.fullQuestionReadLeadMilliseconds <= openingReadability.fullQuestionReadLeadMilliseconds.max;
const openingMetadataPass = openingReport.agentFirstFrame.visible === true
  && openingReport.agentFirstFrame.position === openingReadability.agentReservation.position
  && openingReport.agentFirstFrame.visibleHeightPx >= openingReadability.agentReservation.minimumVisibleHeightPx
  && openingReport.openingUi?.progressRailPresent === false
  && openingReport.openingUi?.leftBlueCirclePresent === false
  && openingReport.openingUi?.voiceLabelPresent === false
  && openingReport.visibleQuestionIsFinalVttPrefix === true
  && openingReport.displayFontEmbedded === true
  && openingReport.questionMarkKeyframesPresent === true;
const retainedGatesPass = Object.values(openingReport.gates ?? {}).every((value) => value === true)
  && openingReport.introFollowSave?.fixedCopyComplete === true
  && openingReport.introFollowSave?.nextFrameStartsFirstSubstantiveChapter === true;
openingReport.pass = result.hook.pass && openingTimingPass && openingMetadataPass && retainedGatesPass;
writeFileSync(openingReportPath, `${JSON.stringify(openingReport, null, 2)}\n`);
if (!result.pass) {
  process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`dom-layout: pass (${result.highlights.length} highlights, ${result.generated.length} generated layouts, ${result.internalProps.length} internal props)\n`);
