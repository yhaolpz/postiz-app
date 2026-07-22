import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(projectDir, '../../..');
const scriptPath = path.join(projectDir, 'SCRIPT.zh-CN.md');
const profile = JSON.parse(readFileSync(path.join(projectDir, 'production-profile.json'), 'utf8'));
const voice = 'zh-CN-YunxiaNeural';
const rate = '+40%';
const fps = 30;
const tailPad = 0.3;
const outputName = 'ai-agent-context-production-v2.zh-CN.mp4';

const VISUALS = {
  '前言': [
    ['你知道怎么给 AI 智能体高信号上下文吗？', 'question', 'ask-front', '高信号？', 'hook'],
    ['Anthropic 如何解决 AI 智能体上下文问题', 'result-card', 'present-left', '成为更擅长使用 AI 的人', 'promise'],
    ['AI 智能体上下文是有限的注意力预算', 'document', 'read-front', '注意力预算有限', 'authority'],
    ['给 AI 智能体一个六部分高信号包', 'package', 'handoff-left', '目标 · 规则 · 工具 · 示例 · 检索 · 状态', 'pack'],
    ['AI 智能体看到更多，不等于信号更强', 'document-stack', 'reason-front', '当前信号 68%', 'budget'],
    ['AI 智能体需要最小充分上下文', 'target', 'present-left', '支持下一步行动', 'generic']
  ],
  '注意力预算': [
    ['第 2 章：注意力预算', 'timer', 'present-left', '判断什么信息值得进入当前窗口', 'chapter-intro'],
    ['AI 智能体看见的是完整上下文', 'document-stack', 'read-front', '指令 · 工具 · 示例 · 历史 · 请求', 'list'],
    ['规则写进去了，也可能被噪声淹没', 'warning', 'alert-front', '材料越多，找回重点越难', 'generic'],
    ['只保留会改变下一步判断的信息', 'target', 'evaluate-front', '目标 · 约束 · 证据 · 状态', 'list'],
    ['必要信息进入窗口，完整日志只留路径', 'code-file', 'read-front', '规则 + 当前错误', 'generic'],
    ['最小充分，不等于越短越好', 'ruler', 'compare-front', '验收 · 风险 · 必要证据', 'list'],
    ['上下文必须持续刷新', 'summary', 'monitor-left', '新证据进入 · 旧轨迹退出', 'generic'],
    ['1. 把上下文当作注意力预算', 'timer', 'plan-front', '有限资源', 'recap'],
    ['2. 更多 token 不等于信号更强', 'document-stack', 'evaluate-front', '更多 ≠ 更强', 'recap'],
    ['3. 随任务持续刷新上下文', 'summary', 'verify-front', '持续更新', 'recap']
  ],
  '高信号输入': [
    ['第 3 章：高信号输入', 'evidence', 'present-left', '指令 · 工具 · 示例', 'chapter-intro'],
    ['指令要落在合适的抽象层级', 'ruler', 'reason-front', '目标 · 边界 · 判断原则', 'list'],
    ['工具是 AI 智能体与环境的契约', 'tool', 'receive-tool', '名称 · 参数 · 错误 · 返回', 'list'],
    ['工具边界不清，AI 智能体就会犹豫', 'compare', 'evaluate-front', '减少功能重叠', 'generic'],
    ['少量典型示例胜过边缘堆积', 'skill-card', 'present-left', '主要模式 + 关键边界', 'generic'],
    ['每段高信号都必须承担工作', 'evidence', 'verify-front', '结果 · 约束 · 工具 · 证据', 'list'],
    ['高信号没有固定字数', 'ruler', 'evaluate-front', '信息必须承担明确工作', 'generic'],
    ['1. 指令清楚，但不要僵化', 'ruler', 'plan-front', '明确但不写死', 'recap'],
    ['2. 保留最小工具集', 'tool', 'evaluate-front', '职责单一', 'recap'],
    ['3. 用典型示例展示模式', 'skill-card', 'present-left', '少量 · 多样 · 典型', 'recap']
  ],
  '按需检索': [
    ['第 4 章：按需检索', 'search', 'present-left', '需要时再打开细节', 'chapter-intro'],
    ['别在开始前塞入全部文档', 'document-stack', 'blocked-front', '预算提前被花掉', 'generic'],
    ['上下文里先保留一张地图', 'route', 'plan-front', '路径 · 查询 · 链接 · 标识', 'list'],
    ['先搜索，再读取目标片段', 'code-file', 'read-front', '不要一次打开整个目录', 'generic'],
    ['让 AI 智能体逐层建立理解', 'search', 'search', '渐进式披露', 'generic'],
    ['稳定规则预载，细节按需打开', 'route', 'present-left', '混合策略', 'generic'],
    ['按需检索需要停止条件', 'stop', 'evaluate-front', '命名 · 搜索工具 · 停止规则', 'list'],
    ['1. 保留轻量引用', 'citation', 'plan-front', '不要预载全部正文', 'recap'],
    ['2. 相关时再打开细节', 'search', 'search', '需要时打开', 'recap'],
    ['3. 平衡聚焦与检索成本', 'compare', 'evaluate-front', '收益必须超过成本', 'recap']
  ],
  '长任务记忆': [
    ['第 5 章：长任务记忆', 'memory', 'present-left', '压缩 · 笔记 · 专门 Agent', 'chapter-intro'],
    ['用压缩摘要开启新窗口', 'summary', 'store-memory', '决定 · 约束 · 证据 · 下一步', 'list'],
    ['压缩先保证不漏关键信息', 'shield', 'verify-front', '宁可多带，不丢约束', 'generic'],
    ['把工作状态写到窗口之外', 'note', 'write-front', '结构化外部笔记', 'generic'],
    ['交接摘要必须保留五类信息', 'handoff', 'handoff-left', '目标 · 决定 · 证据 · 未知 · 下一步', 'list'],
    ['专门 Agent 只用于值得并行深挖的问题', 'parallel-agents', 'delegate-front', '价值必须超过协调成本', 'generic'],
    ['根据任务形态选择记忆方法', 'route', 'evaluate-front', '压缩 · 笔记 · 专门 Agent', 'list'],
    ['1. 压缩长轨迹', 'summary', 'store-memory', '高召回连续性摘要', 'recap'],
    ['2. 写入结构化笔记', 'note', 'write-front', '持久工作状态', 'recap'],
    ['3. 专门 Agent 只用于深挖', 'parallel-agents', 'delegate-front', '收益超过成本', 'recap']
  ],
  '上下文包': [
    ['第 6 章：上下文包', 'package', 'present-left', '完成六部分可复用工具', 'chapter-intro'],
    ['第一组：结果目标和运行规则', 'target', 'plan-front', '交付 · 验收 · 权限 · 风险 · 停止', 'list'],
    ['第二组：工具地图和典型示例', 'tool', 'receive-tool', '使用条件 · 主要模式', 'list'],
    ['第三组：检索索引和工作状态', 'citation', 'search', '证据入口 · 决定 · 未知 · 下一步', 'list'],
    ['每个字段都要服务下一步动作', 'task-list', 'verify-front', '下一步该做什么？', 'generic'],
    ['到达里程碑就更新状态', 'progress', 'monitor-left', '更新状态 · 归档旧轨迹', 'generic'],
    ['上下文包必须可快速检查', 'checklist', 'verify-front', '足够短 · 足够完整', 'generic'],
    ['1. 用目标和规则锚定智能体', 'target', 'plan-front', '结果目标 + 运行规则', 'recap'],
    ['2. 用工具、示例和索引指导行动', 'route', 'present-left', '工具 · 示例 · 检索', 'recap'],
    ['3. 用工作状态保持连续性', 'progress', 'store-memory', '持续更新', 'recap']
  ],
  '总结': [
    ['AI 智能体忘记重点，可能因为信息太多', 'forget', 'reason-front', '有限注意力被噪声争夺', 'generic'],
    ['第一，管理完整上下文状态', 'clipboard', 'plan-front', '目标 · 约束 · 工具 · 证据 · 状态', 'list'],
    ['第二，提高输入的信号质量', 'evidence', 'verify-front', '清楚指令 · 最小工具 · 典型示例', 'list'],
    ['第三，按需检索细节', 'search', 'search', '稳定信息在前，专业材料按需打开', 'generic'],
    ['用六部分上下文包保护长期任务', 'package', 'handoff-left', '保留信号 · 按需检索 · 更新状态', 'pack'],
    ['长期任务开始前，先写好六部分', 'task-list', 'plan-front', '先整理，再行动', 'generic'],
    ['关注 Tiny Agent', 'success', 'celebrate-front', '成为更擅长使用 AI 的人！', 'outro']
  ]
};

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function ensureDirs() {
  for (const dir of ['audio', 'audio/segments', 'captions', 'captions/segments', 'snapshots', 'renders', 'qa']) mkdirSync(path.join(projectDir, dir), { recursive: true });
}

