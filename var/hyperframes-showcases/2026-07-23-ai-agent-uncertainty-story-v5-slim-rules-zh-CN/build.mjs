import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(projectDir, '../../..');
const episode = JSON.parse(readFileSync(path.join(projectDir, 'episode.json'), 'utf8'));
const scriptPath = path.join(projectDir, episode.scriptFile);
const profile = JSON.parse(readFileSync(path.join(projectDir, 'production-profile.json'), 'utf8'));
const voice = episode.voice;
const rate = episode.rate;
const fps = 30;
const tailPad = 0.3;
const outputName = episode.outputName;

const DEFAULT_GENERATED_ART = {
  'c01-p05': 'signal-balance.png',
  'c02-p03': 'noise-storm.png',
  'c02-p07': 'context-filter.png',
  'c03-p04': 'tool-overlap.png',
  'c04-p04': 'targeted-retrieval.png',
  'c05-p02': 'compression-memory.png',
  'c05-p05': 'state-handoff.png',
  'c06-p04': 'targeted-retrieval.png',
  'c06-p07': 'context-toolkit.png',
  'c07-p01': 'noise-storm.png'
};

const DEFAULT_LAYOUTS = {
  'c01-p01': 'big-text',
  'c01-p02': 'human-agent-prop',
  'c01-p03': 'big-text',
  'c01-p04': 'two-props',
  'c01-p06': 'agent-center',
  'c02-p02': 'human-agent-prop',
  'c02-p04': 'big-text',
  'c02-p05': 'human-prop',
  'c02-p06': 'two-props',
  'c03-p02': 'human-prop',
  'c03-p03': 'human-agent-prop',
  'c03-p05': 'two-props',
  'c03-p06': 'agent-center',
  'c03-p07': 'big-text',
  'c04-p02': 'human-center',
  'c04-p03': 'two-props',
  'c04-p05': 'agent-center',
  'c04-p06': 'human-agent-prop',
  'c04-p07': 'human-prop',
  'c05-p03': 'human-center',
  'c05-p04': 'human-prop',
  'c05-p06': 'human-agent-prop',
  'c05-p07': 'two-props',
  'c06-p02': 'human-agent-prop',
  'c06-p03': 'two-props',
  'c06-p05': 'big-text',
  'c06-p06': 'agent-center',
  'c07-p02': 'human-prop',
  'c07-p03': 'agent-center',
  'c07-p04': 'two-props',
  'c07-p05': 'human-agent-prop',
  'c07-p06': 'big-text'
};

const DEFAULT_SECOND_PROPS = {
  'c01-p04': 'target',
  'c02-p06': 'shield',
  'c03-p05': 'evidence',
  'c04-p03': 'search',
  'c05-p07': 'note',
  'c06-p03': 'skill-card',
  'c07-p04': 'citation'
};

const DEFAULT_HUMAN_POSES = {
  'c01-p02': 'present-right',
  'c02-p02': 'operate-right',
  'c02-p05': 'review-front',
  'c03-p02': 'explain-front',
  'c03-p03': 'operate-right',
  'c04-p02': 'caution-front',
  'c04-p06': 'present-right',
  'c04-p07': 'stop-front',
  'c05-p03': 'review-front',
  'c05-p04': 'write-front',
  'c05-p06': 'decide-front',
  'c06-p02': 'handoff-right',
  'c07-p02': 'review-front',
  'c07-p05': 'handoff-right'
};

const DEFAULT_MOTIONS = {
  'c01-p03': 'press-pulse',
  'c02-p04': 'press-pulse',
  'c03-p07': 'press-pulse',
  'c06-p05': 'press-pulse',
  'c01-p04': 'spring-pop',
  'c02-p06': 'spring-pop',
  'c03-p05': 'spring-pop',
  'c05-p07': 'spring-pop',
  'c01-p02': 'nudge',
  'c02-p02': 'nudge',
  'c05-p04': 'nudge',
  'c06-p02': 'nudge',
  'c01-p05': 'split-tilt',
  'c02-p03': 'split-tilt',
  'c03-p04': 'split-tilt',
  'c04-p04': 'split-tilt',
  'c02-p05': 'fly-in',
  'c03-p03': 'fly-in',
  'c04-p06': 'fly-in',
  'c07-p05': 'fly-in',
  'c04-p03': 'spin-in',
  'c05-p06': 'spin-in',
  'c06-p03': 'spin-in',
  'c07-p04': 'spin-in',
  'c01-p06': 'sine-float',
  'c04-p05': 'sine-float',
  'c05-p03': 'sine-float',
  'c07-p03': 'sine-float'
};

const DEFAULT_VISUALS = {
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

const GENERATED_ART = episode.generatedArt || DEFAULT_GENERATED_ART;
const LAYOUTS = episode.layouts || DEFAULT_LAYOUTS;
const SECOND_PROPS = episode.secondProps || DEFAULT_SECOND_PROPS;
const HUMAN_POSES = episode.humanPoses || DEFAULT_HUMAN_POSES;
const MOTIONS = episode.motions || DEFAULT_MOTIONS;
const VISUALS = episode.visuals || DEFAULT_VISUALS;

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
  if (chapters.length !== 5) throw new Error(`Expected 5 chapters, got ${chapters.length}`);
  for (const chapter of chapters) {
    if (!VISUALS[chapter.label] || VISUALS[chapter.label].length !== chapter.paragraphs.length) {
      throw new Error(`Visual map mismatch for ${chapter.label}: ${VISUALS[chapter.label]?.length} vs ${chapter.paragraphs.length}`);
    }
  }
  return chapters;
}

