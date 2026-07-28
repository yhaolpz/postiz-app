#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const englishIdentityPattern = /\bAI[\s-]+Agents?\b/i;
const chineseIdentityPattern = /AI[\s-]*Agents?|智能体/i;
const fixedFollowSentences = {
  'en-US': 'Follow Tiny Agent. Tiny Agent helps you get better at using AI.',
  'zh-CN': '关注 Tiny Agent，成为更擅长使用 AI 的人！',
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    args[item.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function checkEnglishTitleAgency(value) {
  const text = normalizeText(value);
  const agentSkillTopicLead = /^AI[\s-]+Agents?\s+Skills?\b/i.test(text);
  const agentActorLead = /^(?:How\s+(?:(?:can|do|does)\s+)?)?AI[\s-]+Agents?\b/i.test(text);
  const humanAuthoredSkillAction = /(?:write|create|design|build|make|turn|convert|transform).{0,48}\bSkills?\b/i.test(text);
  const explicitForAgentTarget = /\bfor\s+(?:an?\s+)?AI[\s-]+Agents?\b/i.test(text);
  const ambiguousAgentAsAuthor = agentActorLead
    && !agentSkillTopicLead
    && humanAuthoredSkillAction
    && !explicitForAgentTarget;
  return {
    hasAccurateAgency: !ambiguousAgentAsAuthor,
    agencyRisk: ambiguousAgentAsAuthor ? 'agent-as-author-for-human-authored-skill' : 'none',
  };
}

export function checkChineseTitleAgency(value) {
  const text = normalizeText(value);
  const agentSkillTopicLead = /^(?:AI[\s-]*Agents?|智能体)\s*(?:Skills?|技能)\b/i.test(text);
  const agentActorLead = /^(?:AI[\s-]*Agents?|智能体)(?!\s*(?:Skills?|技能)\b)/i.test(text);
  const directSkillCreation = /(?:写(?:好|出)?|编写|创建|制作|设计|构建|打造).{0,24}(?:Skills?|技能)/i.test(text);
  const transformIntoSkill = /把.{0,32}(?:变成|转成|转化成|沉淀成).{0,20}(?:Skills?|技能)/i.test(text);
  const explicitForAgentTarget = /(?:为|给|面向)\s*(?:AI[\s-]*Agents?|智能体)/i.test(text);
  const ambiguousAgentAsAuthor = agentActorLead
    && !agentSkillTopicLead
    && (directSkillCreation || transformIntoSkill)
    && !explicitForAgentTarget;
  return {
    hasAccurateAgency: !ambiguousAgentAsAuthor,
    agencyRisk: ambiguousAgentAsAuthor ? 'agent-as-author-for-human-authored-skill' : 'none',
  };
}

export function checkEnglishTitle(value, scope = 'English title') {
  const text = normalizeText(value);
  const contextWords = text
    .replace(/\bAI[\s-]+Agents?\b/gi, ' ')
    .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];
  const hasIdentity = englishIdentityPattern.test(text);
  const hasSpecificContext = contextWords.length >= 2;
  const agency = checkEnglishTitleAgency(text);
  return {
    scope,
    text,
    hasIdentity,
    hasSpecificContext,
    ...agency,
    pass: hasIdentity && hasSpecificContext && agency.hasAccurateAgency,
  };
}

export function checkChineseTitle(value, scope = 'Chinese title') {
  const text = normalizeText(value);
  const context = text
    .replace(/AI[\s-]*Agents?/gi, '')
    .replace(/智能体/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
  const hasIdentity = chineseIdentityPattern.test(text);
  const hasSpecificContext = context.length >= 4;
  const agency = checkChineseTitleAgency(text);
  return {
    scope,
    text,
    hasIdentity,
    hasSpecificContext,
    ...agency,
    pass: hasIdentity && hasSpecificContext && agency.hasAccurateAgency,
  };
}

function coverText(spec) {
  return normalizeText(spec.headline || spec.titleLines?.join(' '));
}

function checkDescriptionFollowSentence(value, locale, scope) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const finalNonHashtagLine = [...lines].reverse().find((line) => !line.startsWith('#')) || '';
  const expected = fixedFollowSentences[locale];
  return {
    scope,
    expected,
    finalNonHashtagLine,
    pass: finalNonHashtagLine === expected,
  };
}

async function writeReport(projectDir, report) {
  const qaDir = path.join(projectDir, 'qa');
  await fs.mkdir(qaDir, { recursive: true });
  await fs.writeFile(
    path.join(qaDir, 'title-identity-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

export async function validateProjects(englishProject, chineseProject) {
  const [englishMetadata, englishSummary, englishCover, chineseMetadata, chineseSummary] = await Promise.all([
    readJson(path.join(englishProject, 'publish-metadata.en-US.json')),
    readJson(path.join(englishProject, 'summary.json')),
    readJson(path.join(englishProject, 'thumbnails/thumbnail-spec.en-US.16x9.json')),
    readJson(path.join(chineseProject, 'publish-metadata.zh-CN.json')),
    readJson(path.join(chineseProject, 'summary.json')),
  ]);
  const chineseCoverRatios = ['16x9', '4x3', '3x4'];
  const chineseCovers = await Promise.all(chineseCoverRatios.map((ratio) => (
    readJson(path.join(chineseProject, `thumbnails/thumbnail-spec.zh-CN.${ratio}.json`))
  )));

  const englishChecks = [
    checkEnglishTitle(englishMetadata.title, 'English final YouTube title'),
    ...englishMetadata.titleCandidates.map((title, index) => (
      checkEnglishTitle(title, `English title candidate ${index + 1}`)
    )),
    checkEnglishTitle(englishMetadata.thumbnailText, 'English metadata thumbnail text'),
    checkEnglishTitle(englishSummary.title, 'English in-video topic title'),
    checkEnglishTitle(coverText(englishCover), 'English rendered cover title'),
  ];
  const chineseChecks = [
    checkChineseTitle(chineseMetadata.title, 'Chinese generic title'),
    checkChineseTitle(chineseMetadata.thumbnailText, 'Chinese metadata thumbnail text'),
    checkChineseTitle(chineseSummary.title, 'Chinese in-video topic title'),
    ...chineseCovers.map((spec, index) => (
      checkChineseTitle(coverText(spec), `Chinese ${chineseCoverRatios[index]} rendered cover title`)
    )),
  ];
  const metadataChecks = [
    checkDescriptionFollowSentence(
      englishMetadata.description,
      'en-US',
      'English description final non-hashtag line',
    ),
    checkDescriptionFollowSentence(
      chineseMetadata.description,
      'zh-CN',
      'Chinese description final non-hashtag line',
    ),
  ];
  const checks = [...englishChecks, ...chineseChecks, ...metadataChecks];
  const report = {
    version: 3,
    rule: 'Every audience-facing title identifies AI Agent(s) or 智能体, states a concrete topic, and preserves the real semantic actor; each publishing description ends with the locale fixed follow sentence before hashtags.',
    pass: checks.every((check) => check.pass),
    checks,
  };
  await Promise.all([
    writeReport(englishProject, report),
    writeReport(chineseProject, report),
  ]);
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args['english-project'] || !args['chinese-project']) {
    throw new Error('Usage: validate-tiny-agent-title-identity.mjs --english-project <dir> --chinese-project <dir>');
  }
  const englishProject = path.resolve(repoRoot, args['english-project']);
  const chineseProject = path.resolve(repoRoot, args['chinese-project']);
  const report = await validateProjects(englishProject, chineseProject);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.pass) {
    const failures = report.checks.filter((check) => !check.pass).map((check) => check.scope);
    throw new Error(`Tiny Agent title identity QA failed: ${failures.join(', ')}`);
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
