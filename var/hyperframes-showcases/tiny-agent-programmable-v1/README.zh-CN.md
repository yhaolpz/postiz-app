# Tiny Agent 可编程动画样片 v1

该样片复用现有 `Augmented LLM First` 旁白和已批准的 Tiny Agent 生成式角色画面，验证以下四种可参数化动作：

- `pose`：人物和 Tiny Agent 姿势切换。
- `fly`：文档沿两段路径飞入 Agent。
- `plug`：工具移动到 Agent 并绘制连接线。
- `store`：状态卡片进入记忆区并返回上下文。

角色没有使用 HTML、SVG 或 Canvas 重绘。姿势包记录原始生成图、裁切区域和语义锚点，HyperFrames 只负责组合与动画。

## 生成

```bash
node scripts/ai-video-pipeline/hyperframes/build-showcase.mjs \
  --project var/hyperframes-showcases/tiny-agent-programmable-v1
```

## 验证与渲染

```bash
cd var/hyperframes-showcases/tiny-agent-programmable-v1
npx --yes hyperframes@0.7.57 check . --snapshots --frame-check=severity=error
npx --yes hyperframes@0.7.57 render . --quality high \
  --output renders/tiny-agent-programmable-v1.mp4
```

当前目录是独立样片，不接入 Postiz，也不会触发发布。
