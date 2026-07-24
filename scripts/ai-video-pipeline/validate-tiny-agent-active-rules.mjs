import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const codexHome =
  process.env.CODEX_HOME ?? path.join(process.env.HOME ?? '', '.codex');
const snapshotId = '2026-07-23-scheduled-6m18';
const snapshotDir = path.join(
  root,
  'scripts/ai-video-pipeline/style-guides/snapshots',
  snapshotId
);
const sourceCommit = '457ba42d110d259ed03c4b008e1af2cc8b0b9935';
const profileId = 'tiny-agent-longform-scheduled-6m18-2026-07-23';

const files = {
  contentPlan: path.join(
    root,
    'scripts/ai-video-pipeline/content-plans/tiny-agent-longform-plan.md'
  ),
  runbook: path.join(
    root,
    'scripts/ai-video-pipeline/automation-guides/tiny-agent-daily-longform.md'
  ),
  commonGuide: path.join(
    root,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md'
  ),
  historicalDeepGuide: path.join(
    root,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-deep-longform-cognitive-load.md'
  ),
  activeProfile: path.join(
    root,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json'
  ),
  manifest: path.join(snapshotDir, 'manifest.json'),
  invocation: path.join(snapshotDir, 'automation-invocation.txt'),
  prompt: path.join(snapshotDir, 'automation-prompt.txt'),
  snapshotGuide: path.join(snapshotDir, 'tiny-agent-longform.md'),
  implementationProfile: path.join(
    snapshotDir,
    'implementation-profile.zh-CN.json'
  ),
  automation: path.join(codexHome, 'automations/tiny-agent/automation.toml'),
  memory: path.join(codexHome, 'automations/tiny-agent/memory.md'),
  voiceReadme: path.join(
    root,
    'scripts/ai-video-pipeline/voice-catalogs/edge-tts/README.md'
  ),
};

const expectedHashes = {
  'automation-invocation.txt':
    '8a0c26879bc04f3c2d30754f79618365e8ad0587227c2a3d39cf711fdb571432',
  'automation-prompt.txt':
    'ca42a5e44c9243554d233e4f547fbd8268979045835bf4172fee55c45b960766',
  'tiny-agent-longform.md':
    '467a8a881b09f1c05eba8ed7cc7319289b53ae140f155e6d5be24dbd18ada2af',
  'implementation-profile.zh-CN.json':
    'd43497e418293adff1b50eb78d4b9c1c93f46f634ff652a2f6e7014203ea48cb',
};

const referenceArtifacts = {
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/BRIEF.md':
    '0687be6f50778359a37fae830f5f092b0e641d06c734aa50f6f359956823c14d',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/production-profile.json':
    'd43497e418293adff1b50eb78d4b9c1c93f46f634ff652a2f6e7014203ea48cb',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/episode.json':
    '97e4d1047000cad21bfac214cc1f71e1b741151cf90ac4fd265ba9d126fc3ef6',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/scene-plan.json':
    '7b1fb7e3982451aecea935cfe654598ca20dfbeacc8b4c6ebe7d06525626a6a2',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/animation-plan.json':
    '4d9b6bcb67851df6a8abdbec9ed9efce167736aa7f034ee3d14be5fff634d2a7',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/build.mjs':
    'b9e662c7e8f4cf3864751aaaf3d54946886d8e9a699d345286938e4c0bddfa77',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/qa/motion-report.json':
    '3de3d66b457b5d8df75fba28def7818bf88100d9df5e94825c490003f0a8ee34',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/qa/retention-opening-report.json':
    '7cb5301c4ef474eb7fa7162007ffe9bbb2fe6a18922d5ea667980f82434f7c2c',
};

const expectedChineseRenderHash =
  'c3f3ca90f1de71caa5b4f86f3376bf2acc8a1c0e380b39cc8cdb38589b4ae4d4';
const expectedEnglishRenderHash =
  'ddc688cf2d531b7c24166cad8d7563bb4e4d3167ea8ca2da010b8d5b1de03d5b';

const errors = [];

