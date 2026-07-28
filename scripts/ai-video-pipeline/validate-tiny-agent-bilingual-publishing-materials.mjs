#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profile = JSON.parse(fs.readFileSync(
  path.join(
    repoRoot,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json',
  ),
  'utf8',
));
const rule = profile.postSnapshotUserOverrides?.bilingualPublishingMaterials ?? {};
const fixedFollowSentences = {
  'zh-CN': '关注 Tiny Agent，成为更擅长使用 AI 的人！',
  'en-US': 'Follow Tiny Agent. Tiny Agent helps you get better at using AI.',
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    if (key === 'self-test') {
      args[key] = true;
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function sameValue(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function projectRunKey(projectDir) {
  return projectDir.match(/\b(\d{4}-\d{2}-\d{2}-03)\b/)?.[1] ?? null;
}

function appliesToRun(runKey) {
  return typeof runKey === 'string'
    && runKey.localeCompare(rule.effectiveFromRunKey ?? '9999-99-99-99') >= 0;
}

function finalNonHashtagLine(description) {
  return String(description || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()
    .find((line) => !line.startsWith('#')) ?? '';
}

function metadataKeywords(metadata) {
  return [
    metadata.primaryKeyword,
    ...(Array.isArray(metadata.secondaryKeywords) ? metadata.secondaryKeywords : []),
  ].filter((value) => typeof value === 'string' && value.trim());
}

function readLocaleProject(projectDir, locale) {
  const metadataName = `publish-metadata.${locale}.json`;
  const materialName = rule.files?.[locale] ?? `local-publishing-materials.${locale}.json`;
  const metadataBuffer = fs.readFileSync(path.join(projectDir, metadataName));
  const materialBuffer = fs.readFileSync(path.join(projectDir, materialName));
  return {
    projectDir,
    locale,
    metadataName,
    materialName,
    metadataBuffer,
    materialBuffer,
    metadata: JSON.parse(metadataBuffer.toString('utf8')),
    material: JSON.parse(materialBuffer.toString('utf8')),
  };
}

function validateLocale(entry) {
  const failures = [];
  const check = (name, pass, detail = null) => {
    if (!pass) failures.push({ name, detail });
    return pass;
  };
  const { locale, metadata, material } = entry;
  const requiredFields = rule.requiredFields ?? [];
  const expectedSuggestions = rule.interactionSuggestions?.stableIdsAndAngles ?? [];
  const suggestions = Array.isArray(material.interactionSuggestions)
    ? material.interactionSuggestions
    : [];
  const suggestionTexts = suggestions.map((suggestion) => String(suggestion?.text || '').trim());
  const checks = {
    schemaAndLocale: check(
      `${locale}.schemaAndLocale`,
      material.schemaVersion === 1
        && material.locale === locale
        && typeof material.materialId === 'string'
        && material.materialId.trim().length > 0,
    ),
    requiredFields: check(
      `${locale}.requiredFields`,
      requiredFields.every((field) => material[field] !== undefined),
      requiredFields.filter((field) => material[field] === undefined),
    ),
    metadataBinding: check(
      `${locale}.metadataBinding`,
      material.title === metadata.title
        && material.description === metadata.description
        && sameValue(material.hashtags, metadata.hashtags)
        && sameValue(material.keywords, metadataKeywords(metadata)),
    ),
    fixedFollowSentence: check(
      `${locale}.fixedFollowSentence`,
      finalNonHashtagLine(material.description) === fixedFollowSentences[locale],
    ),
    interactionCount: check(
      `${locale}.interactionCount`,
      suggestions.length === rule.interactionSuggestions?.exactCount,
      suggestions.length,
    ),
    interactionShape: check(
      `${locale}.interactionShape`,
      suggestions.length === expectedSuggestions.length
        && suggestions.every((suggestion, index) => (
          suggestion?.id === expectedSuggestions[index]?.id
          && suggestion?.angle === expectedSuggestions[index]?.angle
          && typeof suggestion?.text === 'string'
          && suggestion.text.trim().length >= 8
        )),
    ),
    interactionDistinctness: check(
      `${locale}.interactionDistinctness`,
      new Set(suggestionTexts).size === suggestionTexts.length
        && suggestionTexts.every(Boolean),
    ),
    review: check(
      `${locale}.review`,
      material.review?.sameTopicAndClaims === true
        && material.review?.naturalLocalization === true
        && material.review?.noFabricatedEvidenceOrEngagement === true,
    ),
  };
  return { checks, failures };
}

function buildReport(english, chinese) {
  const runKey = projectRunKey(chinese.projectDir);
  const englishRunKey = projectRunKey(english.projectDir);
  const applicable = appliesToRun(runKey);
  if (!applicable) {
    return {
      version: 1,
      contractProfileId: profile.profileId,
      applicable: false,
      effectiveFromRunKey: rule.effectiveFromRunKey,
      pair: {
        runKey,
        englishProject: english.projectDir,
        chineseProject: chinese.projectDir,
      },
      pass: runKey !== null && runKey === englishRunKey,
      failures: [],
    };
  }
  const englishResult = validateLocale(english);
  const chineseResult = validateLocale(chinese);
  const crossLocaleFailures = [];
  const crossCheck = (name, pass, detail = null) => {
    if (!pass) crossLocaleFailures.push({ name, detail });
    return pass;
  };
  const englishSuggestions = english.material.interactionSuggestions ?? [];
  const chineseSuggestions = chinese.material.interactionSuggestions ?? [];
  const checks = {
    runKey: crossCheck(
      'runKey',
      runKey !== null && runKey === englishRunKey,
      { english: englishRunKey, chinese: runKey },
    ),
    sharedMaterialId: crossCheck(
      'sharedMaterialId',
      english.material.materialId === chinese.material.materialId,
    ),
    pairedInteractionIdsAndAngles: crossCheck(
      'pairedInteractionIdsAndAngles',
      sameValue(
        englishSuggestions.map(({ id, angle }) => ({ id, angle })),
        chineseSuggestions.map(({ id, angle }) => ({ id, angle })),
      ),
    ),
    naturalEnglishCounterpart: crossCheck(
      'naturalEnglishCounterpart',
      english.material.review?.naturalLocalization === true
        && english.material.review?.sameTopicAndClaims === true
        && english.material.title !== chinese.material.title
        && english.material.description !== chinese.material.description
        && englishSuggestions.every((suggestion, index) => (
          suggestion?.text !== chineseSuggestions[index]?.text
        )),
    ),
  };
  const failures = [
    ...englishResult.failures,
    ...chineseResult.failures,
    ...crossLocaleFailures,
  ];
  return {
    version: 1,
    contractProfileId: profile.profileId,
    applicable: true,
    effectiveFromRunKey: rule.effectiveFromRunKey,
    materialId: chinese.material.materialId,
    pair: {
      runKey,
      englishProject: english.projectDir,
      chineseProject: chinese.projectDir,
    },
    pass: failures.length === 0,
    checks: {
      'en-US': englishResult.checks,
      'zh-CN': chineseResult.checks,
      crossLocale: checks,
    },
    artifactHashes: {
      'en-US': {
        [english.metadataName]: sha256(english.metadataBuffer),
        [english.materialName]: sha256(english.materialBuffer),
      },
      'zh-CN': {
        [chinese.metadataName]: sha256(chinese.metadataBuffer),
        [chinese.materialName]: sha256(chinese.materialBuffer),
      },
    },
    failures,
  };
}

function writeReport(projectDir, reportText) {
  const reportPath = rule.files?.report ?? 'qa/bilingual-publishing-materials-report.json';
  fs.mkdirSync(path.dirname(path.join(projectDir, reportPath)), { recursive: true });
  fs.writeFileSync(path.join(projectDir, reportPath), reportText);
}

function selfTestFixture() {
  const make = (locale) => {
    const metadata = {
      locale,
      title: locale === 'en-US' ? 'How AI Agents Choose Work' : 'AI Agent 怎样选择任务？',
      description: locale === 'en-US'
        ? `A practical method.\n\n${fixedFollowSentences[locale]}\n\n#AIAgents #TinyAgent`
        : `一套可执行方法。\n\n${fixedFollowSentences[locale]}\n\n#AIAgent #TinyAgent`,
      hashtags: locale === 'en-US' ? ['#AIAgents', '#TinyAgent'] : ['#AIAgent', '#TinyAgent'],
      primaryKeyword: locale === 'en-US' ? 'AI Agent tasks' : 'AI Agent 任务',
      secondaryKeywords: locale === 'en-US' ? ['agent workflow'] : ['智能体工作流'],
    };
    const texts = locale === 'en-US'
      ? [
        'Which task would you delegate first, and why?',
        'Where would you keep human approval in this workflow?',
        'What has changed your view of AI Agent delegation?',
      ]
      : [
        '你最想先把哪类任务交给 AI Agent？',
        '这套流程里，你会把人工确认放在哪一步？',
        '你对 AI Agent 委托的看法发生过什么变化？',
      ];
    const material = {
      schemaVersion: 1,
      materialId: 'fixture-material',
      locale,
      title: metadata.title,
      description: metadata.description,
      hashtags: metadata.hashtags,
      keywords: metadataKeywords(metadata),
      interactionSuggestions: rule.interactionSuggestions.stableIdsAndAngles.map((entry, index) => ({
        ...entry,
        text: texts[index],
      })),
      review: {
        sameTopicAndClaims: true,
        naturalLocalization: true,
        noFabricatedEvidenceOrEngagement: true,
      },
    };
    return {
      projectDir: `/tmp/${rule.effectiveFromRunKey}-fixture-${locale}`,
      locale,
      metadataName: `publish-metadata.${locale}.json`,
      materialName: `local-publishing-materials.${locale}.json`,
      metadata,
      material,
      metadataBuffer: Buffer.from(`${JSON.stringify(metadata)}\n`),
      materialBuffer: Buffer.from(`${JSON.stringify(material)}\n`),
    };
  };
  return { english: make('en-US'), chinese: make('zh-CN') };
}

function runSelfTest() {
  const fixture = selfTestFixture();
  if (!buildReport(fixture.english, fixture.chinese).pass) {
    throw new Error('positive bilingual publishing-materials fixture failed');
  }
  const mutations = [
    (value) => { value.english.material.materialId = 'wrong-material'; },
    (value) => { value.english.material.interactionSuggestions.pop(); },
    (value) => { value.chinese.material.title = 'metadata mismatch'; },
    (value) => { value.english.material.review.naturalLocalization = false; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(fixture);
    mutate(value);
    if (buildReport(value.english, value.chinese).pass) {
      throw new Error('bilingual publishing-materials fail-closed mutation unexpectedly passed');
    }
  }
  process.stdout.write(
    'Tiny Agent bilingual publishing-materials self-test passed: positive fixture and four fail-closed mutations.\n',
  );
}

const args = parseArgs(process.argv.slice(2));
if (args['self-test']) {
  runSelfTest();
} else {
  if (!args['english-project'] || !args['chinese-project']) {
    console.error(
      'Usage: node scripts/ai-video-pipeline/validate-tiny-agent-bilingual-publishing-materials.mjs --english-project <EN_PROJECT_DIR> --chinese-project <ZH_PROJECT_DIR>',
    );
    process.exit(2);
  }
  const englishProject = path.resolve(repoRoot, args['english-project']);
  const chineseProject = path.resolve(repoRoot, args['chinese-project']);
  const runKey = projectRunKey(chineseProject);
  const englishRunKey = projectRunKey(englishProject);
  let report;
  try {
    if (!appliesToRun(runKey) && runKey === englishRunKey) {
      report = {
        version: 1,
        contractProfileId: profile.profileId,
        applicable: false,
        effectiveFromRunKey: rule.effectiveFromRunKey,
        pair: { runKey, englishProject, chineseProject },
        pass: true,
        failures: [],
      };
    } else {
      report = buildReport(
        readLocaleProject(englishProject, 'en-US'),
        readLocaleProject(chineseProject, 'zh-CN'),
      );
    }
  } catch (error) {
    console.error(`Tiny Agent bilingual publishing-materials validation could not load the project pair: ${error.message}`);
    process.exit(1);
  }
  const reportText = `${JSON.stringify(report, null, 2)}\n`;
  writeReport(englishProject, reportText);
  writeReport(chineseProject, reportText);
  process.stdout.write(reportText);
  if (!report.pass) process.exitCode = 1;
}