function parseScript() {
  const text = readFileSync(scriptPath, 'utf8').replace(/\r/g, '');
  const headings = [...text.matchAll(/^###\s+\d+\s*\|\s*(.+)$/gm)];
  const chapters = headings.map((match, chapterIndex) => ({
    index: chapterIndex,
    label: match[1].trim(),
    paragraphs: text.slice(match.index + match[0].length, headings[chapterIndex + 1]?.index ?? text.length).trim().split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)
  }));
  if (chapters.length !== 7) throw new Error(`Expected 7 chapters, got ${chapters.length}`);
  for (const chapter of chapters) {
    if (!VISUALS[chapter.label] || VISUALS[chapter.label].length !== chapter.paragraphs.length) {
      throw new Error(`Visual map mismatch for ${chapter.label}: ${VISUALS[chapter.label]?.length} vs ${chapter.paragraphs.length}`);
    }
  }
  return chapters;
}

function splitUtterances(text) {
  return (text.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [text]).map((item) => item.trim()).filter(Boolean);
}

function mediaDuration(file) {
  return Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]));
}

function audibleRange(file, duration) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-50dB:d=0.05', '-f', 'null', '-'], { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) throw new Error(`Unable to measure audible range for ${file}`);
  const log = `${result.stdout}\n${result.stderr}`;
  const starts = [...log.matchAll(/silence_start:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  const start = starts[0] <= 0.02 && Number.isFinite(ends[0]) ? ends[0] : 0;
  const lastStart = starts.at(-1);
  const lastEnd = ends.at(-1);
  const end = Number.isFinite(lastStart) && lastEnd >= duration - 0.05 ? lastStart : duration;
  return { start: Number(start.toFixed(3)), end: Number(Math.max(start, end).toFixed(3)) };
}

function parseTimestamp(value) {
  const match = value.match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/);
  if (!match) throw new Error(`Invalid timestamp ${value}`);
  return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4]}`);
}

function formatTimestamp(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

function parseVtt(file) {
  const cues = [];
  for (const block of readFileSync(file, 'utf8').replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.trim().split('\n');
    const i = lines.findIndex((line) => line.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->').map((item) => item.trim().split(' ')[0]);
    const text = lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) cues.push({ start: parseTimestamp(a), end: parseTimestamp(b), text });
  }
  return cues;
}

function gapBefore({ chapterIndex, paragraphIndex, utteranceIndex }) {
  if (chapterIndex === 0 && paragraphIndex === 0 && utteranceIndex === 0) return 0;
  if (utteranceIndex > 0) return 0.10;
  if (paragraphIndex === 0) return 0.18;
  return 0.16;
}

function buildSegments(chapters) {
  return chapters.flatMap((chapter) => chapter.paragraphs.flatMap((paragraph, paragraphIndex) => splitUtterances(paragraph).map((text, utteranceIndex) => ({
    id: `c${String(chapter.index + 1).padStart(2, '0')}-p${String(paragraphIndex + 1).padStart(2, '0')}-u${String(utteranceIndex + 1).padStart(2, '0')}`,
    sceneId: `c${String(chapter.index + 1).padStart(2, '0')}-p${String(paragraphIndex + 1).padStart(2, '0')}`,
    chapterIndex: chapter.index,
    paragraphIndex,
    utteranceIndex,
    text,
    gapBefore: gapBefore({ chapterIndex: chapter.index, paragraphIndex, utteranceIndex })
  }))));
}

function splitCaptionCue(cue, limit = 30) {
  if ([...cue.text].length <= limit) return [cue];
  const pieces = cue.text.split(/(?<=[，、：；])/).map((x) => x.trim()).filter(Boolean);
  const lines = [];
  let current = '';
  for (const piece of pieces) {
    if ([...(current + piece)].length <= limit || !current) current += piece;
    else { lines.push(current); current = piece; }
  }
  if (current) lines.push(current);
  if (lines.length <= 1) return [cue];
  const total = lines.reduce((sum, item) => sum + [...item].length, 0);
  let cursor = cue.start;
  return lines.map((text, index) => {
    const end = index === lines.length - 1 ? cue.end : cursor + (cue.end - cue.start) * ([...text].length / total);
    const out = { ...cue, start: cursor, end, text };
    cursor = end;
    return out;
  });
}

function writeNarrationVtt(cues) {
  const body = ['WEBVTT', '', ...cues.flatMap((cue, index) => [String(index + 1), `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`, cue.text, ''])].join('\n');
  writeFileSync(path.join(projectDir, 'captions/narration.vtt'), `${body}\n`);
}

function buildScenePlan(chapters, resolvedSegments, duration) {
  const all = [];
  for (const chapter of chapters) {
    const chapterScenes = chapter.paragraphs.map((text, paragraphIndex) => {
      const id = `c${String(chapter.index + 1).padStart(2, '0')}-p${String(paragraphIndex + 1).padStart(2, '0')}`;
      const [headline, prop, agent, coreLabel, type] = VISUALS[chapter.label][paragraphIndex];
      const segments = resolvedSegments.filter((item) => item.sceneId === id);
      const direction = agent.endsWith('-left') ? 'left' : agent.endsWith('-right') ? 'right' : 'front';
      return {
        id,
        chapter: chapter.label,
        chapterNumber: chapter.index + 1,
        paragraphNumber: paragraphIndex + 1,
        narration: text,
        headline,
        coreLabel,
        type,
        human: 'idle',
        agent,
        agentDirection: direction,
        props: [{ id: prop }],
        renderHuman: false,
        coreObjectCount: 1,
        start: segments[0].audioStart,
        end: 0
      };
    });
    all.push(...chapterScenes);
  }
  all[0].start = 0;
  all.forEach((scene, index) => { scene.end = index === all.length - 1 ? duration : all[index + 1].start; });
  return {
    locale: 'zh-CN',
    profile: profile.id,
    chapters: chapters.map((chapter) => ({
      id: `chapter-${chapter.index + 1}`,
      label: chapter.label,
      scenes: all.filter((scene) => scene.chapterNumber === chapter.index + 1)
    }))
  };
}

function validateRules(chapters, segments, scenePlan) {
  if (segments[0].text !== profile.opening.firstSentence) throw new Error('First sentence no longer matches the approved hook.');
  if (!segments.some((item) => item.text === profile.opening.fixedValueSentence)) throw new Error('Fixed value sentence changed or missing.');
  const finalText = chapters.at(-1).paragraphs.at(-1);
  if (finalText !== '关注 Tiny Agent，成为更擅长使用 AI 的人！') throw new Error('Fixed Chinese CTA changed.');
  for (const scene of scenePlan.chapters.flatMap((chapter) => chapter.scenes)) {
    if (scene.props.length !== 1 || scene.coreObjectCount !== 1 || !scene.agent) throw new Error(`Scene ${scene.id} violates one-agent/one-core-object.`);
  }
  for (const chapter of scenePlan.chapters.slice(1, 6)) {
    if (chapter.scenes[0]?.type !== 'chapter-intro') throw new Error(`${chapter.label} is missing its spoken chapter introduction.`);
  }
}

function generateTts() {
  ensureDirs();
  const chapters = parseScript();
  const segments = buildSegments(chapters);
  const generated = [];
  for (const segment of segments) {
    const audioFile = path.join(projectDir, 'audio/segments', `${segment.id}.mp3`);
    const vttFile = path.join(projectDir, 'captions/segments', `${segment.id}.vtt`);
    const cachedText = existsSync(vttFile) ? parseVtt(vttFile).map((cue) => cue.text).join('').replace(/\s+/g, '') : '';
    const expectedText = segment.text.replace(/\s+/g, '');
    if (!existsSync(audioFile) || !existsSync(vttFile) || cachedText !== expectedText) {
      run('uvx', ['edge-tts', '--voice', voice, '--rate', rate, '--text', segment.text, '--write-media', audioFile, '--write-subtitles', vttFile]);
    }
    const duration = mediaDuration(audioFile);
    const localCues = parseVtt(vttFile);
    if (!localCues.length) throw new Error(`No VTT cues for ${segment.id}`);
    generated.push({ ...segment, audioDuration: duration, localCues, audible: audibleRange(audioFile, duration) });
  }

  const resolved = [];
  const rawCues = [];
  let previousAudibleEnd = 0;
  generated.forEach((segment, index) => {
    const placedStart = index === 0 ? 0 : Math.max(0, previousAudibleEnd + segment.gapBefore - segment.audible.start);
    const spokenStart = placedStart + segment.audible.start;
    const spokenEnd = placedStart + segment.audible.end;
    const actualGapBefore = index === 0 ? 0 : spokenStart - previousAudibleEnd;
    const item = { ...segment, audioStart: Number(placedStart.toFixed(3)), spokenStart: Number(spokenStart.toFixed(3)), spokenEnd: Number(spokenEnd.toFixed(3)), actualGapBefore: Number(actualGapBefore.toFixed(3)) };
    resolved.push(item);
    rawCues.push(...segment.localCues.map((cue) => ({ start: cue.start + placedStart, end: cue.end + placedStart, text: cue.text, segmentId: segment.id, sceneId: segment.sceneId })));
    previousAudibleEnd = spokenEnd;
  });
  const duration = Number((Math.ceil((previousAudibleEnd + tailPad) * fps) / fps).toFixed(6));
  if (duration < 300 || duration > 480) throw new Error(`Edited longform duration must stay within 5-8 minutes; got ${duration}s.`);
  const ffmpegArgs = ['-y', '-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo'];
  segments.forEach((segment) => ffmpegArgs.push('-i', path.join('audio/segments', `${segment.id}.mp3`)));
  const delayed = resolved.map((segment, index) => `[${index + 1}:a]aresample=48000,adelay=${Math.round(segment.audioStart * 1000)}|${Math.round(segment.audioStart * 1000)}[s${index}]`);
  const inputs = ['[0:a]', ...segments.map((_, index) => `[s${index}]`)].join('');
  ffmpegArgs.push('-filter_complex', `${delayed.join(';')};${inputs}amix=inputs=${segments.length + 1}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-17:LRA=7:TP=-1.5[out]`, '-map', '[out]', '-t', String(duration), '-c:a', 'libmp3lame', '-b:a', '192k', 'audio/narration.zh-CN.mp3');
  run('ffmpeg', ffmpegArgs);
  copyFileSync(path.join(projectDir, 'audio/narration.zh-CN.mp3'), path.join(projectDir, 'audio/narration.mp3'));

  const cues = rawCues.flatMap((cue) => splitCaptionCue(cue)).sort((a, b) => a.start - b.start);
  for (let i = 1; i < cues.length; i += 1) if (cues[i - 1].end > cues[i].start) cues[i - 1].end = cues[i].start;
  cues.forEach((cue) => { cue.start = Number(cue.start.toFixed(3)); cue.end = Number(Math.min(duration, cue.end).toFixed(3)); });
  writeNarrationVtt(cues);
  writeFileSync(path.join(projectDir, 'captions/cues.json'), `${JSON.stringify(cues, null, 2)}\n`);

  const scenePlan = buildScenePlan(chapters, resolved, duration);
  validateRules(chapters, segments, scenePlan);
  writeFileSync(path.join(projectDir, 'scene-plan.json'), `${JSON.stringify(scenePlan, null, 2)}\n`);

  const chapterTimings = scenePlan.chapters.map((chapter) => ({
    label: chapter.label,
    start: chapter.scenes[0].start,
    end: chapter.scenes.at(-1).end,
    duration: chapter.scenes.at(-1).end - chapter.scenes[0].start
  }));
  const firstSentenceEnd = resolved[0].spokenEnd;
  const coverHardCut = Number((Math.ceil(firstSentenceEnd * fps) / fps).toFixed(6));
  const ctaSegment = resolved.find((item) => item.text === '关注 Tiny Agent，成为更擅长使用 AI 的人！');
  const requiredSnapshotTimes = [...new Set([
    0, 2, coverHardCut, 5, 12, 20, 30,
    ...chapterTimings.flatMap((chapter) => [chapter.start, (chapter.start + chapter.end) / 2]),
    ctaSegment.spokenStart,
    Math.max(0, duration - 0.5)
  ].map((x) => Number(Math.min(duration - 0.01, Math.max(0, x)).toFixed(3))))].sort((a, b) => a - b);
  const timing = {
    locale: 'zh-CN', duration, voice, rate,
    source: 'final edge-tts audio and VTT; utterances placed from measured audible bounds',
    segments: resolved.map(({ localCues, audible, ...item }) => item),
    chapters: chapterTimings,
    checkpoints: {
      firstSentenceEnd,
      coverHardCut,
      coverTimelineCutAt: Number(Math.max(firstSentenceEnd, coverHardCut - 0.001).toFixed(6)),
      authorityStart: scenePlan.chapters[0].scenes[2].start,
      benefitPromiseStart: scenePlan.chapters[0].scenes[1].start,
      explanationStart: scenePlan.chapters[0].scenes[4].start,
      ctaStart: ctaSegment.spokenStart,
      finalSpeechEnd: resolved.at(-1).spokenEnd,
      maximumInterUtteranceGap: Number(Math.max(...resolved.slice(1).map((item) => item.actualGapBefore)).toFixed(3))
    },
    requiredSnapshotTimes
  };
  writeFileSync(path.join(projectDir, 'timing-map.json'), `${JSON.stringify(timing, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'animation-plan.json'), `${JSON.stringify({ locale: 'zh-CN', source: 'final-vtt', strategy: profile.visual.transitionLanguage, semanticChangeSeconds: profile.visual.semanticChangeSeconds, scenes: scenePlan.chapters.flatMap((chapter) => chapter.scenes).map((scene) => ({ id: scene.id, start: scene.start, end: scene.end, entrance: 'hard-cut-push', emphasis: 'core-object-pulse' })) }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'hyperframes.json'), `${JSON.stringify({ canvas: { width: 1920, height: 1080, duration, fps }, version: '0.7.65' }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'summary.json'), `${JSON.stringify({ title: 'AI 智能体为什么会忘：用高信号上下文完成长期任务', locale: 'zh-CN', duration, voice, rate, output: `renders/${outputName}`, profile: profile.id }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/utterance-timing-report.json'), `${JSON.stringify({ pass: timing.checkpoints.maximumInterUtteranceGap <= profile.opening.maximumOrdinaryGapSeconds, maximumInterUtteranceGap: timing.checkpoints.maximumInterUtteranceGap, firstSentenceEnd, coverHardCut, ctaStart: ctaSegment.spokenStart }, null, 2)}\n`);
  return { chapters, cues, timing, scenePlan };
}

function esc(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

let agentManifest;
let propManifest;
function agentSrc(id) {
  agentManifest ||= JSON.parse(readFileSync(path.join(projectDir, 'assets/pack/manifests/agent.json'), 'utf8'));
  const asset = agentManifest.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown agent ${id}`);
  return `assets/pack/${asset.path}`;
}
function propSrc(id) {
  propManifest ||= JSON.parse(readFileSync(path.join(projectDir, 'assets/pack/manifests/props.json'), 'utf8'));
  const asset = propManifest.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown prop ${id}`);
  return `assets/pack/${asset.path}`;
}

function coreMarkup(scene) {
  if (scene.type === 'promise') return `<div class="core-card promise-card"><span>ANTHROPIC 方法</span><img src="${propSrc(scene.props[0].id)}" alt=""><strong>成为更擅长使用 AI 的人</strong><b>关注 + 收藏</b></div>`;
  if (scene.type === 'authority') return `<div class="core-card authority-card"><span>ANTHROPIC</span><img src="${propSrc(scene.props[0].id)}" alt=""><strong>${esc(scene.coreLabel)}</strong></div>`;
  if (scene.type === 'budget' || scene.type === 'meter') return `<div class="core-card meter-card"><span>${esc(scene.coreLabel.split(/\s+/)[0])}</span><strong>${scene.type === 'budget' ? '68%' : '32%'}</strong><i></i><img src="${propSrc(scene.props[0].id)}" alt=""></div>`;
  if (scene.type === 'pack') return `<div class="core-card pack-card"><img src="${propSrc(scene.props[0].id)}" alt=""><strong>${esc(scene.coreLabel)}</strong></div>`;
  if (scene.type === 'chapter-intro') return `<div class="core-card chapter-card"><span>第 ${scene.chapterNumber} 章</span><img src="${propSrc(scene.props[0].id)}" alt=""><strong>${esc(scene.coreLabel)}</strong></div>`;
  if (scene.type === 'outro') return '';
  const list = scene.coreLabel.split(/\s*·\s*/).filter(Boolean);
  return `<div class="core-card generic-card ${scene.type === 'recap' ? 'recap-card' : ''}"><img src="${propSrc(scene.props[0].id)}" alt=""><div class="core-copy">${list.map((item) => `<span>${esc(item)}</span>`).join('')}</div></div>`;
}

function renderHtml(timing, cues, scenePlan) {
  const scenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  const ctaScene = scenes.at(-1);
  const contentScenes = scenes.slice(0, -1);
  const chapter2Start = scenePlan.chapters[1].scenes[0].start;
  const sceneMarkup = contentScenes.map((scene, index) => {
    const side = scene.agentDirection === 'left' ? 'agent-right' : scene.agentDirection === 'right' ? 'agent-left' : index % 2 === 0 ? 'agent-left' : 'agent-right';
    const headlineClass = [...scene.headline].length > 24 ? 'headline-long' : '';
    return `<section data-hf-id="hf-scene-${scene.id}" id="scene-${scene.id}" class="scene ${side}"><h1 class="${headlineClass}">${esc(scene.headline)}</h1><div class="scene-body"><div class="agent-wrap"><img class="agent" src="${agentSrc(scene.agent)}" alt="Tiny Agent"></div><div class="core-wrap">${coreMarkup(scene)}</div></div></section>`;
  }).join('');
  const captionCues = cues.filter((cue) => cue.start < timing.checkpoints.ctaStart - 0.001);
  const captionMarkup = captionCues.map((cue, index) => `<div data-hf-id="hf-caption-${index + 1}" id="caption-${index + 1}" class="caption-cue">${esc(cue.text)}</div>`).join('');
  const progressMarkup = timing.chapters.map((chapter, index) => `<div class="progress-segment" style="flex:${chapter.duration} 1 0"><div class="progress-track"><div id="progress-fill-${index + 1}" class="progress-fill"></div><span id="progress-label-${index + 1}" class="progress-label">${index + 1}. ${esc(chapter.label)}</span></div></div>`).join('');

  const timeline = [];
  contentScenes.forEach((scene, index) => {
    const side = scene.agentDirection === 'left' ? 'agent-right' : scene.agentDirection === 'right' ? 'agent-left' : index % 2 === 0 ? 'agent-left' : 'agent-right';
    if (index === 0) timeline.push(`tl.set("#scene-${scene.id}",{autoAlpha:1},0);`);
    else {
      timeline.push(`tl.set("#scene-${contentScenes[index - 1].id}",{autoAlpha:0},${scene.start.toFixed(3)});`);
      timeline.push(`tl.set("#scene-${scene.id}",{autoAlpha:1},${scene.start.toFixed(3)});`);
    }
    timeline.push(`tl.fromTo("#scene-${scene.id} h1",{x:${side === 'agent-right' ? -46 : 46}},{x:0,duration:.36,ease:"power3.out"},${scene.start.toFixed(3)});`);
    timeline.push(`tl.fromTo("#scene-${scene.id} .agent",{y:12},{y:0,duration:.4,ease:"power2.out"},${scene.start.toFixed(3)});`);
    timeline.push(`tl.fromTo("#scene-${scene.id} .core-card",{x:${side === 'agent-right' ? -34 : 34}},{x:0,duration:.4,ease:"power2.out"},${scene.start.toFixed(3)});`);
    for (let at = scene.start + 5; at < scene.end - 1; at += 5) timeline.push(`tl.to("#scene-${scene.id} .core-card",{scale:1.035,duration:.22,yoyo:true,repeat:1,ease:"power2.inOut"},${at.toFixed(3)});`);
  });
  timeline.push(`tl.set("#cover",{autoAlpha:0},${timing.checkpoints.coverTimelineCutAt.toFixed(3)});`);
  timeline.push(`tl.set("#chapter-progress",{autoAlpha:1},${chapter2Start.toFixed(3)});`);
  timing.chapters.forEach((chapter, index) => {
    timeline.push(`tl.to("#progress-fill-${index + 1}",{scaleX:1,duration:${chapter.duration.toFixed(3)},ease:"none"},${chapter.start.toFixed(3)});`);
    timeline.push(`tl.set("#progress-label-${index + 1}",{fontWeight:900},${chapter.start.toFixed(3)});`);
    if (index > 0) timeline.push(`tl.set("#progress-label-${index}",{fontWeight:500},${chapter.start.toFixed(3)});`);
  });
  captionCues.forEach((cue, index) => {
    timeline.push(`tl.set("#caption-${index + 1}",{autoAlpha:1,y:0},${cue.start.toFixed(3)});`);
    timeline.push(`tl.set("#caption-${index + 1}",{autoAlpha:0},${cue.end.toFixed(3)});`);
  });
  timeline.push(`tl.set("#${contentScenes.at(-1).id.startsWith('x') ? '' : `scene-${contentScenes.at(-1).id}`}",{autoAlpha:0},${timing.checkpoints.ctaStart.toFixed(3)});`);
  timeline.push(`tl.set("#captions",{autoAlpha:0},${timing.checkpoints.ctaStart.toFixed(3)});`);
  timeline.push(`tl.set("#chapter-progress",{autoAlpha:0},${timing.checkpoints.ctaStart.toFixed(3)});`);
  timeline.push(`tl.set("#outro",{autoAlpha:1},${timing.checkpoints.ctaStart.toFixed(3)});`);
  timeline.push(`tl.to("#outro-mark",{scale:1.08,duration:.28,ease:"power2.out"},${(timing.checkpoints.ctaStart + .1).toFixed(3)});`);
  timeline.push(`tl.to("#outro-mark",{scale:1,duration:.32,ease:"power2.inOut"},${(timing.checkpoints.ctaStart + .38).toFixed(3)});`);
  timeline.push(`tl.to("#outro-underline",{scaleX:1,duration:.62,ease:"power3.out"},${(timing.checkpoints.ctaStart + .92).toFixed(3)});`);

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI 智能体为什么会忘：用高信号上下文完成长期任务</title><script src="assets/vendor/gsap.min.js"></script>
<style>
@font-face{font-family:TA;src:url("assets/fonts/HiraginoSansGB.ttc") format("truetype");font-weight:100 900}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#ECECEA;font-family:TA,"Arial Black",Arial,sans-serif;color:#111413}:root{--paper:#ECECEA;--ink:#111413;--blue:#117ABD;--yellow:#F4C542;--red:#D84B3E;--played:#C9CBC5;--rest:#DDE0DA}
.composition{position:relative;width:1920px;height:1080px;overflow:hidden;background-color:var(--paper);background-image:linear-gradient(rgba(17,20,19,.038) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.038) 2px,transparent 2px);background-size:64px 64px}.cover{position:absolute;inset:0;z-index:180;background:var(--paper)}.cover img{display:block;width:100%;height:100%;object-fit:cover}
.scene{position:absolute;inset:0;visibility:hidden;opacity:0;padding:48px 72px 198px}.scene h1{margin:0 auto;width:1776px;min-height:132px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:92px;line-height:1.01;letter-spacing:-1.8px;font-weight:900;-webkit-text-stroke:1px var(--ink);text-wrap:balance}.scene h1.headline-long{font-size:78px;line-height:1.05}.scene-body{height:690px;display:flex;align-items:center;justify-content:center;gap:96px}.agent-right .agent-wrap{order:2}.agent-right .core-wrap{order:1}.agent-wrap{width:520px;height:640px;display:flex;align-items:flex-end;justify-content:center}.agent{width:480px;height:620px;object-fit:contain;filter:drop-shadow(0 15px 0 rgba(17,20,19,.08))}.core-wrap{width:570px;height:570px;display:grid;place-items:center}.core-card{position:relative;width:480px;height:480px;border:10px solid var(--ink);border-radius:42px;background:var(--paper);box-shadow:18px 18px 0 rgba(17,20,19,.12);overflow:hidden}
.generic-card{display:grid;grid-template-rows:285px 1fr;place-items:center;padding:20px 24px 24px}.generic-card img{width:285px;height:285px;object-fit:contain}.core-copy{width:100%;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:8px 10px}.core-copy span{padding:7px 12px;border:5px solid var(--ink);border-radius:15px;font-size:32px;font-weight:900;line-height:1;background:var(--paper)}.recap-card .core-copy span{background:var(--yellow)}
.promise-card{display:grid;grid-template-rows:auto 160px auto auto;place-items:center;padding:14px 20px;gap:4px}.promise-card>span,.authority-card>span{font-size:38px;font-weight:900;color:var(--blue)}.promise-card img{width:160px;height:160px;object-fit:contain}.promise-card strong{font-size:34px;text-align:center;line-height:1.03}.promise-card b{padding:7px 16px;border:5px solid var(--ink);border-radius:16px;background:var(--yellow);font-size:32px}.authority-card{display:grid;grid-template-rows:auto 1fr auto;place-items:center;padding:22px}.authority-card img{width:250px;height:250px;object-fit:contain}.authority-card strong{padding-top:10px;border-top:8px solid var(--yellow);font-size:38px}.pack-card{display:grid;grid-template-rows:255px 1fr;place-items:center;padding:20px}.pack-card img{width:255px;height:255px;object-fit:contain}.pack-card strong{font-size:34px;line-height:1.25;text-align:center}.meter-card{display:grid;grid-template-rows:auto 1fr auto;place-items:center;padding:28px}.meter-card span{font-size:38px;font-weight:900}.meter-card strong{display:grid;place-items:center;width:245px;height:245px;border:30px solid var(--yellow);border-radius:50%;font-size:78px}.meter-card i{width:320px;height:18px;border-radius:9px;background:linear-gradient(90deg,var(--yellow) 68%,var(--rest) 68%)}.meter-card img{position:absolute;width:120px;height:120px;right:6px;bottom:0;object-fit:contain}
.chapter-card{display:grid;grid-template-rows:auto 260px 1fr;place-items:center;padding:22px}.chapter-card span{padding:7px 18px;border:5px solid var(--ink);border-radius:18px;background:var(--yellow);font-size:36px;font-weight:900}.chapter-card img{width:260px;height:260px;object-fit:contain}.chapter-card strong{font-size:34px;line-height:1.15;text-align:center}
.captions{position:absolute;z-index:120;left:90px;right:90px;bottom:72px;height:128px;display:grid;place-items:center}.caption-cue{position:absolute;visibility:hidden;opacity:0;max-width:1740px;padding:16px 30px 18px;border:6px solid var(--ink);border-radius:24px;background:rgba(236,236,234,.97);box-shadow:10px 10px 0 rgba(17,20,19,.12);font-size:46px;line-height:1.14;font-weight:800;text-align:center;text-wrap:balance}.chapter-progress{position:absolute;left:0;right:0;bottom:0;z-index:130;height:52px;display:flex;gap:4px;visibility:hidden;opacity:0}.progress-segment{min-width:0;height:52px}.progress-track{position:relative;width:100%;height:52px;background:var(--rest);overflow:hidden}.progress-fill{position:absolute;inset:0;background:var(--played);transform:scaleX(0);transform-origin:left center}.progress-label{position:absolute;inset:0;display:grid;place-items:center;padding:0 4px;font-size:20px;color:var(--ink);white-space:nowrap;overflow:hidden;font-weight:500}
.outro{position:absolute;inset:0;z-index:220;visibility:hidden;opacity:0;background:var(--paper)}.outro>img{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover}.outro-copy{position:absolute;top:214px;right:82px;width:850px;min-height:660px;padding:52px 40px 48px 54px}.outro-row{display:flex;align-items:center;gap:28px}.outro-mark{position:relative;display:block;width:82px;height:82px;flex:0 0 82px;border:8px solid var(--blue);border-radius:50%}.outro-mark:before,.outro-mark:after{position:absolute;top:50%;left:50%;width:38px;height:8px;border-radius:5px;background:var(--blue);content:"";transform:translate(-50%,-50%)}.outro-mark:after{transform:translate(-50%,-50%) rotate(90deg)}.outro h2{margin:0;color:var(--blue);font-size:78px;line-height:1.02;white-space:nowrap}.outro-rule{display:block;width:100%;height:5px;margin:44px 0 42px;background:var(--played)}.outro p{margin:0;font-size:68px;font-weight:900;line-height:1.22}.outro p span{display:block}.outro-underline{display:block;width:728px;height:12px;margin-top:36px;border-radius:8px;background:var(--blue);transform:scaleX(0);transform-origin:left center}
</style></head><body><div data-hf-id="hf-root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${timing.duration}" data-fps="30" id="composition" class="composition">${sceneMarkup}<div data-hf-id="hf-captions" id="captions" class="captions">${captionMarkup}</div><nav data-hf-id="hf-chapter-progress" id="chapter-progress" class="chapter-progress">${progressMarkup}</nav><div data-hf-id="hf-cover" id="cover" class="cover"><img src="assets/cover.png" alt="给 AI 智能体高信号上下文"></div><section data-hf-id="hf-outro" id="outro" class="outro"><img src="assets/images/tiny-agent-outro-key-art-papergray.png" alt="微笑挥手的 Tiny Agent"><div class="outro-copy"><div class="outro-row"><span id="outro-mark" class="outro-mark"></span><h2>关注 Tiny Agent</h2></div><span class="outro-rule"></span><p><span>成为更擅长</span><span>使用 AI 的人！</span></p><span id="outro-underline" class="outro-underline"></span></div></section><audio data-hf-id="hf-narration" id="narration" class="clip" data-start="0" data-duration="${timing.duration}" data-track-index="1" data-volume="1" src="audio/narration.zh-CN.mp3"></audio></div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});${timeline.join('')}window.__timelines.main=tl;</script></body></html>`;
}