function readBuffer(label, file) {
  if (!fs.existsSync(file)) {
    errors.push(`${label}: missing ${file}`);
    return Buffer.alloc(0);
  }
  return fs.readFileSync(file);
}

function readText(label, file) {
  return readBuffer(label, file).toString('utf8');
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${label}: invalid JSON: ${error.message}`);
    return {};
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function requireEqual(label, actual, expected) {
  if (actual !== expected) {
    errors.push(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
}

function requireMatch(label, text, pattern) {
  if (!pattern.test(text)) {
    errors.push(`${label}: missing required rule ${pattern}`);
  }
}

function forbidMatch(label, text, pattern, description) {
  if (pattern.test(text)) {
    errors.push(`${label}: contains inactive generation rule ${description}`);
  }
}

function readCommitted(relativePath) {
  try {
    return execFileSync('git', ['show', `${sourceCommit}:${relativePath}`], {
      cwd: root,
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    errors.push(
      `git:${relativePath}: cannot read from ${sourceCommit}: ${error.message}`
    );
    return Buffer.alloc(0);
  }
}

const text = {
  contentPlan: readText('contentPlan', files.contentPlan),
  runbook: readText('runbook', files.runbook),
  commonGuide: readText('commonGuide', files.commonGuide),
  historicalDeepGuide: readText(
    'historicalDeepGuide',
    files.historicalDeepGuide
  ),
  activeProfile: readText('activeProfile', files.activeProfile),
  manifest: readText('manifest', files.manifest),
  invocation: readText('invocation', files.invocation),
  prompt: readText('prompt', files.prompt),
  snapshotGuide: readText('snapshotGuide', files.snapshotGuide),
  implementationProfile: readText(
    'implementationProfile',
    files.implementationProfile
  ),
  automation: readText('automation', files.automation),
  memory: readText('memory', files.memory),
  voiceReadme: readText('voiceReadme', files.voiceReadme),
};

const profile = parseJson('activeProfile', text.activeProfile);
const manifest = parseJson('manifest', text.manifest);
const implementationProfile = parseJson(
  'implementationProfile',
  text.implementationProfile
);

for (const [name, expected] of Object.entries(expectedHashes)) {
  requireEqual(
    `snapshot:${name}:sha256`,
    sha256(readBuffer(`snapshot:${name}`, path.join(snapshotDir, name))),
    expected
  );
}

const committedGuide = readCommitted(
  'scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md'
);
requireEqual(
  'snapshotGuide:commitCopy',
  sha256(readBuffer('snapshotGuide', files.snapshotGuide)),
  sha256(committedGuide)
);
requireEqual(
  'commonGuide:snapshotCopy',
  sha256(readBuffer('commonGuide', files.commonGuide)),
  expectedHashes['tiny-agent-longform.md']
);

requireEqual('activeProfile.schemaVersion', profile.schemaVersion, 2);
requireEqual('activeProfile.status', profile.status, 'active-frozen-snapshot');
requireEqual('activeProfile.profileId', profile.profileId, profileId);
requireEqual(
  'activeProfile.sourceCommit',
  profile.sourceSnapshot?.sourceCommit,
  sourceCommit
);
requireEqual(
  'activeProfile.chineseRenderHash',
  profile.sourceSnapshot?.referenceChineseRenderSha256,
  expectedChineseRenderHash
);
requireEqual(
  'activeProfile.englishRenderHash',
  profile.sourceSnapshot?.referenceEnglishRenderSha256,
  expectedEnglishRenderHash
);
requireEqual(
  'activeProfile.snapshotHashes',
  JSON.stringify(profile.integrity?.expectedSnapshotHashes),
  JSON.stringify(expectedHashes)
);
requireEqual('activeProfile.failClosed', profile.integrity?.failClosed, true);

requireEqual('manifest.schemaVersion', manifest.schemaVersion, 1);
requireEqual('manifest.snapshotId', manifest.snapshotId, profileId);
requireEqual('manifest.status', manifest.status, 'frozen');
requireEqual(
  'manifest.threadId',
  manifest.provenance?.threadId,
  '019f8b33-68dd-7d02-973f-ce3273ffcebf'
);
requireEqual(
  'manifest.automationMessageId',
  manifest.provenance?.automationInvocation?.messageId,
  'msg_019f8b33-7d32-70c1-b1d5-18344a587edf'
);
requireEqual(
  'manifest.sourceCommit',
  manifest.provenance?.sourceCommit?.sha,
  sourceCommit
);
requireEqual(
  'manifest.excludedLaterCommit',
  manifest.provenance?.excludedLaterRuleCommit?.sha,
  '2caf583df2b91d7d7f6248796bae0c7ce885ccab'
);
requireEqual(
  'manifest.chineseDuration',
  manifest.implementationReference?.chinese?.durationSeconds,
  378.176
);
requireEqual(
  'manifest.chineseRenderHash',
  manifest.implementationReference?.chinese?.renderSha256,
  expectedChineseRenderHash
);
requireEqual(
  'manifest.englishRenderHash',
  manifest.implementationReference?.english?.renderSha256,
  expectedEnglishRenderHash
);

const manifestHashes = Object.fromEntries(
  (manifest.frozenRuleSources ?? []).map((item) => [
    path.basename(item.path ?? ''),
    item.sha256,
  ])
);
requireEqual(
  'manifest.frozenRuleSources',
  JSON.stringify(manifestHashes),
  JSON.stringify(expectedHashes)
);

requireEqual(
  'implementationProfile.id',
  implementationProfile.id,
  'tiny-agent-longform-kinetic-retention-2026-07-23-zh-CN'
);
requireEqual(
  'implementationProfile.voice',
  implementationProfile.audio?.voice,
  'zh-CN-YunxiaNeural'
);
requireEqual(
  'implementationProfile.rate',
  implementationProfile.audio?.rate,
  '+35%'
);
requireEqual(
  'implementationProfile.recapPattern',
  implementationProfile.visual?.recapPattern,
  'persistent-blue-left-panel-cumulative-1-2-3'
);

const exactPromptChecks = [
  /英文使用 edge-tts en-US-AnaNeural、rate \+30%；中文使用 edge-tts zh-CN-YunxiaNeural、rate \+35%/,
  /固定控制在 5-8 分钟/,
  /每个实质章节有章节开场和可朗读的三点编号小结/,
  /earlyRevealCount=0/,
  /临时图片生成的新场景素材占非结束页视觉状态约 15%-20%/,
  /至少包含 7 种实际可见动作类型和 20 个动作节点/,
];
for (const pattern of exactPromptChecks) {
  requireMatch('snapshotPrompt', text.prompt, pattern);
}

const exactGuideChecks = [
  /固定成片范围：`5-8 分钟`/,
  /中文默认声音为 `zh-CN-YunxiaNeural`，固定使用 `\+35%` 语速；英文长视频默认声音为 `en-US-AnaNeural`，固定使用 `\+30%` 语速/,
  /中文总结必须进入旁白脚本，并固定从 `本章小节：第一/,
  /英文固定使用 `Chapter recap\. First/,
  /任何字或单词不得在其语音触发点前完整可见/,
  /临时图片生成的新场景素材占全部非结束页视觉状态约 `15%-20%`/,
  /至少包含 `7` 种动作类型和 `20` 个动作节点/,
];
for (const pattern of exactGuideChecks) {
  requireMatch('snapshotGuide', text.snapshotGuide, pattern);
}

const contentPlanChecks = [
  /2026-07-23-scheduled-6m18/,
  /en-US-AnaNeural`，固定语速 `\+30%`/,
  /zh-CN-YunxiaNeural`，固定语速 `\+35%`/,
  /中英文长视频均为 `5-8` 分钟/,
  /2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/,
  /2026-07-23-03-ai-agent-uncertainty-longform-en-US/,
];
for (const pattern of contentPlanChecks) {
  requireMatch('contentPlan', text.contentPlan, pattern);
}
forbidMatch(
  'contentPlan',
  text.contentPlan,
  /snapshots\/2026-07-23-v4-accepted/,
  'V4 snapshot path'
);
forbidMatch(
  'contentPlan',
  text.contentPlan,
  /2026-07-23-ai-agent-uncertainty-story-v4-zh-CN/,
  'V4 implementation reference'
);

requireMatch(
  'historicalDeepGuide',
  text.historicalDeepGuide,
  /历史规则，当前不参与生产/
);

const runbookChecks = [
  /2026-07-23-scheduled-6m18/,
  /zh-CN-YunxiaNeural \+35%/,
  /en-US-AnaNeural \+30%/,
  /两版成片均为 `5-8 分钟`/,
  /章节开场、正文和可朗读的三点编号小结/,
  /earlyRevealCount=0/,
];
for (const pattern of runbookChecks) {
  requireMatch('runbook', text.runbook, pattern);
}
forbidMatch(
  'runbook',
  text.runbook,
  /2026-07-23-v4-accepted/,
  'V4 snapshot path'
);
forbidMatch(
  'runbookMandatoryReads',
  text.runbook.split('本手册只规定每日状态机和发布流程。')[0] ?? '',
  /tiny-agent-deep-longform-cognitive-load\.md/,
  'historical deep guide in mandatory read order'
);

const automationPromptMatch = text.automation.match(/^prompt = (".*")$/m);
let automationPrompt = '';
if (!automationPromptMatch) {
  errors.push('automation: prompt field is missing');
} else {
  try {
    automationPrompt = JSON.parse(automationPromptMatch[1]);
  } catch (error) {
    errors.push(`automation: prompt cannot be decoded: ${error.message}`);
  }
}
const automationChecks = [
  /2026-07-23-scheduled-6m18/,
  /457ba42d110d259ed03c4b008e1af2cc8b0b9935/,
  /中文 zh-CN-YunxiaNeural \+35%/,
  /英文 en-US-AnaNeural \+30%/,
  /5-8 分钟/,
  /earlyRevealCount=0/,
];
for (const pattern of automationChecks) {
  requireMatch('automationPrompt', automationPrompt, pattern);
}
forbidMatch(
  'automationPrompt',
  automationPrompt,
  /snapshots\/2026-07-23-v4-accepted/,
  'V4 snapshot path'
);

const memoryActive = text.memory.split('\n## Formal automation state')[0] ?? '';
const memoryChecks = [
  /tiny-agent-longform-scheduled-6m18-2026-07-23/,
  /zh-CN-YunxiaNeural \+35%/,
  /en-US-AnaNeural \+30%/,
  /5-8 minutes/,
  /63` scenes, `7` chapters, and `15` recap scenes/,
  /earlyRevealCount=0/,
  /2caf583df2b91d7d7f6248796bae0c7ce885ccab` is explicitly excluded/,
];
for (const pattern of memoryChecks) {
  requireMatch('memoryActive', memoryActive, pattern);
}

requireMatch(
  'voiceReadme',
  text.voiceReadme,
  /6:18 定时成片冻结基线固定为中文 `zh-CN-YunxiaNeural \+35%`、英文 `en-US-AnaNeural \+30%`/
);

for (const [relativePath, expected] of Object.entries(referenceArtifacts)) {
  requireEqual(
    `reference:${relativePath}:sha256`,
    sha256(readCommitted(relativePath)),
    expected
  );
}

const scenePlan = parseJson(
  'referenceScenePlan',
  readCommitted(
    'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/scene-plan.json'
  ).toString('utf8')
);
const scenes = (scenePlan.chapters ?? []).flatMap(
  (chapter) => chapter.scenes ?? []
);
requireEqual('referenceScenePlan.sceneCount', scenes.length, 63);
requireEqual('referenceScenePlan.chapterCount', scenePlan.chapters?.length, 7);
requireEqual(
  'referenceScenePlan.recapCount',
  scenes.filter((scene) => scene.type === 'recap').length,
  15
);
requireEqual(
  'referenceScenePlan.temporaryGeneratedCount',
  scenes.filter((scene) => scene.temporaryGenerated === true).length,
  10
);

if (errors.length > 0) {
  console.error(
    `Tiny Agent active-rule validation failed with ${errors.length} error(s):`
  );
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Tiny Agent active-rule validation passed: ${profileId}; exact scheduled prompt, commit-time guide, implementation profile, and reference artifact hashes are intact.`
);
