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
const episode = JSON.parse(readFileSync(path.join(projectDir, 'episode.json'), 'utf8'));
const onScreenTextCompleteness = activeProfile.postSnapshotUserOverrides?.onScreenTextCompleteness;
if (onScreenTextCompleteness?.status !== 'active') throw new Error('Active Tiny Agent profile is missing onScreenTextCompleteness.');
const openingReportPath = path.join(qaDir, 'retention-opening-report.json');
const onScreenTextReportPath = path.join(qaDir, 'on-screen-text-completeness-report.json');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const baseHref = `${pathToFileURL(projectDir).href}/`;
const documentHtml = readFileSync(path.join(projectDir, 'index.html'), 'utf8')
  .replace('<head>', `<head><base href="${baseHref}">`)
  .replace(/<audio\b[^>]*><\/audio>/g, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
await page.setContent(documentHtml, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]); });

const result = await page.evaluate(({ openingReadability, locale, openingAccentTokens }) => {
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
  const screenTextUnits = [...document.querySelectorAll('[data-screen-copy-id]')].map((element) => ({
    id: element.dataset.screenCopyId,
    kind: element.dataset.screenCopyKind,
    text: element.textContent.trim()
  }));
  const outroTitle = document.querySelector('.outro h2');
  if (outroTitle) screenTextUnits.push({ id: 'outro:title', kind: 'outro-title', text: outroTitle.textContent.trim() });
  [...document.querySelectorAll('.outro p span')].forEach((element, index) => {
    screenTextUnits.push({ id: `outro:line-${index + 1}`, kind: 'outro-line', text: element.textContent.trim() });
  });
  const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight };
  const hookQuestion = rect(document.querySelector('.hook-question'));
  const hookAgent = rect(document.querySelector('.hook-agent'));
  const hookGlyphs = [...document.querySelectorAll('.hook-glyph')].map((element) => ({ text: element.textContent, rect: rect(element) }));
  const hookLines = [...document.querySelectorAll('.hook-line')];
  const uniformTypography = openingReadability.uniformAdaptiveTypography ?? {};
  const typographyIsScoped = uniformTypography.status === 'active' && uniformTypography.scope?.includes(locale);
  const lineFontSizesPx = hookLines.map((line) => round(parseFloat(getComputedStyle(line).fontSize)));
  const lineFontFamilies = hookLines.map((line) => getComputedStyle(line).fontFamily.split(',')[0].replace(/["']/g, '').trim());
  const lineFontWeights = hookLines.map((line) => getComputedStyle(line).fontWeight);
  const accentRuns = [];
  let activeAccentRun;
  for (const glyph of [...document.querySelectorAll('.hook-glyph')]) {
    const tone = glyph.dataset.hookAccent ?? 'base';
    if (tone === activeAccentRun?.tone) {
      activeAccentRun.text += glyph.textContent;
    } else {
      if (activeAccentRun) accentRuns.push(activeAccentRun);
      activeAccentRun = tone === 'base' ? undefined : { tone, text: glyph.textContent, color: getComputedStyle(glyph).color };
    }
  }
  if (activeAccentRun) accentRuns.push(activeAccentRun);
  const expectedAccents = openingAccentTokens ?? uniformTypography.accentTokens?.[locale] ?? [];
  const typography = {
    scoped: typographyIsScoped,
    fontFamily: lineFontFamilies[0] ?? '',
    fontWeight: lineFontWeights[0] ?? '',
    lineFontSizesPx,
    lineFontFamilies,
    lineFontWeights,
    uniformFontSizePass: !typographyIsScoped || (lineFontSizesPx.length > 0 && new Set(lineFontSizesPx).size === 1),
    fontFamilyPass: !typographyIsScoped || lineFontFamilies.every((fontFamily) => fontFamily === uniformTypography.fontFamily),
    fontWeightPass: !typographyIsScoped || lineFontWeights.every((fontWeight) => fontWeight === String(uniformTypography.fontWeight)),
    accentRuns,
    accentTokenPass: !typographyIsScoped || expectedAccents.every((expectedAccent) => {
      const expectedText = String(expectedAccent.token).replace(/\s+/g, '');
      return accentRuns.some((run) => run.tone === expectedAccent.tone && run.text.replace(/\s+/g, '').includes(expectedText));
    })
  };
  typography.pass = typography.uniformFontSizePass && typography.fontFamilyPass && typography.fontWeightPass && typography.accentTokenPass;
  const hookMarker = rect(document.querySelector('.hook-marker'));
  const hookBurst = rect(document.querySelector('.hook-burst'));
  const glyphBounds = union(hookGlyphs.map((item) => item.rect));
  glyphBounds.width = round(glyphBounds.right - glyphBounds.left);
  glyphBounds.height = round(glyphBounds.bottom - glyphBounds.top);
  const lineGlyphBounds = Object.values(hookGlyphs.reduce((rows, item) => {
    const key = `${item.rect.top}:${item.rect.bottom}`;
    rows[key] ??= [];
    rows[key].push(item.rect);
    return rows;
  }, {})).map((rects) => {
    const bounds = union(rects);
    return {
      ...bounds,
      width: round(bounds.right - bounds.left),
      height: round(bounds.bottom - bounds.top)
    };
  }).sort((a, b) => a.top - b.top);
  const consecutiveInterlineGapsPx = lineGlyphBounds.slice(1).map((bounds, index) => round(bounds.top - lineGlyphBounds[index].bottom));
  const glyphMassHeightPx = round(lineGlyphBounds.reduce((total, bounds) => total + bounds.height, 0));
  const glyphMassHeightPercent = round((glyphMassHeightPx / innerHeight) * 100);
  const compactTextBlock = openingReadability.compactTextBlock ?? {};
  const compactTextBlockPass = lineGlyphBounds.length >= compactTextBlock.semanticLineCount?.min
    && lineGlyphBounds.length <= compactTextBlock.semanticLineCount?.max
    && glyphMassHeightPercent >= compactTextBlock.glyphMassHeightPercent?.min
    && glyphMassHeightPercent <= compactTextBlock.glyphMassHeightPercent?.max
    && consecutiveInterlineGapsPx.every((gap) => gap >= 0 && gap <= compactTextBlock.maxInterlineGapPx);
  const glyphCoveragePercent = {
    width: round((glyphBounds.width / innerWidth) * 100),
    height: round((glyphBounds.height / innerHeight) * 100)
  };
  const coveragePass = glyphCoveragePercent.width >= openingReadability.canvasGlyphCoveragePercent.width.min
    && glyphCoveragePercent.width <= openingReadability.canvasGlyphCoveragePercent.width.max
    && glyphCoveragePercent.height >= openingReadability.canvasGlyphCoveragePercent.height.min
    && glyphCoveragePercent.height <= openingReadability.canvasGlyphCoveragePercent.height.max;
  // Collisions are checked per final glyph. The compact text gate separately
  // rejects a distant-row layout that would inflate an outer bounding box.
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
    lineGlyphBounds,
    consecutiveInterlineGapsPx,
    glyphMassHeightPx,
    glyphMassHeightPercent,
    maxInterlineGapPx: Math.max(0, ...consecutiveInterlineGapsPx),
    compactTextBlockPass,
    typography,
    coverageTargetPercent: openingReadability.canvasGlyphCoveragePercent,
    coveragePass,
    noReservedOverlap,
    pass: within(hookQuestion, viewport) && within(hookAgent, viewport) && within(hookMarker, viewport) && within(hookBurst, viewport)
      && hookGlyphs.every((item) => within(item.rect, viewport)) && coveragePass && compactTextBlockPass && typography.pass && noReservedOverlap
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    pass: hook.pass && highlights.every((item) => item.pass) && generated.every((item) => item.pass) && props.every((item) => item.pass) && generatedArt.every((item) => item.pass),
    hook,
    highlights,
    generated,
    internalProps: props,
    generatedArt,
    screenTextUnits
  };
}, {
  openingReadability,
  locale: episode.locale,
  openingAccentTokens: episode.openingAccentTokens
});

await browser.close();
const onScreenTextReport = JSON.parse(readFileSync(onScreenTextReportPath, 'utf8'));
const normalizeScreenText = (value) => String(value ?? '').replace(/[\s·]/g, '');
const expectedScreenText = onScreenTextReport.entries ?? [];
const unitsById = new Map();
for (const unit of result.screenTextUnits) {
  const units = unitsById.get(unit.id) ?? [];
  units.push(unit);
  unitsById.set(unit.id, units);
}
const missingScreenTextUnits = expectedScreenText.filter((entry) => !unitsById.has(entry.id)).map((entry) => entry.id);
const duplicateScreenTextUnits = [...unitsById.entries()].filter(([, units]) => units.length !== 1).map(([id]) => id);
const mismatchedScreenTextUnits = expectedScreenText.flatMap((entry) => {
  const actual = unitsById.get(entry.id)?.[0];
  return actual && normalizeScreenText(actual.text) !== normalizeScreenText(entry.text)
    ? [{ id: entry.id, expected: entry.text, actual: actual.text }]
    : [];
});
const unexpectedScreenTextUnits = result.screenTextUnits.filter((unit) => !expectedScreenText.some((entry) => entry.id === unit.id)).map((unit) => unit.id);
const renderedDomScanPass = missingScreenTextUnits.length === 0
  && duplicateScreenTextUnits.length === 0
  && mismatchedScreenTextUnits.length === 0
  && unexpectedScreenTextUnits.length === 0;
onScreenTextReport.renderedDomScanPass = renderedDomScanPass;
onScreenTextReport.renderedDom = {
  source: 'qa/dom-layout-report.json',
  units: result.screenTextUnits,
  missingScreenTextUnits,
  duplicateScreenTextUnits,
  mismatchedScreenTextUnits,
  unexpectedScreenTextUnits
};
onScreenTextReport.pass = onScreenTextReport.pass === true && renderedDomScanPass;
writeFileSync(onScreenTextReportPath, `${JSON.stringify(onScreenTextReport, null, 2)}\n`);
result.screenTextCompleteness = { pass: onScreenTextReport.pass, missingScreenTextUnits, duplicateScreenTextUnits, mismatchedScreenTextUnits, unexpectedScreenTextUnits };
result.pass = result.pass && onScreenTextReport.pass;
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
  lineGlyphBounds: result.hook.lineGlyphBounds,
  consecutiveInterlineGapsPx: result.hook.consecutiveInterlineGapsPx,
  glyphMassHeightPx: result.hook.glyphMassHeightPx,
  glyphMassHeightPercent: result.hook.glyphMassHeightPercent,
  maxInterlineGapPx: result.hook.maxInterlineGapPx,
  compactTextBlockPass: result.hook.compactTextBlockPass,
  typography: result.hook.typography,
  noReservedOverlap: result.hook.noReservedOverlap
};
const openingTimingPass = openingReport.firstGlyphLeadMilliseconds >= openingReadability.firstGlyphLeadMilliseconds.min
  && openingReport.firstGlyphLeadMilliseconds <= openingReadability.firstGlyphLeadMilliseconds.max
  && Array.isArray(openingReport.perGlyphAudibleLeadMilliseconds?.values)
  && openingReport.perGlyphAudibleLeadMilliseconds.values.length > 0
  && openingReport.perGlyphAudibleLeadMilliseconds.values.every((unit) => unit.leadMilliseconds >= openingReadability.perGlyphAudibleLeadMilliseconds.min
    && unit.leadMilliseconds <= openingReadability.perGlyphAudibleLeadMilliseconds.max)
  && openingReport.maximumPerGlyphLeadMilliseconds <= openingReadability.maximumPerGlyphLeadMilliseconds
  && openingReport.literalQuestionCompletionLeadMilliseconds >= openingReadability.literalQuestionCompletionLeadMilliseconds.min
  && openingReport.literalQuestionCompletionLeadMilliseconds <= openingReadability.literalQuestionCompletionLeadMilliseconds.max
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
