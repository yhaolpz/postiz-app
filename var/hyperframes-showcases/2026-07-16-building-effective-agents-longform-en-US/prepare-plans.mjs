import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, '../../..');
const referencePlanPath = path.join(
  repoRoot,
  'var/hyperframes-showcases/building-effective-agents-longform-zh-CN/scene-plan.json',
);

const chapterLabels = {
  前言: 'Preface',
  架构判断: 'Architecture Choice',
  基础单元: 'Core Building Block',
  工作流模式: 'Workflow Patterns',
  '自主 Agent': 'Autonomous Agents',
  工具设计: 'Tool Design',
  选择方法: 'Decision Method',
  总结: 'Summary',
};

const intros = {
  Preface: 'See why complex agent architecture is often the wrong starting point',
  'Architecture Choice': 'Separate fixed workflows from dynamic agents before adding complexity',
  'Core Building Block': 'Start with one model connected to retrieval, tools, and memory',
  'Workflow Patterns': 'Match five controlled patterns to five kinds of uncertainty',
  'Autonomous Agents': 'Use real feedback and explicit boundaries to control autonomy',
  'Tool Design': 'Make correct tool use easier and common mistakes harder',
  'Decision Method': 'Choose the simplest architecture with a reusable decision ladder',
  Summary: 'Start simple and let measured outcomes decide',
};

const summaries = {
  Preface: ['Complexity is not effectiveness', 'Answer three architecture questions', 'Leave with a reusable decision ladder'],
  'Architecture Choice': ['Use a workflow when the path is fixed', 'Use an agent only when the path must be dynamic', 'Every added layer must earn its place with a measurable result'],
  'Core Building Block': ['Retrieval provides external facts', 'Tools perform real actions', 'Memory preserves task state'],
  'Workflow Patterns': ['Locate where uncertainty enters the task', 'Choose the workflow that controls that uncertainty', 'Add a pattern only when it solves a specific problem'],
  'Autonomous Agents': ['Every action must read real environmental feedback', 'Failure risk compounds across a long execution path', 'Autonomy requires permissions and stopping conditions'],
  'Tool Design': ['Names, parameters, and boundaries must be clear', 'Return formats should not create extra difficulty', 'Design the interface so common errors are harder to make'],
  'Decision Method': ['Test whether one augmented model call can finish the task', 'Prefer a workflow while the path remains controllable', 'Let measurable results decide whether to upgrade to an agent'],
  Summary: ['If one augmented model call can solve the task, do not build a workflow first', 'If you can draw the execution path in advance, do not build an autonomous agent first', 'When you truly need an agent, protect it with environmental feedback, stopping conditions, permissions, and reliable tool interfaces'],
};

const callouts = {
  Preface: ['Complexity First?', 'Complex Is Not Better', 'Three Questions'],
  'Architecture Choice': ['Who Picks the Path?', 'Fixed Path', 'Dynamic Path', 'Different Goals', 'Start Simple', 'Chapter Recap'],
  'Core Building Block': ['One Model + Three', 'Augment First', 'Support Task', 'One Model Can Work', 'Fit Over Quantity', 'Chapter Recap'],
  'Workflow Patterns': ['Controlled Path', 'Prompt Chaining', 'Routing', 'Parallel Work', 'Independent Votes', 'Orchestrator-Workers', 'Runtime Subtasks', 'Evaluate and Improve', 'Useful Loop', 'No Standard, No Gain', 'Find the Uncertainty', 'Chapter Recap'],
  'Autonomous Agents': ['Decision Loop', 'Read Ground Truth', 'Strong Agent Tasks', 'Compounding Risk', 'Set Boundaries', 'Control Through Feedback', 'Chapter Recap'],
  'Tool Design': ['Smart Model, Bad Tool', 'Clear ACI', 'Avoid Format Friction', 'Constraints Prevent Errors', 'Improve the Interface', 'Chapter Recap'],
  'Decision Method': ['Is One Call Enough?', 'Fixed Steps', 'Unknown Subtasks', 'Continuous Feedback', 'See Below the Framework', 'Measure the Upgrade', 'Chapter Recap'],
  Summary: ['Start Simple. Measure.'],
};

