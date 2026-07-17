# Tiny Agent 横屏长视频样片

这是 16:9 的 YouTube 长视频视觉体系验证，不替换现有竖屏 Tiny Agent 视频。

- Tiny Agent 固定使用同一张静态图片。
- HyperFrames 负责章节标题、流程线、文档、工具、结果和记忆状态的语义动画。
- 当前使用 27.168 秒中文旁白，重点验证横屏构图、中文阅读和长视频信息密度。
- 当前版本只有两块主画面，检索、工具、记忆三句旁白共用同一张能力地图，仅切换高亮重点。
- 通过后可将同一结构扩展为 3-10 分钟的分章节内容。

```bash
HYPERFRAMES_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run check
HYPERFRAMES_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run render
HYPERFRAMES_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run preview
```
