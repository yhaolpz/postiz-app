# Tiny Agent Edge TTS 声音目录

该目录归档 Tiny Agent 可选的中文和英文 `edge-tts` 声音，并提供使用同一文本、同一语速生成的试听音频。

## 目录内容

- `index.html`：可搜索、筛选和直接试听的声音选择页。
- `voices.json`：声音 ID、地区、性别、风格和音频路径。
- `selection.json`：当前默认声音与语速记录。
- `sample.zh-CN.txt`、`sample.en-US.txt`：中英文统一试听文本。
- `generate.mjs`：从当前 `edge-tts` 声音列表刷新目录并生成音频。
- `audio/`：归档试听 MP3 和对应 VTT。

## 本地查看

```bash
cd scripts/ai-video-pipeline/voice-catalogs/edge-tts
python3 -m http.server 3021 --bind 127.0.0.1
```

访问 `http://localhost:3021/`。

## 刷新目录

仅刷新声音元数据：

```bash
node scripts/ai-video-pipeline/voice-catalogs/edge-tts/generate.mjs
```

刷新元数据并补齐缺失试听音频：

```bash
node scripts/ai-video-pipeline/voice-catalogs/edge-tts/generate.mjs --audio
```

强制重新生成全部试听音频：

```bash
node scripts/ai-video-pipeline/voice-catalogs/edge-tts/generate.mjs --audio --refresh
```

## 切换声音

确认 Voice ID 后，更新 `selection.json` 记录，并在生产命令中传入同一个 ID：

```bash
node scripts/ai-video-pipeline/run.mjs --tts edge-tts --voice zh-CN-YunxiaNeural
```

自动任务可设置：

```bash
AI_VIDEO_TTS_PROVIDER=edge-tts
AI_VIDEO_TTS_VOICE=zh-CN-YunxiaNeural
```

单条视频保持一个主旁白声音。更换默认声音后，需要重新检查中文断句、英文术语发音和最终语速。

当前中文默认声音为 `zh-CN-YunxiaNeural`。Tiny Agent 英文 Shorts 和英文横屏长视频均使用 `en-US-AnaNeural`；其分类为 `Cartoon, Conversation`，音色标签为 `Cute`。具体语速由对应视频规则单独指定；当前 6:18 定时成片冻结基线固定为中文 `zh-CN-YunxiaNeural +35%`、英文 `en-US-AnaNeural +30%`。
