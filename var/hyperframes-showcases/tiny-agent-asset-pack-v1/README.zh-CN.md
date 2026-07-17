# Tiny Agent 新动画资产包样片

本样片复用 `Augmented LLM First` 的 24.849 秒旁白，主画面全部使用 `tiny-agent-v1` 透明动画资产包。

验证重点：

- 人物和 Tiny Agent 按语义切换姿势，并使用统一脚底锚点。
- 文档、搜索、浏览器、API、记忆、数据库和结果卡均来自通用道具包。
- HyperFrames 只负责布局、字幕、连接线和确定性动画，不再从完整场景图裁切角色。

```bash
npx hyperframes check . --snapshots --frame-check=severity=error
npx hyperframes render . --quality high --output renders/augmented-llm-asset-pack-v1.mp4
```

该目录是独立样片，不触发 Postiz 发布。
