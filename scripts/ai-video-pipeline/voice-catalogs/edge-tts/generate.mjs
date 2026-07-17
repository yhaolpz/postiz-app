import { execFile } from 'node:child_process';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.join(root, 'audio');
const shouldGenerateAudio = process.argv.includes('--audio');
const refresh = process.argv.includes('--refresh');
const concurrency = Math.max(1, Number.parseInt(process.env.EDGE_TTS_CONCURRENCY || '3', 10));

const localeLabels = {
  'zh-CN': '大陆普通话',
  'zh-HK': '粤语（香港）',
  'zh-TW': '台湾普通话',
  'en-AU': '澳大利亚英语',
  'en-CA': '加拿大英语',
  'en-GB': '英式英语',
  'en-HK': '香港英语',
  'en-IE': '爱尔兰英语',
  'en-IN': '印度英语',
  'en-KE': '肯尼亚英语',
  'en-NG': '尼日利亚英语',
  'en-NZ': '新西兰英语',
  'en-PH': '菲律宾英语',
  'en-SG': '新加坡英语',
  'en-TZ': '坦桑尼亚英语',
  'en-US': '美式英语',
  'en-ZA': '南非英语',
};

const chineseNames = {
  'zh-CN-XiaoxiaoNeural': '晓晓',
  'zh-CN-XiaoyiNeural': '晓伊',
  'zh-CN-YunjianNeural': '云健',
  'zh-CN-YunxiNeural': '云希',
  'zh-CN-YunxiaNeural': '云夏',
  'zh-CN-YunyangNeural': '云扬',
  'zh-CN-liaoning-XiaobeiNeural': '晓北',
  'zh-CN-shaanxi-XiaoniNeural': '晓妮',
};

const termLabels = {
  General: '通用',
  News: '新闻',
  Novel: '叙事',
  Cartoon: '动画',
  Sports: '体育',
  Dialect: '方言',
  Conversation: '对话',
  Copilot: '助手',
  Friendly: '友好',
  Positive: '积极',
  Warm: '温暖',
  Lively: '活泼',
  Passion: '热情',
  Sunshine: '阳光',
  Cute: '可爱',
  Professional: '专业',
  Reliable: '可靠',
  Confident: '自信',
  Authentic: '自然',
  Honest: '坦率',
  Expressive: '有表现力',
  Caring: '亲切',
  Pleasant: '舒适',
  Approachable: '亲和',
  Casual: '随和',
  Sincere: '真诚',
  Authority: '权威',
  Cheerful: '明快',
  Clear: '清晰',
  Conversational: '对话感',
  Rational: '理性',
  Considerate: '体贴',
  Comfort: '舒缓',
  Humorous: '幽默',
  Bright: '明亮',
};

const splitTerms = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

const displayNameFor = (id, locale) => {
  if (chineseNames[id]) return chineseNames[id];

  const rawName = id
    .slice(locale.length + 1)
    .replace(/Neural$/, '')
    .replace(/Multilingual$/, ' (Multilingual)')
    .replace(/Expressive$/, ' (Expressive)')
    .replace(/([a-z])([A-Z])/g, '$1 $2');

  return rawName.replace(/^(liaoning|shaanxi)-/i, '');
};

const parseVoices = (output) => output
  .split('\n')
  .slice(2)
  .filter((line) => /^(zh-|en-)/.test(line))
  .map((line) => {
    const id = line.slice(0, 33).trim();
    const gender = line.slice(35, 43).trim();
    const categories = splitTerms(line.slice(45, 66).trim());
    const personalities = splitTerms(line.slice(68).trim());
    const locale = id.split('-').slice(0, 2).join('-');
    const language = id.startsWith('zh-') ? 'zh' : 'en';
    const terms = [...categories, ...personalities];

    return {
      id,
      displayName: displayNameFor(id, locale),
      language,
      locale,
      localeLabel: localeLabels[locale] || locale,
      gender,
      categories,
      personalities,
      styleZh: terms.map((term) => termLabels[term] || term).join(' · '),
      sampleLanguage: language === 'zh' ? 'zh-CN' : 'en-US',
      audio: `audio/${id}.mp3`,
      subtitle: `audio/${id}.vtt`,
    };
  })
  .sort((left, right) => {
    const languageOrder = (left.language === 'zh' ? 0 : 1) - (right.language === 'zh' ? 0 : 1);
    return languageOrder || left.locale.localeCompare(right.locale) || left.id.localeCompare(right.id);
  });

const fileIsUsable = async (file, minimumBytes) => {
  try {
    return (await stat(file)).size > minimumBytes;
  } catch {
    return false;
  }
};

const generateVoice = async (voice) => {
  const audioPath = path.join(root, voice.audio);
  const subtitlePath = path.join(root, voice.subtitle);
  if (!refresh && await fileIsUsable(audioPath, 1024) && await fileIsUsable(subtitlePath, 100)) return;

  const sampleFile = path.join(root, voice.language === 'zh' ? 'sample.zh-CN.txt' : 'sample.en-US.txt');
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await execFileAsync('uvx', [
        'edge-tts',
        '-f', sampleFile,
        '-v', voice.id,
        '--rate', '+0%',
        '--write-media', audioPath,
        '--write-subtitles', subtitlePath,
      ], { maxBuffer: 4 * 1024 * 1024 });
      process.stdout.write(`generated ${voice.id}\n`);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }

  throw new Error(`Failed to generate ${voice.id}: ${lastError?.message || 'unknown error'}`);
};

const runPool = async (items, workerCount, worker) => {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(workerCount, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
};

await access(path.join(root, 'selection.json'));
await mkdir(audioDir, { recursive: true });

const [{ stdout }, selectionText] = await Promise.all([
  execFileAsync('uvx', ['edge-tts', '--list-voices'], { maxBuffer: 4 * 1024 * 1024 }),
  readFile(path.join(root, 'selection.json'), 'utf8'),
]);

const voices = parseVoices(stdout);
const selection = JSON.parse(selectionText);
const catalog = {
  engine: 'edge-tts',
  sourceCommand: 'uvx edge-tts --list-voices',
  rate: selection.rate,
  currentVoice: selection.currentVoice,
  defaults: selection.defaults || [],
  counts: {
    total: voices.length,
    chinese: voices.filter((voice) => voice.language === 'zh').length,
    english: voices.filter((voice) => voice.language === 'en').length,
  },
  samples: {
    'zh-CN': await readFile(path.join(root, 'sample.zh-CN.txt'), 'utf8').then((value) => value.trim()),
    'en-US': await readFile(path.join(root, 'sample.en-US.txt'), 'utf8').then((value) => value.trim()),
  },
  voices,
};

await writeFile(path.join(root, 'voices.json'), `${JSON.stringify(catalog, null, 2)}\n`);

if (shouldGenerateAudio) {
  await runPool(voices, concurrency, generateVoice);
}

process.stdout.write(`catalog total=${catalog.counts.total} chinese=${catalog.counts.chinese} english=${catalog.counts.english}\n`);