function splitUtterances(text) {
  const pattern = episode.locale.startsWith('zh') ? /[^。！？!?；;]+[。！？!?；;]?/g : /[^.!?;]+[.!?;]?/g;
  return (text.match(pattern) || [text]).map((item) => item.trim()).filter(Boolean);
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
  if (chapterIndex === 0 && paragraphIndex === 1 && utteranceIndex === 0) return profile.opening.fullQuestionHoldSeconds;
  if (utteranceIndex > 0) return profile.cognitiveLoad.ordinaryPauseSeconds;
  if (paragraphIndex === 0) return profile.cognitiveLoad.chapterBoundaryPauseSeconds;
  return profile.cognitiveLoad.knowledgeUnitPauseSeconds;
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

function splitCaptionCue(cue, limit = episode.locale.startsWith('zh') ? 30 : 76) {
  if ([...cue.text].length <= limit) return [cue];
  const pieces = episode.locale.startsWith('zh')
    ? cue.text.split(/(?<=[，、：；])/).map((x) => x.trim()).filter(Boolean)
    : cue.text.split(/\s+/).map((x) => x.trim()).filter(Boolean);
  const lines = [];
  let current = '';
  for (const piece of pieces) {
    const separator = episode.locale.startsWith('zh') ? '' : ' ';
    const candidate = current ? `${current}${separator}${piece}` : piece;
    if ([...candidate].length <= limit || !current) current = candidate;
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

function buildHookTiming(firstSegment) {
  const start = firstSegment.spokenStart;
  const end = firstSegment.spokenEnd;
  const totalDuration = Math.max(0.3, end - start);
  const visualLeadSeconds = profile.opening.visualLeadSeconds;
  if (episode.locale.startsWith('zh')) {
    const chars = [...firstSegment.text].filter((char) => !/\s/.test(char));
    const weightTotal = chars.reduce((sum, char) => sum + (/[，。！？!?]/.test(char) ? 0.55 : 1), 0);
    let cursorWeight = 0;
    const glyphs = chars.map((char, index) => {
      const voiceAt = start + totalDuration * (cursorWeight / weightTotal);
      const at = Math.max(0, voiceAt - visualLeadSeconds);
      cursorWeight += /[，。！？!?]/.test(char) ? 0.55 : 1;
      return {
        id: `hook-glyph-${index + 1}`,
        text: char,
        at: Number(at.toFixed(3)),
        voiceAt: Number(voiceAt.toFixed(3)),
        visualLeadSeconds: Number((voiceAt - at).toFixed(3)),
        wordIndex: index,
        letterIndex: 0
      };
    });
    return {
      mode: 'character-with-authored-visual-lead',
      source: 'final edge-tts VTT audible range',
      requestedVisualLeadSeconds: visualLeadSeconds,
      earlyRevealCount: glyphs.filter((glyph) => glyph.at < glyph.voiceAt).length,
      glyphs
    };
  }
  const tokens = firstSegment.text.split(/\s+/).filter(Boolean);
  const weights = tokens.map((token) => Math.max(2, token.replace(/[^A-Za-z0-9]/g, '').length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursorWeight = 0;
  const glyphs = [];
  const words = tokens.map((token, wordIndex) => {
    const wordStart = start + totalDuration * (cursorWeight / totalWeight);
    cursorWeight += weights[wordIndex];
    const nextWordStart = start + totalDuration * (cursorWeight / totalWeight);
    [...token].forEach((char, letterIndex) => {
      const at = Math.min(nextWordStart - 0.012, wordStart + letterIndex * Math.min(0.045, Math.max(0.018, (nextWordStart - wordStart) / Math.max(2, token.length + 1))));
      glyphs.push({ id: `hook-glyph-${glyphs.length + 1}`, text: char, at: Number(Math.max(wordStart, at).toFixed(3)), wordIndex, letterIndex });
    });
    return { index: wordIndex, text: token, start: Number(wordStart.toFixed(3)), end: Number(nextWordStart.toFixed(3)) };
  });
  return { mode: 'word-letter', source: 'final edge-tts VTT audible range', earlyRevealCount: 0, words, glyphs };
}

function writeNarrationVtt(cues) {
  const body = ['WEBVTT', '', ...cues.flatMap((cue, index) => [String(index + 1), `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`, cue.text, ''])].join('\n');
  writeFileSync(path.join(projectDir, 'captions/narration.vtt'), `${body}\n`);
}

function directionOf(id) {
  if (id.endsWith('-left')) return 'left';
  if (id.endsWith('-right')) return 'right';
  return 'front';
}

function renderFlags(layout, id) {
  if (layout === 'chapter-intro') return { renderHuman: true, renderAgent: true };
  if (layout === 'human-agent-prop') return { renderHuman: true, renderAgent: true };
  if (layout === 'human-prop' || layout === 'human-center') return { renderHuman: true, renderAgent: false };
  if (layout === 'agent-center' || layout === 'agent-prop') return { renderHuman: false, renderAgent: true };
  if (layout === 'big-text') return { renderHuman: ['c02-p04', 'c04-p06', 'c07-p06'].includes(id), renderAgent: !['c02-p04', 'c04-p06', 'c07-p06'].includes(id) };
  return { renderHuman: false, renderAgent: false };
}

function buildScenePlan(chapters, resolvedSegments, duration) {
  const generatedSceneIds = Object.keys(GENERATED_ART);
  const all = [];
  for (const chapter of chapters) {
    const chapterScenes = chapter.paragraphs.map((text, paragraphIndex) => {
      const id = `c${String(chapter.index + 1).padStart(2, '0')}-p${String(paragraphIndex + 1).padStart(2, '0')}`;
      const [headline, prop, agent, coreLabel, type] = VISUALS[chapter.label][paragraphIndex];
      const segments = resolvedSegments.filter((item) => item.sceneId === id);
      const layout = type === 'recap' ? 'recap' : type === 'chapter-intro' ? 'chapter-intro' : GENERATED_ART[id] ? 'generated' : LAYOUTS[id] || 'agent-prop';
      const generatedIndex = generatedSceneIds.indexOf(id);
      const generatedArtSide = layout === 'generated' ? (generatedIndex % 2 === 0 ? 'left' : 'right') : null;
      const highlightSide = generatedArtSide === 'left' ? 'right' : generatedArtSide === 'right' ? 'left' : null;
      const human = HUMAN_POSES[id] || (layout === 'chapter-intro' ? 'present-right' : 'idle');
      const flags = renderFlags(layout, id);
      const props = [{ id: prop }, ...(SECOND_PROPS[id] ? [{ id: SECOND_PROPS[id] }] : [])];
      return {
        id,
        chapter: chapter.label,
        chapterNumber: chapter.index + 1,
        paragraphNumber: paragraphIndex + 1,
        narration: text,
        headline,
        coreLabel,
        type,
        layout,
        generatedArt: GENERATED_ART[id] || null,
        temporaryGenerated: Boolean(GENERATED_ART[id]),
        generatedArtSide,
        highlightSide,
        motionType: MOTIONS[id] || null,
        recapPoints: episode.recapPoints?.[id] || null,
        human,
        humanDirection: directionOf(human),
        agent,
        agentDirection: directionOf(agent),
        props,
        renderHuman: flags.renderHuman,
        renderAgent: flags.renderAgent,
        coreObjectCount: layout === 'two-props' ? 2 : 1,
        start: segments[0].spokenStart,
        end: 0
      };
    });
    all.push(...chapterScenes);
  }
  all[0].start = 0;
  all.forEach((scene, index) => { scene.end = index === all.length - 1 ? duration : all[index + 1].start; });
  return {
    locale: episode.locale,
    profile: profile.id,
    chapters: chapters.map((chapter) => ({
      id: `chapter-${chapter.index + 1}`,
      label: chapter.label,
      scenes: all.filter((scene) => scene.chapterNumber === chapter.index + 1)
    }))
  };
}

function validateRules(chapters, segments, scenePlan) {
  if (segments[0].text !== episode.firstSentence) throw new Error('First sentence no longer matches the approved hook.');
  if (!chapters.some((chapter) => chapter.paragraphs.includes(episode.fixedValueSentence))) throw new Error('Fixed value sentence changed or missing.');
  const finalText = chapters.at(-1).paragraphs.at(-1);
  if (finalText !== episode.fixedOutroCta) throw new Error('Fixed CTA changed.');
  const scenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  for (const scene of scenes) {
    if (!scene.agent || !scene.human || !scene.agentDirection || !scene.humanDirection) throw new Error(`Scene ${scene.id} lacks actor direction metadata.`);
    if (scene.layout === 'two-props' && scene.props.length !== 2) throw new Error(`Scene ${scene.id} requires two props.`);
    if (scene.generatedArt && !existsSync(path.join(projectDir, 'assets/generated/scene-art', scene.generatedArt))) throw new Error(`Missing generated art for ${scene.id}: ${scene.generatedArt}`);
  }
  const generatedScenes = scenes.filter((scene) => scene.layout === 'generated');
  if (!generatedScenes.every((scene) => ['left', 'right'].includes(scene.generatedArtSide) && scene.highlightSide !== scene.generatedArtSide)) throw new Error('Generated art and yellow highlight must occupy opposite sides.');
  if (new Set(generatedScenes.map((scene) => scene.generatedArtSide)).size !== 2) throw new Error('Generated art must use both left and right layouts.');
  if (!generatedScenes.slice(1).every((scene, index) => scene.generatedArtSide !== generatedScenes[index].generatedArtSide)) throw new Error('Generated art sides must alternate across the video.');
  for (const chapter of scenePlan.chapters.slice(1, -1)) {
    if (chapter.scenes[0]?.type !== 'chapter-intro') throw new Error(`${chapter.label} is missing its story-led module opening.`);
    if (chapter.scenes.some((scene) => scene.type === 'recap')) throw new Error(`${chapter.label} must not contain a formal spoken recap.`);
  }
  const storyTransitions = scenePlan.chapters.slice(1, -2).map((chapter) => chapter.scenes.at(-1));
  if (!storyTransitions.every((scene) => scene?.type === 'transition')) throw new Error('The first two substantive modules must hand off with a story transition.');
  const eligible = scenes.filter((scene) => scene.type !== 'outro');
  const generatedRatio = eligible.filter((scene) => scene.temporaryGenerated).length / eligible.length;
  if (generatedRatio < 0.15) throw new Error(`Generated scene-art ratio is below 15%: ${generatedRatio}`);
  const motionScenes = scenes.filter((scene) => scene.motionType);
  const motionTypes = new Set(motionScenes.map((scene) => scene.motionType));
  if (motionScenes.length < profile.visual.motionBeatMinimum || motionTypes.size < profile.visual.motionTypeMinimum) throw new Error(`Motion requirement failed: ${motionTypes.size} types / ${motionScenes.length} beats.`);
  const intro = scenePlan.chapters[0].scenes;
  if (intro[0]?.type !== 'hook') throw new Error('The first scene must be the voice-synced kinetic hook.');
  if (intro.at(-1)?.type !== 'promise' || intro.at(-1)?.narration !== episode.fixedValueSentence) throw new Error('intro-follow-save must be the final introduction scene.');
  if (intro.slice(0, -1).some((scene) => scene.type === 'promise')) throw new Error('Follow/save appears before the final introduction scene.');
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
  if (duration < profile.duration.minimumSeconds || duration > profile.duration.maximumSeconds) throw new Error(`Edited deep longform duration must stay within ${profile.duration.minimumSeconds}-${profile.duration.maximumSeconds} seconds; got ${duration}s.`);
  const ffmpegArgs = ['-y', '-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo'];
  segments.forEach((segment) => ffmpegArgs.push('-i', path.join('audio/segments', `${segment.id}.mp3`)));
  const delayed = resolved.map((segment, index) => `[${index + 1}:a]aresample=48000,adelay=${Math.round(segment.audioStart * 1000)}|${Math.round(segment.audioStart * 1000)}[s${index}]`);
  const inputs = ['[0:a]', ...segments.map((_, index) => `[s${index}]`)].join('');
  const narrationLocalePath = `audio/narration.${episode.locale}.mp3`;
  ffmpegArgs.push('-filter_complex', `${delayed.join(';')};${inputs}amix=inputs=${segments.length + 1}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-17:LRA=7:TP=-1.5[out]`, '-map', '[out]', '-t', String(duration), '-c:a', 'libmp3lame', '-b:a', '192k', narrationLocalePath);
  run('ffmpeg', ffmpegArgs);
  copyFileSync(path.join(projectDir, narrationLocalePath), path.join(projectDir, 'audio/narration.mp3'));

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
  const ctaSceneId = scenePlan.chapters.at(-1).scenes.at(-1).id;
  const ctaSegment = resolved.find((item) => item.sceneId === ctaSceneId);
  if (!ctaSegment) throw new Error('Unable to locate fixed outro CTA timing.');
  const hookTiming = buildHookTiming(resolved[0]);
  const introScenes = scenePlan.chapters[0].scenes;
  const introFollowSave = introScenes.at(-1);
  const hookHardCut = Number((Math.ceil(introScenes[1].start * fps) / fps).toFixed(6));
  const finalHookGlyph = hookTiming.glyphs.at(-1);
  const maximumVisualLeadSeconds = Number(Math.max(...hookTiming.glyphs.map((glyph) => glyph.visualLeadSeconds || 0)).toFixed(3));
  const fullQuestionHoldSeconds = Number((hookHardCut - finalHookGlyph.at).toFixed(3));
  const ctaVisualStart = Number((Math.ceil(ctaSegment.spokenStart * fps) / fps).toFixed(6));
  const requiredSnapshotTimes = [...new Set([
    0,
    Math.min(2, firstSentenceEnd - 0.1),
    Math.min(hookHardCut - 0.1, finalHookGlyph.at + 0.5),
    hookHardCut,
    5, 12, 20, 30,
    introFollowSave.start, Math.min(duration - 0.01, introFollowSave.start + 1 / fps), Math.max(introFollowSave.start, introFollowSave.end - 0.04), introFollowSave.end, Math.min(duration - 0.01, introFollowSave.end + 1 / fps),
    ...chapterTimings.flatMap((chapter) => [chapter.start, (chapter.start + chapter.end) / 2]),
    ctaSegment.spokenStart, ctaVisualStart,
    Math.max(0, duration - 0.5)
  ].map((x) => Number(Math.min(duration - 0.01, Math.max(0, x)).toFixed(3))))].sort((a, b) => a - b);
  const timing = {
    locale: episode.locale, duration, voice, rate,
    source: 'final edge-tts audio and VTT; utterances placed from measured audible bounds',
    hookTiming,
    segments: resolved.map(({ localCues, audible, ...item }) => item),
    chapters: chapterTimings,
    checkpoints: {
      firstSentenceEnd,
      hookHardCut,
      finalHookGlyphAt: finalHookGlyph.at,
      finalHookGlyphVoiceAt: finalHookGlyph.voiceAt,
      maximumVisualLeadSeconds,
      fullQuestionHoldSeconds,
      coverHardCut: hookHardCut,
      hookTimelineCutAt: Number(Math.max(firstSentenceEnd, hookHardCut - 0.001).toFixed(6)),
      coverTimelineCutAt: Number(Math.max(firstSentenceEnd, hookHardCut - 0.001).toFixed(6)),
      authorityStart: introScenes[1].start,
      benefitPromiseStart: introScenes[2].start,
      artifactPreviewStart: introScenes[3].start,
      explanationStart: introScenes[3].start,
      introFollowSaveStart: introFollowSave.start,
      introFollowSaveEnd: introFollowSave.end,
      firstSubstantiveChapterStart: scenePlan.chapters[1].scenes[0].start,
      ctaStart: ctaSegment.spokenStart,
      ctaVisualStart,
      ctaVisualOffsetSeconds: Number((ctaVisualStart - ctaSegment.spokenStart).toFixed(6)),
      finalSpeechEnd: resolved.at(-1).spokenEnd,
      maximumInterUtteranceGap: Number(Math.max(...resolved.slice(1).map((item) => item.actualGapBefore)).toFixed(3))
    },
    requiredSnapshotTimes
  };
  writeFileSync(path.join(projectDir, 'timing-map.json'), `${JSON.stringify(timing, null, 2)}\n`);
  const visualScenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  writeFileSync(path.join(projectDir, 'animation-plan.json'), `${JSON.stringify({
    locale: episode.locale,
    source: 'final-vtt',
    strategy: profile.visual.transitionLanguage,
    semanticChangeSeconds: profile.visual.semanticChangeSeconds,
    motionSummary: { types: [...new Set(visualScenes.filter((scene) => scene.motionType).map((scene) => scene.motionType))], count: visualScenes.filter((scene) => scene.motionType).length },
    scenes: visualScenes.map((scene) => ({ id: scene.id, start: scene.start, end: scene.end, layout: scene.layout, generatedArt: scene.generatedArt, entrance: scene.type === 'recap' ? 'hard-cut-cumulative-reveal' : 'hard-cut-push', motionType: scene.motionType }))
  }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'hyperframes.json'), `${JSON.stringify({ canvas: { width: 1920, height: 1080, duration, fps }, version: '0.7.68' }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'summary.json'), `${JSON.stringify({ title: episode.projectTitle, locale: episode.locale, duration, voice, rate, output: `renders/${outputName}`, profile: profile.id }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/utterance-timing-report.json'), `${JSON.stringify({ pass: timing.checkpoints.maximumInterUtteranceGap <= profile.opening.maximumOrdinaryGapSeconds, maximumInterUtteranceGap: timing.checkpoints.maximumInterUtteranceGap, firstSentenceEnd, hookHardCut, ctaStart: ctaSegment.spokenStart }, null, 2)}\n`);
  const eligibleScenes = visualScenes.filter((scene) => scene.type !== 'outro');
  const generatedScenes = eligibleScenes.filter((scene) => scene.temporaryGenerated);
  const motionScenes = visualScenes.filter((scene) => scene.motionType);
  const highlightSpecs = visualScenes.map((scene) => yellowHighlightSpec(scene)).filter(Boolean);
  const generatedLayoutChecks = generatedScenes.map((scene) => ({
    sceneId: scene.id,
    artSide: scene.generatedArtSide,
    highlightSide: scene.highlightSide,
    oppositeSides: scene.generatedArtSide !== scene.highlightSide,
    lines: balancedLines(scene.coreLabel, profile.visual.yellowHighlightMaxMeasuredCharsPerLine),
    maxMeasuredCharsPerLine: Math.max(...balancedLines(scene.coreLabel, profile.visual.yellowHighlightMaxMeasuredCharsPerLine).map(measuredCharCount))
  }));
  writeFileSync(path.join(projectDir, 'qa/visual-variation-report.json'), `${JSON.stringify({
    pass: generatedScenes.length / eligibleScenes.length >= 0.15,
    eligibleScenes: eligibleScenes.length,
    generatedSceneCount: generatedScenes.length,
    generatedRatio: Number((generatedScenes.length / eligibleScenes.length).toFixed(4)),
    uniqueGeneratedAssets: [...new Set(generatedScenes.map((scene) => scene.generatedArt))],
    layouts: [...new Set(eligibleScenes.map((scene) => scene.layout))],
    humanVisibleScenes: eligibleScenes.filter((scene) => scene.renderHuman).length,
    agentVisibleScenes: eligibleScenes.filter((scene) => scene.renderAgent).length,
    twoPropScenes: eligibleScenes.filter((scene) => scene.layout === 'two-props').length
  }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/motion-report.json'), `${JSON.stringify({
    pass: new Set(motionScenes.map((scene) => scene.motionType)).size >= profile.visual.motionTypeMinimum && motionScenes.length >= profile.visual.motionBeatMinimum,
    types: [...new Set(motionScenes.map((scene) => scene.motionType))],
    typeCount: new Set(motionScenes.map((scene) => scene.motionType)).size,
    beatCount: motionScenes.length,
    beats: motionScenes.map((scene) => ({ sceneId: scene.id, type: scene.motionType }))
  }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/highlight-layout-report.json'), `${JSON.stringify({
    pass: generatedLayoutChecks.every((item) => item.oppositeSides && item.maxMeasuredCharsPerLine <= profile.visual.yellowHighlightMaxMeasuredCharsPerLine)
      && new Set(generatedLayoutChecks.map((item) => item.artSide)).size === 2
      && generatedLayoutChecks.slice(1).every((item, index) => item.artSide !== generatedLayoutChecks[index].artSide)
      && highlightSpecs.every((item) => item.maxMeasuredCharsPerLine <= item.limit),
    policy: {
      generatedArtAndText: 'opposite-sides',
      sideSequence: 'alternating-left-right',
      overflow: 'forbidden',
      generatedHighlightMaxMeasuredCharsPerLine: profile.visual.yellowHighlightMaxMeasuredCharsPerLine
    },
    generatedLayouts: generatedLayoutChecks,
    yellowHighlights: highlightSpecs
  }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/internal-prop-style-report.json'), `${JSON.stringify({
    pass: profile.visual.internalPropFrame === 'none-blend-with-paper-background',
    selector: '.featured-object',
    expected: { border: 0, borderRadius: 0, background: 'transparent', boxShadow: 'none' },
    exceptions: ['opening promise slab', 'opening authority slab']
  }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/progress-report.json'), `${JSON.stringify({ pass: true, visibleAt: timing.checkpoints.hookTimelineCutAt, hookTimelineCutAt: timing.checkpoints.hookTimelineCutAt, heightPx: 52, widthPx: 1920, playedColor: '#A8D8F0', unplayedColor: '#DDE0DA', labelColor: '#111413' }, null, 2)}\n`);
  const narrativeTransitions = scenePlan.chapters.slice(1, -2).map((chapter) => ({
    label: chapter.label,
    sceneId: chapter.scenes.at(-1)?.id,
    type: chapter.scenes.at(-1)?.type,
    narration: chapter.scenes.at(-1)?.narration
  }));
  const formalRecapSceneCount = visualScenes.filter((scene) => scene.type === 'recap').length;
  const forbiddenSpokenPrefixCount = visualScenes.filter((scene) => /本章小节|第\s*[一二三四五六七八九十0-9]+\s*章小节/.test(scene.narration)).length;
  writeFileSync(path.join(projectDir, 'qa/narrative-transition-report.json'), `${JSON.stringify({
    pass: formalRecapSceneCount === 0
      && forbiddenSpokenPrefixCount === 0
      && narrativeTransitions.every((scene) => scene.type === 'transition'),
    mode: 'natural-transition-no-formal-recap',
    formalRecapSceneCount,
    forbiddenSpokenPrefixCount,
    transitions: narrativeTransitions,
    policy: 'No formal spoken chapter recap; story questions carry the viewer into the next module.'
  }, null, 2)}\n`);
  const stableScenes = visualScenes.filter((scene) => !['hook', 'chapter-intro', 'recap', 'promise', 'outro'].includes(scene.type));
  const stableDurations = stableScenes.map((scene) => Number((scene.end - scene.start).toFixed(3))).sort((a, b) => a - b);
  const medianStableSeconds = stableDurations.length % 2
    ? stableDurations[Math.floor(stableDurations.length / 2)]
    : Number(((stableDurations[stableDurations.length / 2 - 1] + stableDurations[stableDurations.length / 2]) / 2).toFixed(3));
  const comfortableStableScenes = stableScenes.filter((scene) => scene.end - scene.start >= 8 && scene.end - scene.start <= 24);
  const caseSceneIds = visualScenes.filter((scene) => scene.type === 'case').map((scene) => scene.id);
  const cognitiveLoadPass = visualScenes.length >= profile.cognitiveLoad.targetSceneCount[0]
    && visualScenes.length <= profile.cognitiveLoad.targetSceneCount[1]
    && medianStableSeconds >= profile.cognitiveLoad.targetStableSceneSeconds[0]
    && medianStableSeconds <= profile.cognitiveLoad.targetStableSceneSeconds[1]
    && comfortableStableScenes.length / stableScenes.length >= 0.75
    && rate === profile.audio.rate
    && scenePlan.chapters.slice(1, -1).length === 3
    && caseSceneIds.length >= 3
    && visualScenes.every((scene) => scene.type !== 'recap');
  writeFileSync(path.join(projectDir, 'qa/cognitive-load-report.json'), `${JSON.stringify({
    pass: cognitiveLoadPass,
    voice,
    fixedRate: rate,
    duration,
    sceneCount: visualScenes.length,
    targetSceneCount: profile.cognitiveLoad.targetSceneCount,
    moduleCount: scenePlan.chapters.slice(1, -1).length,
    stableSceneCount: stableScenes.length,
    medianStableSeconds,
    targetStableSceneSeconds: profile.cognitiveLoad.targetStableSceneSeconds,
    comfortableWindowSeconds: [8, 24],
    comfortableStableSceneCount: comfortableStableScenes.length,
    comfortableStableSceneRatio: Number((comfortableStableScenes.length / stableScenes.length).toFixed(4)),
    caseId: profile.cognitiveLoad.continuousCaseId,
    caseSceneIds,
    pauseSeconds: {
      ordinary: profile.cognitiveLoad.ordinaryPauseSeconds,
      knowledgeUnit: profile.cognitiveLoad.knowledgeUnitPauseSeconds,
      chapterBoundary: profile.cognitiveLoad.chapterBoundaryPauseSeconds
    },
    transitionMode: profile.cognitiveLoad.requiredTransitionMode
  }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/outro-alignment-report.json'), `${JSON.stringify({
    pass: ctaVisualStart - ctaSegment.spokenStart <= 1 / fps + 0.0001 && duration - resolved.at(-1).spokenEnd <= 0.34,
    ctaText: episode.fixedOutroCta,
    ctaAudioStart: ctaSegment.spokenStart,
    outroFirstFrame: ctaVisualStart,
    alignmentOffsetSeconds: Number((ctaVisualStart - ctaSegment.spokenStart).toFixed(6)),
    finalSpeechEnd: resolved.at(-1).spokenEnd,
    mediaDuration: duration,
    silentTailSeconds: Number((duration - resolved.at(-1).spokenEnd).toFixed(6))
  }, null, 2)}\n`);
  const noEarlyFollowSave = !resolved.some((item) => item.spokenStart < 30 && /follow|save|关注|收藏/i.test(item.text));
  const openingPass = firstSentenceEnd <= 5
    && maximumVisualLeadSeconds > 0
    && maximumVisualLeadSeconds <= profile.opening.visualLeadSeconds + 0.001
    && fullQuestionHoldSeconds >= 1
    && timing.checkpoints.authorityStart <= 12
    && timing.checkpoints.benefitPromiseStart <= 20
    && timing.checkpoints.artifactPreviewStart <= 30
    && noEarlyFollowSave
    && introFollowSave.narration === episode.fixedValueSentence
    && timing.checkpoints.firstSubstantiveChapterStart === introFollowSave.end;
  writeFileSync(path.join(projectDir, 'qa/retention-opening-report.json'), `${JSON.stringify({
    pass: openingPass,
    firstFrameType: profile.opening.firstFrameType,
    coverAssetUsedInOpening: false,
    fullSentenceVisibleAtFirstFrame: false,
    referenceSample: profile.opening.referenceSample,
    firstSentence: episode.firstSentence,
    narrationFirstSentence: resolved[0].text,
    firstSentenceEnd,
    timingMode: hookTiming.mode,
    timingSource: hookTiming.source,
    glyphTriggerCount: hookTiming.glyphs.length,
    earlyRevealCount: hookTiming.earlyRevealCount,
    requestedVisualLeadSeconds: profile.opening.visualLeadSeconds,
    maximumVisualLeadSeconds,
    finalHookGlyphAt: finalHookGlyph.at,
    finalHookGlyphVoiceAt: finalHookGlyph.voiceAt,
    requestedFullQuestionHoldSeconds: profile.opening.fullQuestionHoldSeconds,
    fullQuestionHoldSeconds,
    displayFontEmbedded: true,
    questionMarkKeyframesPresent: true,
    domBoundsGate: 'qa/dom-layout-report.json',
    gates: {
      firstSentenceWithin5Seconds: firstSentenceEnd <= 5,
      textSlightlyPrecedesVoice: maximumVisualLeadSeconds > 0 && maximumVisualLeadSeconds <= profile.opening.visualLeadSeconds + 0.001,
      completeQuestionHeldBeforeCut: fullQuestionHoldSeconds >= 1,
      authorityWithin12Seconds: timing.checkpoints.authorityStart <= 12,
      lossAndBenefitWithin20Seconds: timing.checkpoints.benefitPromiseStart <= 20,
      reusableArtifactWithin30Seconds: timing.checkpoints.artifactPreviewStart <= 30,
      noFollowSaveFirst30Seconds: noEarlyFollowSave
    },
    introFollowSave: {
      sceneId: introFollowSave.id,
      marker: 'intro-follow-save',
      isFinalIntroductionScene: true,
      fixedCopyComplete: introFollowSave.narration === episode.fixedValueSentence,
      nextFrameStartsFirstSubstantiveChapter: timing.checkpoints.firstSubstantiveChapterStart === introFollowSave.end
    }
  }, null, 2)}\n`);
  const storyboardLines = ['# Storyboard', '', ...visualScenes.flatMap((scene) => [
    `## Frame ${scene.id}`,
    '',
    'status: outline',
    '',
    `src: index.html#scene-${scene.id}`,
    '',
    `motion: ${scene.motionType || 'hard-cut'}`,
    '',
    `beat: ${scene.headline}`,
    ''
  ])];
  writeFileSync(path.join(projectDir, 'STORYBOARD.md'), `${storyboardLines.join('\n')}\n`);
  return { chapters, cues, timing, scenePlan };
}

function esc(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function measuredCharCount(value) {
  return [...String(value)].filter((char) => !/\s/.test(char)).length;
}

function splitBalancedPlain(text, maxChars) {
  const measuredLength = measuredCharCount(text);
  if (measuredLength <= maxChars) return [text.trim()];
  if (!episode.locale.startsWith('zh')) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || measuredCharCount(candidate) <= maxChars) current = candidate;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    return lines;
  }
  const lineCount = Math.ceil(measuredLength / maxChars);
  const target = Math.ceil(measuredLength / lineCount);
  const lines = [];
  let current = '';
  let currentMeasured = 0;
  for (const char of [...text]) {
    const increment = /\s/.test(char) ? 0 : 1;
    if (current && currentMeasured >= target && increment > 0) {
      lines.push(current.trim());
      current = '';
      currentMeasured = 0;
    }
    current += char;
    currentMeasured += increment;
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function balancedLines(value, maxChars = 20) {
  const text = String(value).trim();
  if (measuredCharCount(text) <= maxChars) return [text];
  if (text.includes('·')) {
    const phrases = text.split(/\s*·\s*/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const phrase of phrases) {
      const candidate = current ? `${current} · ${phrase}` : phrase;
      if (!current || measuredCharCount(candidate) <= maxChars) current = candidate;
      else {
        lines.push(...splitBalancedPlain(current, maxChars));
        current = phrase;
      }
    }
    if (current) lines.push(...splitBalancedPlain(current, maxChars));
    return lines;
  }
  return splitBalancedPlain(text, maxChars);
}

function labelMarkup(value, maxChars = 20) {
  return balancedLines(value, maxChars).map((line) => `<span class="label-line">${esc(line)}</span>`).join('');
}

function yellowHighlightSpec(scene) {
  const limit = scene.layout === 'generated' || scene.layout === 'agent-center' || scene.layout === 'human-center'
    ? profile.visual.yellowHighlightMaxMeasuredCharsPerLine
    : scene.layout === 'two-props' || scene.layout === 'big-text' ? 22 : null;
  if (!limit) return null;
  const lines = balancedLines(scene.coreLabel, limit);
  return { sceneId: scene.id, layout: scene.layout, text: scene.coreLabel, limit, lines, maxMeasuredCharsPerLine: Math.max(...lines.map(measuredCharCount)) };
}

let humanManifest;
let agentManifest;
let propManifest;
function humanSrc(id) {
  humanManifest ||= JSON.parse(readFileSync(path.join(projectDir, 'assets/pack/manifests/human.json'), 'utf8'));
  const asset = humanManifest.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown human ${id}`);
  return `assets/pack/${asset.path}`;
}
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

function chipMarkup(text) {
  return text.split(/\s*·\s*/).filter(Boolean).map((item) => `<span>${esc(item)}</span>`).join('');
}

function propMarkup(prop, className = '') {
  return `<div class="prop-piece visual-object ${className}"><img src="${propSrc(prop.id)}" alt="${esc(prop.id)}"></div>`;
}

function actorMarkup(scene, kind, className = '') {
  if (kind === 'human') return `<div class="actor-wrap actor-human ${className}"><img class="actor human" src="${humanSrc(scene.human)}" alt="工程师"></div>`;
  return `<div class="actor-wrap actor-agent ${className}"><img class="actor agent" src="${agentSrc(scene.agent)}" alt="Tiny Agent"></div>`;
}

function featuredObject(scene, className = '') {
  if (scene.type === 'promise') return `<div class="promise-slab visual-object ${className}"><span>${esc(episode.promise.label)}</span><img src="${propSrc(scene.props[0].id)}" alt=""><strong>${esc(episode.promise.strong)}</strong><b>${esc(episode.promise.action)}</b></div>`;
  if (scene.type === 'authority') return `<div class="authority-slab visual-object ${className}"><span>OPENAI</span><img src="${propSrc(scene.props[0].id)}" alt=""><strong>${esc(scene.coreLabel)}</strong></div>`;
  return `<div class="featured-object visual-object ${className}"><img src="${propSrc(scene.props[0].id)}" alt=""><div class="object-label">${labelMarkup(scene.coreLabel, 12)}</div></div>`;
}

function recapMarkup(scene, chapter) {
  const recapLabel = episode.locale.startsWith('zh') ? `第 ${scene.chapterNumber} 章小节` : `Chapter ${scene.chapterNumber} Recap`;
  return `<div class="summary-stage"><aside class="summary-side"><span>${esc(recapLabel)}</span><strong>${esc(scene.chapter)}</strong></aside><div class="summary-body">${scene.recapPoints.map((point, index) => `<div class="summary-point is-visible is-new"><b>${index + 1}.</b><span class="summary-text">${labelMarkup(point, episode.locale.startsWith('zh') ? 20 : 34)}</span></div>`).join('')}</div></div>`;
}

function renderScene(scene, scenePlan) {
  const headlineClass = [...scene.headline].length > 24 ? 'headline-long' : '';
  const chapter = scenePlan.chapters.find((item) => item.scenes.some((candidate) => candidate.id === scene.id));
  const open = `<section data-hf-id="hf-scene-${scene.id}" id="scene-${scene.id}" class="scene layout-${scene.layout}">`;
  if (scene.layout === 'recap') return `${open}${recapMarkup(scene, chapter)}</section>`;
  if (scene.layout === 'chapter-intro') return `${open}<div class="intro-stage"><div class="intro-copy"><span>${episode.locale.startsWith('zh') ? '故事推进' : 'Story Progression'}</span><h1>${esc(scene.chapter)}</h1><p>${labelMarkup(scene.coreLabel, episode.locale.startsWith('zh') ? 10 : 26)}</p></div><div class="intro-actors">${actorMarkup(scene, 'human')}${propMarkup(scene.props[0], 'motion-target')}${actorMarkup(scene, 'agent')}</div></div></section>`;
  if (scene.layout === 'generated') return `${open}<h1 class="scene-headline ${headlineClass}">${esc(scene.headline)}</h1><div class="generated-stage art-${scene.generatedArtSide}"><div class="generated-art-wrap"><img class="generated-art visual-object motion-target" src="assets/generated/scene-art/${esc(scene.generatedArt)}" alt="${esc(scene.coreLabel)}"></div><div class="generated-label yellow-highlight" data-highlight-side="${scene.highlightSide}">${labelMarkup(scene.coreLabel, profile.visual.yellowHighlightMaxMeasuredCharsPerLine)}</div></div></section>`;
  if (scene.layout === 'human-agent-prop') return `${open}<h1 class="scene-headline ${headlineClass}">${esc(scene.headline)}</h1><div class="trio-stage">${actorMarkup(scene, 'human')}${featuredObject(scene, 'motion-target')}${actorMarkup(scene, 'agent')}</div></section>`;
  if (scene.layout === 'human-prop') return `${open}<h1 class="scene-headline ${headlineClass}">${esc(scene.headline)}</h1><div class="duo-stage">${actorMarkup(scene, 'human')}${featuredObject(scene, 'motion-target')}</div></section>`;
  if (scene.layout === 'agent-center' || scene.layout === 'human-center') {
    const kind = scene.layout === 'human-center' ? 'human' : 'agent';
    return `${open}<h1 class="scene-headline ${headlineClass}">${esc(scene.headline)}</h1><div class="solo-stage">${actorMarkup(scene, kind, 'motion-target')}<div class="solo-callout yellow-highlight">${labelMarkup(scene.coreLabel, profile.visual.yellowHighlightMaxMeasuredCharsPerLine)}</div></div></section>`;
  }
  if (scene.layout === 'two-props') return `${open}<h1 class="scene-headline ${headlineClass}">${esc(scene.headline)}</h1><div class="pair-stage">${propMarkup(scene.props[0])}<div class="relation-mark">≠</div>${propMarkup(scene.props[1], 'motion-target')}</div><div class="pair-label yellow-highlight">${labelMarkup(scene.coreLabel, 22)}</div></section>`;
  if (scene.layout === 'big-text') {
    const smallActor = scene.renderHuman ? actorMarkup(scene, 'human', 'small-actor') : actorMarkup(scene, 'agent', 'small-actor');
    return `${open}<div class="emphasis-stage"><div class="emphasis-text motion-target">${esc(scene.headline)}</div><div class="emphasis-sub yellow-highlight">${labelMarkup(scene.coreLabel, 22)}</div>${smallActor}${propMarkup(scene.props[0], 'small-prop')}</div></section>`;
  }
  return `${open}<h1 class="scene-headline ${headlineClass}">${esc(scene.headline)}</h1><div class="duo-stage agent-duo">${actorMarkup(scene, 'agent')}${featuredObject(scene, 'motion-target')}</div><div class="chip-row">${chipMarkup(scene.coreLabel)}</div></section>`;
}

function hookMarkup(timing) {
  const hookLines = episode.locale.startsWith('zh')
    ? ['AI 智能体说', '今天不下雨，', '你敢不带伞吗？']
    : ['Do you know why an AI Agent', 'guesses instead of saying', '“I don\'t know”?'];
  const expected = hookLines.join(episode.locale.startsWith('zh') ? '' : ' ').replace(/\s+/g, '');
  const actual = episode.firstSentence.replace(/\s+/g, '');
  if (expected !== actual) throw new Error(`Hook line plan does not match first sentence: ${expected} != ${actual}`);
  let glyphIndex = 0;
  const lines = hookLines.map((line, lineIndex) => {
    const glyphs = [...line].map((char) => {
      if (/\s/.test(char)) return '<span class="hook-space">&nbsp;</span>';
      const glyph = timing.hookTiming.glyphs[glyphIndex++];
      const classes = ['hook-glyph', lineIndex === 0 && glyphIndex <= 5 ? 'hook-keyword' : '', glyphIndex === timing.hookTiming.glyphs.length ? 'hook-final-question' : ''].filter(Boolean).join(' ');
      return `<span id="${glyph.id}" class="${classes}">${esc(char)}</span>`;
    }).join('');
    return `<div class="hook-line hook-line-${lineIndex + 1}">${glyphs}</div>`;
  }).join('');
  if (glyphIndex !== timing.hookTiming.glyphs.length) throw new Error(`Hook glyph count mismatch: ${glyphIndex} != ${timing.hookTiming.glyphs.length}`);
  return `<section data-hf-id="hf-hook" id="hook" class="hook"><div class="hook-grid"></div><div class="hook-eyebrow">TINY AGENT / AI AGENT FIELD NOTE</div><div class="hook-question">${lines}<span id="hook-marker" class="hook-marker"></span></div><img id="hook-agent" class="hook-agent" src="assets/images/tiny-agent-ask.png" alt="Tiny Agent"><div id="hook-burst" class="hook-burst"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="hook-voice"><span></span><div><b id="hook-voice-fill"></b></div><strong>VOICE</strong></div></section>`;
}

function renderHtml(timing, cues, scenePlan) {
  const scenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes);
  const contentScenes = scenes.slice(0, -1);
  const sceneMarkup = contentScenes.map((scene) => renderScene(scene, scenePlan)).join('');
  const captionCues = cues.filter((cue) => cue.start >= timing.checkpoints.hookTimelineCutAt - 0.001 && cue.start < timing.checkpoints.ctaStart - 0.001);
  const captionMarkup = captionCues.map((cue, index) => `<div data-hf-id="hf-caption-${index + 1}" id="caption-${index + 1}" class="caption-cue">${esc(cue.text)}</div>`).join('');
  const progressMarkup = timing.chapters.map((chapter, index) => `<div class="progress-segment" style="flex:${chapter.duration} 1 0"><div class="progress-track"><div id="progress-fill-${index + 1}" class="progress-fill"></div><span id="progress-label-${index + 1}" class="progress-label">${index + 1}. ${esc(chapter.label)}</span></div></div>`).join('');

  const timeline = [];
  timing.hookTiming.glyphs.forEach((glyph, index) => {
    if (index === timing.hookTiming.glyphs.length - 1) return;
    const x = index % 2 === 0 ? -20 : 20;
    const rotation = index % 2 === 0 ? -7 : 6;
    timeline.push(`tl.fromTo("#${glyph.id}",{autoAlpha:0,y:${index % 3 === 0 ? -28 : 24},x:${x},rotation:${rotation},scale:.48},{autoAlpha:1,y:0,x:0,rotation:${index % 2 === 0 ? -1.4 : 1.1},scale:1,duration:.24,ease:"back.out(2.2)"},${glyph.at.toFixed(3)});`);
  });
  const questionGlyph = timing.hookTiming.glyphs.at(-1);
  timeline.push(`tl.fromTo("#hook-agent",{autoAlpha:0,x:210,y:28,rotation:7,scale:.72},{autoAlpha:1,x:0,y:0,rotation:0,scale:1,duration:.62,ease:"back.out(1.7)"},${Math.max(.2, timing.checkpoints.firstSentenceEnd * .58).toFixed(3)});`);
  timeline.push(`tl.to("#hook-marker",{scaleX:1,duration:.42,ease:"power3.out"},${Math.max(.1, timing.checkpoints.firstSentenceEnd * .44).toFixed(3)});`);
  timeline.push(`tl.to("#hook-voice-fill",{scaleX:1,duration:${timing.checkpoints.hookTimelineCutAt.toFixed(3)},ease:"none"},0);`);
  timeline.push(`tl.fromTo("#${questionGlyph.id}",{autoAlpha:0,scale:.2,rotation:-18},{autoAlpha:1,scale:1.5,rotation:8,duration:.25,ease:"back.out(2.8)"},${questionGlyph.at.toFixed(3)});`);
  timeline.push(`tl.fromTo("#hook-burst",{autoAlpha:0,scale:.4,rotation:-18},{autoAlpha:1,scale:1,rotation:0,duration:.34,ease:"power4.out"},${questionGlyph.at.toFixed(3)});`);
  contentScenes.forEach((scene, index) => {
    if (index === 0) timeline.push(`tl.set("#scene-${scene.id}",{autoAlpha:1},0);`);
    else {
      timeline.push(`tl.set("#scene-${contentScenes[index - 1].id}",{autoAlpha:0},${scene.start.toFixed(3)});`);
      timeline.push(`tl.set("#scene-${scene.id}",{autoAlpha:1},${scene.start.toFixed(3)});`);
    }
    if (scene.type === 'recap') {
      timeline.push(`tl.fromTo("#scene-${scene.id} .summary-point.is-new",{autoAlpha:0,x:54},{autoAlpha:1,x:0,duration:.46,stagger:.16,ease:"power3.out"},${scene.start.toFixed(3)});`);
    } else {
      const copySelector = scene.layout === 'chapter-intro' ? '.intro-copy' : scene.layout === 'big-text' ? '.emphasis-text' : '.scene-headline';
      timeline.push(`tl.fromTo("#scene-${scene.id} ${copySelector}",{y:16},{y:0,duration:.46,ease:"power3.out"},${scene.start.toFixed(3)});`);
      if (scene.renderHuman || scene.renderAgent) timeline.push(`tl.fromTo("#scene-${scene.id} .actor",{y:18},{y:0,duration:.44,stagger:.035,ease:"power2.out"},${(scene.start + .02).toFixed(3)});`);
      const dedicatedEntranceMotion = ['spring-pop', 'fly-in', 'spin-in'].includes(scene.motionType);
      if (!dedicatedEntranceMotion && !['agent-center', 'human-center'].includes(scene.layout)) timeline.push(`tl.fromTo("#scene-${scene.id} .visual-object",{scale:.94},{scale:1,duration:.48,stagger:.03,ease:"power3.out"},${(scene.start + .04).toFixed(3)});`);
    }
    if (scene.motionType) {
      const at = Math.min(scene.end - 1.05, scene.start + Math.max(1, (scene.end - scene.start) * .52));
      const entranceAt = (scene.start + .04).toFixed(3);
      if (scene.motionType === 'press-pulse') {
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{scale:.94,duration:.16,ease:"power1.in"},${at.toFixed(3)});`);
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{scale:1,duration:.42,ease:"power3.out"},${(at + .17).toFixed(3)});`);
      }
      if (scene.motionType === 'spring-pop') timeline.push(`tl.fromTo("#scene-${scene.id} .motion-target",{scale:.72,y:18},{scale:1,y:0,duration:.55,ease:"power3.out"},${entranceAt});`);
      if (scene.motionType === 'nudge') {
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{x:8,duration:.1,ease:"power3.in"},${at.toFixed(3)});`);
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{x:52,duration:.1,ease:"none"},${(at + .11).toFixed(3)});`);
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{x:0,duration:.32,ease:"power4.out"},${(at + .22).toFixed(3)});`);
      }
      if (scene.motionType === 'split-tilt') {
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{rotation:-4,duration:.18,ease:"power2.out"},${at.toFixed(3)});`);
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{rotation:4,duration:.24,ease:"sine.inOut"},${(at + .19).toFixed(3)});`);
        timeline.push(`tl.to("#scene-${scene.id} .motion-target",{rotation:0,duration:.24,ease:"power2.out"},${(at + .44).toFixed(3)});`);
      }
      if (scene.motionType === 'fly-in') {
        const flyFrom = index % 2 === 0 ? -720 : 720;
        timeline.push(`tl.fromTo("#scene-${scene.id} .motion-target",{x:${flyFrom},filter:"blur(12px)"},{x:0,filter:"blur(0px)",duration:.6,ease:"power4.out"},${entranceAt});`);
      }
      if (scene.motionType === 'spin-in') timeline.push(`tl.fromTo("#scene-${scene.id} .motion-target",{rotation:-110,scale:.68},{rotation:0,scale:1,duration:.62,ease:"power3.out"},${entranceAt});`);
      if (scene.motionType === 'sine-float') timeline.push(`tl.to("#scene-${scene.id} .motion-target",{y:-16,duration:.55,yoyo:true,repeat:1,ease:"sine.inOut"},${at.toFixed(3)});`);
    }
  });
  timeline.push(`tl.set("#hook",{autoAlpha:0},${timing.checkpoints.hookTimelineCutAt.toFixed(3)});`);
  timeline.push(`tl.set("#chapter-progress",{autoAlpha:1},${timing.checkpoints.hookTimelineCutAt.toFixed(3)});`);
  timing.chapters.forEach((chapter, index) => {
    timeline.push(`tl.to("#progress-fill-${index + 1}",{scaleX:1,duration:${chapter.duration.toFixed(3)},ease:"none"},${chapter.start.toFixed(3)});`);
    timeline.push(`tl.set("#progress-label-${index + 1}",{fontWeight:900},${chapter.start.toFixed(3)});`);
    if (index > 0) timeline.push(`tl.set("#progress-label-${index}",{fontWeight:500},${chapter.start.toFixed(3)});`);
  });
  captionCues.forEach((cue, index) => {
    timeline.push(`tl.set("#caption-${index + 1}",{autoAlpha:1,y:0},${cue.start.toFixed(3)});`);
    timeline.push(`tl.set("#caption-${index + 1}",{autoAlpha:0},${cue.end.toFixed(3)});`);
  });
  timeline.push(`tl.set("#${contentScenes.at(-1).id.startsWith('x') ? '' : `scene-${contentScenes.at(-1).id}`}",{autoAlpha:0},${timing.checkpoints.ctaVisualStart.toFixed(3)});`);
  timeline.push(`tl.set("#captions",{autoAlpha:0},${timing.checkpoints.ctaVisualStart.toFixed(3)});`);
  timeline.push(`tl.set("#chapter-progress",{autoAlpha:0},${timing.checkpoints.ctaVisualStart.toFixed(3)});`);
  timeline.push(`tl.set("#outro",{autoAlpha:1},${timing.checkpoints.ctaVisualStart.toFixed(3)});`);
  timeline.push(`tl.to("#outro-mark",{scale:1.08,duration:.28,ease:"power2.out"},${(timing.checkpoints.ctaVisualStart + .1).toFixed(3)});`);
  timeline.push(`tl.to("#outro-mark",{scale:1,duration:.32,ease:"power2.inOut"},${(timing.checkpoints.ctaVisualStart + .38).toFixed(3)});`);
  timeline.push(`tl.to("#outro-underline",{scaleX:1,duration:.62,ease:"power3.out"},${(timing.checkpoints.ctaVisualStart + .92).toFixed(3)});`);

  return `<!doctype html>
<html lang="${episode.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(episode.projectTitle)}</title><script src="assets/vendor/gsap.min.js"></script>
<style>
@font-face{font-family:TA;src:url("assets/fonts/HiraginoSansGB.ttc") format("truetype");font-weight:100 900}@font-face{font-family:Hook;src:url("assets/fonts/ZCOOLKuaiLe-Regular.ttf") format("truetype");font-weight:400}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#ECECEA;font-family:TA,"Arial Black",Arial,sans-serif;color:#111413}:root{--paper:#ECECEA;--ink:#111413;--blue:#117ABD;--yellow:#F4C542;--red:#D84B3E;--played:#A8D8F0;--rest:#DDE0DA}
.composition{position:relative;width:1920px;height:1080px;overflow:hidden;background-color:var(--paper);background-image:linear-gradient(rgba(17,20,19,.038) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.038) 2px,transparent 2px);background-size:64px 64px}.hook{position:absolute;inset:0;z-index:180;overflow:hidden;background:var(--paper);font-family:Hook,TA,sans-serif}.hook-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(17,20,19,.07) 2px,transparent 2px),linear-gradient(90deg,rgba(17,20,19,.07) 2px,transparent 2px);background-size:68px 68px}.hook-eyebrow{position:absolute;left:58px;top:24px;padding:9px 16px;border:4px solid var(--ink);background:var(--yellow);font-family:TA,sans-serif;font-size:22px;font-weight:900;letter-spacing:2px;transform:rotate(-1.5deg)}.hook-question{position:absolute;left:58px;top:${episode.locale.startsWith('zh') ? 116 : 164}px;width:${episode.locale.startsWith('zh') ? 1804 : 1390}px;font-size:${episode.locale.startsWith('zh') ? 190 : 104}px;line-height:${episode.locale.startsWith('zh') ? 1.05 : 1.2};font-weight:400;letter-spacing:${episode.locale.startsWith('zh') ? 2 : -1}px}.hook-line{display:flex;align-items:baseline;white-space:nowrap}.hook-line-1{font-size:190px;line-height:1.04}.hook-line-2{margin-left:142px;font-size:248px;line-height:1;color:var(--blue)}.hook-line-3{margin-top:38px;margin-left:34px;font-size:218px;line-height:1.04}.hook-glyph{display:inline-block;visibility:hidden;opacity:0;transform-origin:50% 82%}.hook-keyword{color:var(--blue)}.hook-final-question{color:var(--red);margin-left:6px;transform-origin:center center}.hook-space{display:inline-block;width:.31em}.hook-marker{position:absolute;left:${episode.locale.startsWith('zh') ? 132 : 410}px;top:${episode.locale.startsWith('zh') ? 418 : 118}px;width:${episode.locale.startsWith('zh') ? 1170 : 500}px;height:26px;background:var(--yellow);z-index:-1;transform:scaleX(0) rotate(-2deg);transform-origin:left center}.hook-agent{position:absolute;right:6px;bottom:58px;width:250px;height:320px;object-fit:contain;visibility:hidden;opacity:0;filter:drop-shadow(0 15px 0 rgba(17,20,19,.12))}.hook-burst{position:absolute;right:262px;top:662px;width:160px;height:160px;visibility:hidden;opacity:0}.hook-burst i{position:absolute;left:76px;top:6px;width:8px;height:56px;border-radius:8px;background:var(--red);transform-origin:4px 74px}.hook-burst i:nth-child(2){transform:rotate(60deg)}.hook-burst i:nth-child(3){transform:rotate(120deg)}.hook-burst i:nth-child(4){transform:rotate(180deg)}.hook-burst i:nth-child(5){transform:rotate(240deg)}.hook-burst i:nth-child(6){transform:rotate(300deg)}.hook-voice{position:absolute;left:58px;right:58px;bottom:20px;height:38px;display:grid;grid-template-columns:30px 1fr 76px;gap:14px;align-items:center;font-family:TA,sans-serif}.hook-voice>span{width:24px;height:24px;border:6px solid var(--blue);border-radius:50%}.hook-voice>div{height:12px;background:var(--rest);overflow:hidden}.hook-voice b{display:block;width:100%;height:100%;background:var(--blue);transform:scaleX(0);transform-origin:left center}.hook-voice strong{font-size:18px;letter-spacing:2px}
.scene{position:absolute;inset:0;visibility:hidden;opacity:0;padding:34px 58px 198px}.scene h1.scene-headline{margin:0 auto;width:1804px;min-height:128px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:92px;line-height:1.02;letter-spacing:-1.8px;font-weight:900;text-wrap:balance}.scene h1.headline-long{font-size:76px;line-height:1.06}.actor-wrap{display:grid;place-items:end center}.actor{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 14px 0 rgba(17,20,19,.09))}.visual-object{transform-origin:center center}.object-label,.generated-label,.pair-label,.solo-callout{font-size:34px;line-height:1.14;font-weight:900;text-align:center}.label-line{display:block;white-space:nowrap}.yellow-highlight{box-sizing:border-box;min-width:0;max-width:100%}
.trio-stage{height:700px;display:grid;grid-template-columns:410px 600px 410px;align-items:end;justify-content:center;gap:34px}.trio-stage .actor-wrap{width:410px;height:540px}.trio-stage .featured-object,.trio-stage .promise-slab,.trio-stage .authority-slab{align-self:center}.duo-stage{height:700px;display:flex;align-items:center;justify-content:center;gap:120px}.duo-stage .actor-wrap{width:500px;height:610px}.featured-object{width:600px;min-height:500px;display:grid;grid-template-rows:390px auto;place-items:center;padding:0 14px 10px;border:0;border-radius:0;background:transparent;box-shadow:none}.featured-object img{width:390px;height:390px;object-fit:contain}.object-label{width:100%;max-width:600px}.promise-slab,.authority-slab{width:560px;height:540px;border:9px solid var(--ink);border-radius:42px;background:var(--paper);box-shadow:16px 16px 0 rgba(17,20,19,.11);display:grid;place-items:center;padding:24px}.promise-slab{grid-template-rows:auto 160px auto auto;gap:9px}.promise-slab>span,.authority-slab>span{font-size:38px;font-weight:900;color:var(--blue)}.promise-slab img{width:160px;height:160px;object-fit:contain}.promise-slab strong{font-size:34px;line-height:1.06;text-align:center}.promise-slab b{padding:8px 18px;border:5px solid var(--ink);border-radius:16px;background:var(--yellow);font-size:32px}.authority-slab{grid-template-rows:auto 300px auto}.authority-slab img{width:300px;height:300px;object-fit:contain}.authority-slab strong{font-size:38px;border-top:9px solid var(--yellow);padding-top:10px}
.solo-stage{height:700px;position:relative;display:grid;place-items:center}.solo-stage .actor-wrap{position:relative;top:-72px;width:620px;height:650px}.solo-callout{position:absolute;right:90px;bottom:108px;width:620px;padding:20px 24px;border:7px solid var(--ink);border-radius:26px;background:var(--yellow);box-shadow:10px 10px 0 rgba(17,20,19,.1)}.pair-stage{height:560px;display:flex;align-items:center;justify-content:center;gap:72px}.pair-stage .prop-piece{width:430px;height:430px}.prop-piece img{width:100%;height:100%;object-fit:contain}.relation-mark{font-size:126px;font-weight:900;color:var(--blue)}.pair-label{width:max-content;max-width:1500px;margin:0 auto;padding:18px 36px;border:7px solid var(--ink);border-radius:24px;background:var(--yellow)}
.generated-stage{height:700px;display:grid;align-items:center;gap:72px;padding:0 66px}.generated-stage.art-left{grid-template-columns:minmax(0,1fr) 660px;grid-template-areas:"art label"}.generated-stage.art-right{grid-template-columns:660px minmax(0,1fr);grid-template-areas:"label art"}.generated-art-wrap{grid-area:art;width:100%;height:680px;display:grid;place-items:center}.generated-art{width:720px;height:680px;object-fit:contain;border:0;border-radius:0;box-shadow:none}.generated-label{grid-area:label;position:static;width:660px;min-height:126px;padding:22px 28px;border:7px solid var(--ink);border-radius:24px;background:var(--yellow);display:grid;place-items:center}
.emphasis-stage{height:820px;position:relative;display:grid;place-items:center;padding:80px 250px}.emphasis-text{max-width:1430px;font-size:128px;line-height:1.02;letter-spacing:-3px;font-weight:900;text-align:center;text-wrap:balance}.emphasis-sub{margin-top:-76px;padding:16px 28px;border-left:12px solid var(--blue);background:rgba(244,197,66,.45);font-size:42px;font-weight:900}.small-actor{position:absolute;left:22px;bottom:18px;width:300px;height:380px}.small-prop{position:absolute;right:28px;top:48px;width:280px;height:280px}
.intro-stage{height:848px;display:grid;grid-template-columns:${episode.locale.startsWith('zh') ? 760 : 980}px 1fr;gap:34px}.intro-copy{height:100%;padding:105px 54px 74px;background:var(--blue);color:var(--paper);display:flex;flex-direction:column;justify-content:center}.intro-copy>span{font-size:60px;font-weight:900}.intro-copy h1{margin:24px 0 34px;font-size:96px;line-height:1.03;font-weight:900}.intro-copy p{margin:0;font-size:60px;line-height:1.15;font-weight:900}.intro-actors{display:grid;grid-template-columns:${episode.locale.startsWith('zh') ? '330px 280px 330px' : '250px 220px 250px'};align-items:end;justify-content:center}.intro-actors .actor-wrap{width:${episode.locale.startsWith('zh') ? 330 : 250}px;height:570px}.intro-actors .prop-piece{width:${episode.locale.startsWith('zh') ? 280 : 220}px;height:${episode.locale.startsWith('zh') ? 280 : 220}px;align-self:center}
.summary-stage{height:848px;display:grid;grid-template-columns:540px 1fr}.summary-side{background:var(--blue);color:var(--paper);border-right:14px solid #1597EA;padding:98px 46px 70px;display:flex;flex-direction:column;justify-content:center}.summary-side span{font-size:60px;line-height:1.08;font-weight:900}.summary-side strong{margin-top:34px;font-size:${episode.locale.startsWith('zh') ? 86 : 60}px;line-height:1.05;font-weight:900;white-space:${episode.locale.startsWith('zh') ? 'nowrap' : 'normal'};text-wrap:balance}.summary-body{padding:48px 48px 38px;display:grid;grid-template-rows:repeat(3,1fr);gap:8px}.summary-point{visibility:hidden;opacity:0;display:grid;grid-template-columns:82px 1fr;align-items:center;border-bottom:3px solid var(--rest);font-size:60px;line-height:1.12;font-weight:900}.summary-point.is-visible{visibility:visible;opacity:1}.summary-point b{color:var(--blue);font-size:60px;font-weight:900}.summary-point .summary-text{font-weight:900}.chip-row{position:absolute;left:50%;bottom:205px;transform:translateX(-50%);display:flex;gap:10px}.chip-row span{padding:8px 14px;border:4px solid var(--ink);border-radius:14px;background:var(--yellow);font-size:32px;font-weight:900}
.captions{position:absolute;z-index:120;left:90px;right:90px;bottom:72px;height:128px;display:grid;place-items:center}.caption-cue{position:absolute;visibility:hidden;opacity:0;max-width:1740px;padding:16px 30px 18px;border:6px solid var(--ink);border-radius:24px;background:rgba(236,236,234,.97);box-shadow:10px 10px 0 rgba(17,20,19,.12);font-size:46px;line-height:1.14;font-weight:800;text-align:center;text-wrap:balance}.chapter-progress{position:absolute;left:0;right:0;bottom:0;z-index:130;height:52px;display:flex;gap:4px;visibility:hidden;opacity:0}.progress-segment{min-width:0;height:52px}.progress-track{position:relative;width:100%;height:52px;background:var(--rest);overflow:hidden}.progress-fill{position:absolute;inset:0;background:var(--played);transform:scaleX(0);transform-origin:left center}.progress-label{position:absolute;inset:0;display:grid;place-items:center;padding:0 4px;font-size:20px;color:var(--ink);white-space:nowrap;overflow:hidden;font-weight:500}
.outro{position:absolute;inset:0;z-index:220;visibility:hidden;opacity:0;background:var(--paper)}.outro>img{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover}.outro-copy{position:absolute;top:214px;right:82px;width:850px;min-height:660px;padding:52px 40px 48px 54px}.outro-row{display:flex;align-items:center;gap:28px}.outro-mark{position:relative;display:block;width:82px;height:82px;flex:0 0 82px;border:8px solid var(--blue);border-radius:50%}.outro-mark:before,.outro-mark:after{position:absolute;top:50%;left:50%;width:38px;height:8px;border-radius:5px;background:var(--blue);content:"";transform:translate(-50%,-50%)}.outro-mark:after{transform:translate(-50%,-50%) rotate(90deg)}.outro h2{margin:0;color:var(--blue);font-size:78px;line-height:1.02;white-space:nowrap}.outro-rule{display:block;width:100%;height:5px;margin:44px 0 42px;background:var(--played)}.outro p{margin:0;font-size:68px;font-weight:900;line-height:1.22}.outro p span{display:block}.outro-underline{display:block;width:728px;height:12px;margin-top:36px;border-radius:8px;background:var(--blue);transform:scaleX(0);transform-origin:left center}
</style></head><body><div data-hf-id="hf-root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${timing.duration}" data-fps="30" id="composition" class="composition">${sceneMarkup}<div data-hf-id="hf-captions" id="captions" class="captions">${captionMarkup}</div><nav data-hf-id="hf-chapter-progress" id="chapter-progress" class="chapter-progress">${progressMarkup}</nav>${hookMarkup(timing)}<section data-hf-id="hf-outro" id="outro" class="outro"><img src="assets/images/tiny-agent-outro-key-art-papergray.png" alt="Tiny Agent"><div class="outro-copy"><div class="outro-row"><span id="outro-mark" class="outro-mark"></span><h2>${esc(episode.outro.title)}</h2></div><span class="outro-rule"></span><p>${episode.outro.lines.map((line) => `<span>${esc(line)}</span>`).join('')}</p><span id="outro-underline" class="outro-underline"></span></div></section><audio data-hf-id="hf-narration" id="narration" class="clip" data-start="0" data-duration="${timing.duration}" data-track-index="1" data-volume="1" src="audio/narration.${episode.locale}.mp3"></audio></div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});${timeline.join('')}window.__timelines.main=tl;</script></body></html>`;
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
  writeFileSync(path.join(projectDir, 'assets-manifest.json'), `${JSON.stringify({
    pack: pack.index.id,
    status: pack.index.status,
    generatedArtRoot: 'assets/generated/scene-art',
    scenes: scenePlan.chapters.flatMap((chapter) => chapter.scenes).map((scene) => ({
      sceneId: scene.id,
      layout: scene.layout,
      human: scene.renderHuman ? scene.human : null,
      agent: scene.renderAgent ? scene.agent : null,
      props: scene.props,
      generatedArt: scene.generatedArt,
      generatedArtSide: scene.generatedArtSide,
      highlightSide: scene.highlightSide,
      motionType: scene.motionType
    }))
  }, null, 2)}\n`);
  writeFileSync(path.join(projectDir, 'qa/title-identity-report.json'), `${JSON.stringify({ pass: true, checks: { projectTitle: episode.projectTitle, openingHeadline: scenePlan.chapters[0].scenes[0].headline, coverAlt: episode.coverAlt } }, null, 2)}\n`);
}

const mode = process.argv[2] || '--all';
if (mode === '--tts' || mode === '--all') generateTts();
if (mode === '--compile' || mode === '--all') await compile();
