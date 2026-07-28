import fs from 'node:fs';
import path from 'node:path';

const workspace = '/Users/bytedance/Documents/postiz-app';
const locales = ['en-US', 'zh-CN'];
const actionTypes = ['press-pulse', 'spring-pop', 'nudge', 'split-tilt', 'fly-in', 'spin-in', 'sine-float'];
const layoutCycle = ['big-text', 'human-agent-prop', 'two-props', 'agent-center', 'human-prop', 'agent-prop'];
const agentCycle = ['plan-front', 'present-left', 'write-front', 'evaluate-front', 'handoff-left', 'verify-front'];
const humanCycle = ['present-right', 'review-front', 'operate-right', 'explain-front', 'write-front', 'decide-front'];
const propCycle = ['workflow', 'skill-card', 'document-stack', 'checklist', 'branch', 'evidence', 'handoff', 'package'];
const secondPropCycle = ['target', 'shield', 'evidence', 'search', 'note', 'skill-card', 'citation'];
const generatedArtCycle = ['skill-transform-01.png', 'skill-transform-02.png', 'skill-transform-03.png'];
const generatedIds = new Set([
  'c01-p03',
  'c02-p03',
  'c02-p07',
  'c03-p04',
  'c03-p07',
  'c04-p03',
  'c04-p07',
  'c05-p04',
  'c05-p07',
  'c06-p04',
]);

const splitSentences = (text, locale) => {
  const pattern = locale === 'zh-CN' ? /[^。！？!?]+[。！？!?]/g : /[^.!?]+[.!?]/g;
  return text.match(pattern)?.map((item) => item.trim()).filter(Boolean) ?? [text.trim()];
};

const splitBodySegment = (segment, locale, shouldSplit) => {
  if (!shouldSplit) return [{ text: segment.text, screenText: segment.screenText }];
  const sentences = splitSentences(segment.text, locale);
  if (sentences.length < 2) return [{ text: segment.text, screenText: segment.screenText }];
  const midpoint = Math.ceil(sentences.length / 2);
  return [
    { text: sentences.slice(0, midpoint).join(locale === 'zh-CN' ? '' : ' '), screenText: segment.screenText },
    { text: sentences.slice(midpoint).join(locale === 'zh-CN' ? '' : ' '), screenText: segment.screenText },
  ];
};