const comparisonLabels = {
  复杂架构: 'Complex system',
  简单组合: 'Simple system',
  Workflow: 'Workflow',
  Agent: 'Agent',
  能力数量: 'More capabilities',
  任务匹配: 'Better fit',
  '复杂 JSON': 'Escaped JSON',
  直接结果: 'Direct result',
  直接代码: 'Direct code',
  相对路径: 'Relative path',
  绝对路径: 'Absolute path',
  快速连接: 'Fast setup',
  隐藏细节: 'Hidden detail',
  基线: 'Baseline',
  框架抽象: 'Framework layer',
  真实过程: 'Real process',
};

const propLabels = {
  document: 'Document',
  'document-stack': 'Steps',
  search: 'Search',
  browser: 'Browser',
  'api-plug': 'API',
  tool: 'Tool',
  database: 'Database',
  memory: 'Memory',
  'result-card': 'Result',
  success: 'Passed',
  branch: 'Branch',
  loop: 'Loop',
  warning: 'Risk',
  error: 'Error',
  timeout: 'Stop',
};

function parseScript(markdown) {
  const body = markdown.split('## Full Narration Script')[1];
  if (!body) throw new Error('Missing Full Narration Script section');
  return body.split(/^###\s+/m).slice(1).map((part) => {
    const [heading, ...rest] = part.split('\n');
    const label = heading.split('|')[1]?.trim();
    if (!label) throw new Error(`Invalid English chapter heading: ${heading}`);
    const paragraphs = rest.join('\n').trim().split(/\n\s*\n/).map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return { label, paragraphs };
  });
}

function translateProp(prop) {
  if (typeof prop === 'string') return { id: prop, label: propLabels[prop] };
  return { id: prop.id, label: propLabels[prop.id] };
}

const reference = JSON.parse(await readFile(referencePlanPath, 'utf8'));
const script = parseScript(await readFile(path.join(root, 'SCRIPT.en-US.md'), 'utf8'));

const plan = {
  chapters: reference.chapters.map((chapter, chapterIndex) => {
    const label = chapterLabels[chapter.label];
    if (!label || script[chapterIndex]?.label !== label) throw new Error(`Chapter mismatch at ${chapterIndex}`);
    return {
      ...chapter,
      label,
      intro: intros[label],
      summary: summaries[label],
      scenes: chapter.scenes.map((scene, sceneIndex) => ({
        ...scene,
        ...(scene.labels ? { labels: scene.labels.map((item) => comparisonLabels[item] || item) } : {}),
        props: scene.props.map(translateProp),
        callout: callouts[label][sceneIndex],
      })),
    };
  }),
};

const animationPlan = {
  version: 1,
  locale: 'en-US',
  policy: {
    timingSource: 'final-edge-tts-vtt',
    grouping: 'All props in a scene share one explicit narration trigger unless the spoken text requires sequential steps',
    minimumReadableHoldSeconds: 1,
    proportionalFallbackAllowed: false,
  },
  scenes: {},
};

plan.chapters.forEach((chapter, chapterIndex) => {
  const paragraphs = script[chapterIndex].paragraphs;
  chapter.scenes.forEach((scene, sceneIndex) => {
    if (scene.props.length === 0) return;
    const id = `c${String(chapterIndex + 1).padStart(2, '0')}-s${String(sceneIndex + 1).padStart(2, '0')}`;
    const paragraph = paragraphs[scene.paragraphs[0] - 1];
    if (!paragraph) throw new Error(`Missing trigger paragraph for ${id}`);
    const trigger = paragraph.split(/\s+/).slice(0, 6).join(' ').replace(/[,:;.!?]+$/, '');
    animationPlan.scenes[id] = {
      beats: [{ trigger, props: scene.props.map((_, index) => index) }],
    };
  });
});

await writeFile(path.join(root, 'scene-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(path.join(root, 'animation-plan.json'), `${JSON.stringify(animationPlan, null, 2)}\n`);
process.stdout.write(`Prepared ${plan.chapters.length} chapters and ${Object.keys(animationPlan.scenes).length} timed scenes\n`);