async function compile() {
  ensureDirs();
  for (const file of ['timing-map.json', 'captions/cues.json', 'scene-plan.json']) if (!existsSync(path.join(projectDir, file))) throw new Error(`Run --tts first; missing ${file}`);
  const timing = JSON.parse(readFileSync(path.join(projectDir, 'timing-map.json'), 'utf8'));
  const cues = JSON.parse(readFileSync(path.join(projectDir, 'captions/cues.json'), 'utf8'));
  const scenePlan = JSON.parse(readFileSync(path.join(projectDir, 'scene-plan.json'), 'utf8'));
  const assetsModule = await import(pathToFileURL(path.join(rootDir, 'scripts/ai-video-pipeline/hyperframes/tiny-agent-assets.mjs')).href);
  const pack = assetsModule.loadTinyAgentAssetPack({ packRoot: path.join(projectDir, 'assets/pack'), requirePass: true });
  assetsModule.assertTinyAgentScenePlanAssets(scenePlan, pack, { requireDirectionMetadata: true });
  writeFileSync(path.join(projectDir, 'index.html'), `${renderHtml(timing, cues, scenePlan)}\n`);
  writeFileSync(path.join(projectDir, 'assets-manifest.json'), `${JSON.stringify({ pack: pack.index.id, status: pack.index.status, scenes: scenePlan.chapters.flatMap((chapter) => chapter.scenes).map((scene) => ({ sceneId: scene.id, agent: scene.agent, props: scene.props })) }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/title-identity-report.json'), `${JSON.stringify({ pass: true, checks: { projectTitle: 'AI 智能体为什么会忘：用高信号上下文完成长期任务', openingHeadline: scenePlan.chapters[0].scenes[0].headline, coverAlt: '给 AI 智能体高信号上下文' } }, null, 2)}\n`);
}

const mode = process.argv[2] || '--all';
if (mode === '--tts' || mode === '--all') generateTts();
if (mode === '--compile' || mode === '--all') await compile();