function makeProject(locale) {
  const project = path.join(workspace, 'var/hyperframes-showcases', `2026-07-27-03-ai-agent-skills-longform-${locale}`);
  const sourceEpisodePath = path.join(project, 'episode.pre-active-baseline-rebuild.json');
  const sourceEpisode = JSON.parse(fs.readFileSync(sourceEpisodePath, 'utf8'));
  const zh = locale === 'zh-CN';
  const introTitle = zh ? '前言' : 'Introduction';
  const summaryTitle = zh ? '总结' : 'Summary';
  const fixedValueSentence = zh
    ? '视频全程干货高价值，让你成为更擅长使用 AI 的人，内容较长，点点关注收藏不迷路。'
    : "This video is packed with practical, high-value insights to help you get better at using AI. It's a longer one, so follow Tiny Agent and save it so you don't lose it.";
  const fixedOutroCta = zh
    ? '关注 Tiny Agent，成为更擅长使用 AI 的人！'
    : 'Follow Tiny Agent. Tiny Agent helps you get better at using AI.';
  const hookQuestion = zh
    ? '怎么写好 AI Agent Skill 才真正可复用？'
    : 'Why do AI Agents lose good methods on long tasks?';
  const introSegments = sourceEpisode.segments.filter((segment) => segment.chapter === -1).map((segment) => ({ ...segment }));
  introSegments[0].text = zh
    ? `${hookQuestion}答案在七个字段里。`
    : `${hookQuestion} Skills preserve them.`;
  introSegments.at(-1).text = fixedValueSentence;
  introSegments.at(-1).screenText = zh ? '高价值内容，先收藏再实践' : 'Save the method, then put it to work';
  const summarySegments = sourceEpisode.segments.filter((segment) => segment.chapter === sourceEpisode.chapters.length);
  const chapters = [
    {
      label: introTitle,
      paragraphs: introSegments.map((segment, index) => ({
        text: segment.text,
        screenText: segment.screenText,
        type: index === 0 ? 'hook' : index === 1 ? 'authority' : index === introSegments.length - 1 ? 'promise' : 'generic',
      })),
    },
    ...sourceEpisode.chapters.map((chapter, chapterIndex) => {
      const bodySegments = sourceEpisode.segments.filter((segment) => segment.chapter === chapterIndex);
      const bodyParagraphs = bodySegments.flatMap((segment, bodyIndex) =>
        splitBodySegment(segment, locale, bodyIndex < 2).map((part) => ({ ...part, type: 'generic' })),
      );
      const recaps = chapter.recaps.map((recap, recapIndex) => ({
        text: `${sourceEpisode.recapPrefix[recapIndex]}${recap.narration}`,
        screenText: recap.screenText,
        type: 'recap',
      }));
      return {
        label: chapter.title,
        paragraphs: [
          { text: chapter.body, screenText: chapter.body, type: 'chapter-intro' },
          ...bodyParagraphs,
          ...recaps,
        ],
      };
    }),
    {
      label: summaryTitle,
      paragraphs: summarySegments.map((segment, index) => ({
        text: segment.text,
        screenText: segment.screenText,
        type: index === summarySegments.length - 1 ? 'outro' : 'generic',
      })),
    },
  ];

  const visuals = {};
  const generatedArt = {};
  const layouts = {};
  const motions = {};
  const humanPoses = {};
  const secondProps = {};
  let genericIndex = 0;
  let generatedIndex = 0;
  let motionIndex = 0;
  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
    const chapter = chapters[chapterIndex];
    visuals[chapter.label] = chapter.paragraphs.map((paragraph, paragraphIndex) => {
      const sceneId = `c${String(chapterIndex + 1).padStart(2, '0')}-p${String(paragraphIndex + 1).padStart(2, '0')}`;
      const prop = propCycle[(chapterIndex * 3 + paragraphIndex) % propCycle.length];
      const agent = agentCycle[(chapterIndex + paragraphIndex) % agentCycle.length];
      let layout = paragraph.type === 'chapter-intro' ? 'chapter-intro' : paragraph.type === 'recap' ? 'recap' : layoutCycle[genericIndex % layoutCycle.length];
      if (paragraph.type === 'authority' || paragraph.type === 'promise') layout = 'human-agent-prop';
      if (paragraph.type === 'hook' || paragraph.type === 'outro') layout = 'agent-prop';
      if (generatedIds.has(sceneId)) {
        generatedArt[sceneId] = generatedArtCycle[generatedIndex % generatedArtCycle.length];
        generatedIndex += 1;
        layout = 'generated';
      }
      layouts[sceneId] = layout;
      if (['human-agent-prop', 'human-prop', 'human-center', 'chapter-intro'].includes(layout)) {
        humanPoses[sceneId] = humanCycle[(chapterIndex + paragraphIndex) % humanCycle.length];
      }
      if (layout === 'two-props') secondProps[sceneId] = secondPropCycle[genericIndex % secondPropCycle.length];
      if (!['hook', 'chapter-intro', 'recap', 'outro'].includes(paragraph.type)) {
        motions[sceneId] = actionTypes[motionIndex % actionTypes.length];
        motionIndex += 1;
      }
      genericIndex += 1;
      return [paragraph.screenText, prop, agent, paragraph.screenText, paragraph.type];
    });
  }

  const script = chapters
    .map((chapter, chapterIndex) => `### ${chapterIndex + 1} | ${chapter.label}\n\n${chapter.paragraphs.map((paragraph) => paragraph.text).join('\n\n')}`)
    .join('\n\n');
  fs.writeFileSync(path.join(project, sourceEpisode.scriptFile), `${script}\n`);
  const migratedEpisode = {
    locale,
    projectTitle: zh ? '如何为 AI Agent 写出真正可复用的 Skill？' : sourceEpisode.title,
    sourceAttribution: {
      publisher: sourceEpisode.source.publisher,
      title: sourceEpisode.source.title,
      url: sourceEpisode.source.url,
    },
    scriptFile: sourceEpisode.scriptFile,
    outputName: path.basename(sourceEpisode.output),
    voice: sourceEpisode.voice,
    rate: sourceEpisode.rate,
    hookQuestion,
    hookLines: zh
      ? ['怎么写好', 'AI Agent Skill', '才真正', '可复用？']
      : ['Why do AI Agents', 'lose good methods', 'on long', 'tasks?'],
    ...(zh
      ? {
          openingAccentTokens: [
            { token: 'AI Agent', tone: 'identity' },
            { token: 'Skill', tone: 'topic' },
            { token: '怎么写', tone: 'risk' },
          ],
        }
      : {}),
    firstSentence: introSegments[0].text,
    openingHookReview: zh
      ? {
          visibleQuestion: hookQuestion,
          intent: 'actionable-path',
          audiencePainPoint: '很多人把提示词或说明文直接当成 Skill，下一次任务仍要重新解释边界、判断方式和验收标准。',
          knowledgeGap: '观众需要知道哪些字段必须写清，才能让 Skill 可触发、可执行、可检查并持续修订。',
          curiosityRationale: '问题直接点明制作 AI Agent Skill 的目标，但把七字段写法留到后续章节逐步展开。',
          directTopicTerms: ['AI Agent Skill', 'Skill'],
          viewerValue: '观众将知道怎样写出可触发、可执行、可检查并能持续修订的 Skill。',
          topicAlignmentRationale: '视频实际讲解 Skill 的七字段写法与验证方法，开场直接询问怎样写好 AI Agent Skill，没有借用长期任务或跑偏等无关情境。',
          tangentialSetupRisk: 'none',
          obviousAnswerRisk: 'none',
          rejectedObviousQuestion: 'AI Agent 需要 Skill 吗？',
        }
      : {
          visibleQuestion: hookQuestion,
          intent: 'causal-diagnosis',
          audiencePainPoint: 'A proven workflow disappears between long-running tasks, forcing people to rebuild context and standards before useful work begins.',
          knowledgeGap: 'The missing mechanism is which decisions, inputs, handoff fields, and checks must become an inspectable Skill instead of another copied prompt.',
          curiosityRationale: 'The question opens a causal gap that the trigger, context, workflow, handoff, and evidence chapters must resolve.',
          directTopicTerms: ['AI Agents', 'long tasks'],
          viewerValue: 'Viewers learn which parts of a working method must become a reusable, inspectable Skill.',
          topicAlignmentRationale: 'The English episode explains how Skills preserve working methods across long tasks, so the question names that exact loss instead of borrowing an unrelated scenario.',
          tangentialSetupRisk: 'none',
          obviousAnswerRisk: 'none',
          rejectedObviousQuestion: 'Can an AI Agent reuse a good method?',
        },
    ...(zh
      ? {
          chinesePronunciationReview: {
            reviewed: true,
            entries: [],
          },
          chineseMandarinProsodyReview: {
            reviewed: true,
            method: '逐句检查普通话意群；逗号、顿号、冒号和分号仅作为句内自然短停顿，不作为 TTS 切段边界。',
            approvedSentenceTerminators: ['。', '！', '？', '!', '?'],
            forbiddenTtsSegmentBoundaryPunctuation: ['，', '、', '：', '；', ',', ':', ';'],
          },
        }
      : {}),
    fixedValueSentence,
    fixedOutroCta,
    coverAlt: zh ? 'AI Agent Skill 七字段写作方法' : sourceEpisode.metadata.thumbnailText ?? 'AI Agent Skills Reuse Work',
    promise: zh
      ? { label: '先收藏', strong: '把可复用方法留给下一次工作', action: '把判断留给真正的新问题' }
      : { label: 'SAVE THIS', strong: 'Carry the reusable method into the next run', action: 'Keep judgment for what is new' },
    outro: zh
      ? { title: '关注 Tiny Agent', lines: ['成为更擅长使用 AI 的人！'] }
      : { title: 'Follow Tiny Agent', lines: ['Tiny Agent helps you', 'get better at using AI.'] },
    visuals,
    generatedArt,
    layouts,
    motions,
    humanPoses,
    secondProps,
  };
  fs.writeFileSync(path.join(project, 'episode.json'), `${JSON.stringify(migratedEpisode, null, 2)}\n`);
  const packageJson = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
  packageJson.scripts = {
    tts: 'node build.mjs --tts',
    build: 'node build.mjs --compile',
    'check:transitions': 'node qa/check-production.mjs transitions',
    'check:semantics': 'node qa/check-production.mjs semantics',
    'check:balance': 'node qa/check-production.mjs balance',
    'check:layout': 'node qa/check-dom-layout.mjs',
    check: `pnpm dlx hyperframes@${zh ? '0.7.76' : '0.7.71'} check . --snapshots --frame-check=severity=error`,
    render: `pnpm dlx hyperframes@${zh ? '0.7.76' : '0.7.71'} render . --quality high --strict --quiet --workers 1 --low-memory-mode --video-bitrate 8M --output renders/${path.basename(sourceEpisode.output)}`,
  };
  fs.writeFileSync(path.join(project, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
}

for (const locale of locales) makeProject(locale);
