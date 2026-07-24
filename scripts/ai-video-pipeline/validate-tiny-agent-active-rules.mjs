import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const automationDir =
  process.env.CODEX_HOME ??
  path.join(process.env.HOME ?? '', '.codex');

const files = {
  runbook: path.join(
    root,
    'scripts/ai-video-pipeline/automation-guides/tiny-agent-daily-longform.md'
  ),
  commonGuide: path.join(
    root,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md'
  ),
  deepGuide: path.join(
    root,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-deep-longform-cognitive-load.md'
  ),
  automation: path.join(
    automationDir,
    'automations/tiny-agent/automation.toml'
  ),
  memory: path.join(automationDir, 'automations/tiny-agent/memory.md'),
};

const errors = [];
const read = (label, file) => {
  if (!fs.existsSync(file)) {
    errors.push(`${label}: missing ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};

const active = {
  runbook: read('runbook', files.runbook),
  commonGuide: read('commonGuide', files.commonGuide),
  deepGuide: read('deepGuide', files.deepGuide),
  memory: read('memory', files.memory),
};
const automationToml = read('automation', files.automation);
const promptMatch = automationToml.match(/^prompt = (".*")$/m);
let automationPrompt = '';
if (!promptMatch) {
  errors.push('automation: prompt field is missing');
} else {
  try {
    automationPrompt = JSON.parse(promptMatch[1]);
  } catch (error) {
    errors.push(`automation: prompt cannot be decoded: ${error.message}`);
  }
}
active.automationPrompt = automationPrompt;

const banned = [
  ['old Chinese rate', /rate\s*\+35%|Yunxia[^\\n]*\+35%/i],
  ['old English rate', /rate\s*\+30%|Ana[^\\n]*\+30%/i],
  ['old duration', /\b5[-–]8\s*(?:分钟|minute)/i],
  ['old spoken recap prefix', /本章小节：第一|Chapter recap\.\s*First/i],
  ['old early-reveal gate', /earlyRevealCount\s*=\s*0/i],
  ['superseded hook sample', /2026-07-22-tiny-agent-hook-type-on-sample/i],
  ['ambiguous building-effective reference', /building-effective-agents-longform-zh-CN/i],
  ['missing legacy render', /augmented-llm-landscape-longform-zh-v3\.mp4/i],
  ['superseded opening voice progress line', /花式展示字体、语音进度线/],
  ['legacy generated-art lower bound', /临时生成图[^。\n]*不低于 `15%`/],
  ['legacy generated-art target range', /临时生成图[^。\n]*15%-20%/],
  ['legacy motion-count gate', /至少包含 `7` 种实际可见动作类型和 `20` 个动作节点/],
];

for (const [label, text] of Object.entries(active)) {
  for (const [name, pattern] of banned) {
    if (pattern.test(text)) errors.push(`${label}: contains ${name}`);
  }
}

const required = [
  ['deepGuide', /zh-CN-YunxiaNeural`、`rate \+10%/],
  ['deepGuide', /en-US-AnaNeural`、`rate \+10%/],
  ['deepGuide', /`9-12 分钟`/],
  ['deepGuide', /`35-45` 个稳定视觉状态/],
  ['deepGuide', /`0\.10-0\.15 秒`/],
  ['deepGuide', /`1\.2-1\.6 秒`/],
  ['deepGuide', /不得显示语音进度条、播放器进度条、音轨圆点/],
  ['deepGuide', /qa\/narrative-transition-report\.json/],
  ['commonGuide', /完整插画必须由图片生成模型生成/],
  ['commonGuide', /场景数占比和可见时长占比都以 `25%-30%` 为目标，两项分别不得低于 `25%`/],
  ['commonGuide', /assets\/generated\/scene-art\/provenance\.json/],
  ['commonGuide', /qa\/generated-art-report\.json/],
  ['commonGuide', /每分钟安排 `8-10` 个旁白绑定的语义动作/],
  ['commonGuide', /最长完全静止间隔不得超过 `6 秒`/],
  ['commonGuide', /至少使用 `12` 种实际运动轨迹不同的语义动作签名和 `5` 种场景入场签名/],
  ['commonGuide', /同一场景的同一元素最多承担 `2` 个语义动作/],
  ['commonGuide', /内容包围盒不得交叠/],
  ['commonGuide', /triggerCueId/],
  ['commonGuide', /actionFamily/],
  ['commonGuide', /semanticElements/],
  ['commonGuide', /triggerConcept/],
  ['commonGuide', /targetSemanticRole/],
  ['commonGuide', /targetMatchEvidence/],
  ['commonGuide', /禁止按元素序号、轮询、最少使用次数/],
  ['commonGuide', /黄色语义强调线的可见长度必须与它所强调的文本实际包围盒同宽/],
  ['commonGuide', /underlineWidthMismatchCount/],
  ['commonGuide', /qa\/semantic-motion-target-report\.json/],
  ['commonGuide', /不得超过 `0\.15 秒`/],
  ['runbook', /generated-art-report/],
  ['runbook', /每分钟 `8-10` 个有效语义动作/],
  ['runbook', /全片至少使用 `12` 种实际轨迹不同的语义动作签名和 `5` 种入场签名/],
  ['runbook', /semanticTargetMismatchCount/],
  ['runbook', /underlineWidthMismatchCount/],
  ['automationPrompt', /tiny-agent-daily-longform\.md/],
  ['automationPrompt', /不得把 memory-history-through-2026-07-23\.md 当作活跃规则/],
  ['memory', /## Active rules/],
  ['memory', /never shows a voice progress bar/],
  ['memory', /visible duration each stay at or above `25%`/],
  ['memory', /`8-10` narration-bound semantic actions per minute/],
  ['memory', /no fully static gap longer than `6 seconds`/],
  ['memory', /at least `12` visibly different semantic motion signatures and `5` entrance signatures/],
  ['memory', /Cross-scene content overlap/],
  ['memory', /Yellow semantic underlines match the exact rendered width/],
  ['memory', /selector cycling, least-used targeting/i],
  ['memory', /## Formal automation state/],
];

for (const [label, pattern] of required) {
  if (!pattern.test(active[label] ?? '')) {
    errors.push(`${label}: missing required rule ${pattern}`);
  }
}

if (automationPrompt.length > 2000) {
  errors.push(`automationPrompt: ${automationPrompt.length} characters exceeds 2000`);
}
if (active.memory.split('\n').length > 80) {
  errors.push(`memory: ${active.memory.split('\n').length} lines exceeds 80`);
}

for (const [label, text] of Object.entries({
  runbook: active.runbook,
  commonGuide: active.commonGuide,
  deepGuide: active.deepGuide,
})) {
  const references = [
    ...text.matchAll(/`((?:scripts|var)\/[^`<>\n]+)`/g),
  ]
    .map((match) => match[1])
    .filter(
      (reference) =>
        !reference.includes(' ') &&
        !reference.includes('*') &&
        !reference.includes('<')
    );

  for (const reference of new Set(references)) {
    if (!fs.existsSync(path.join(root, reference))) {
      errors.push(`${label}: missing local reference ${reference}`);
    }
  }
}

const report = {
  pass: errors.length === 0,
  checkedAt: new Date().toISOString(),
  automationPromptCharacters: automationPrompt.length,
  automationPromptLines: automationPrompt.split('\n').length,
  memoryLines: active.memory.split('\n').length,
  activeRuleFiles: [
    path.relative(root, files.runbook),
    path.relative(root, files.commonGuide),
    path.relative(root, files.deepGuide),
  ],
  errors,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
