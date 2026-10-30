# OpenCode Token Usage（桌面版）

[![CI](https://github.com/AquariusCZ/opencode-token-usage-gui/actions/workflows/ci.yml/badge.svg)](https://github.com/AquariusCZ/opencode-token-usage-gui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

给 **OpenCode Desktop** 的每一轮对话加一行 token / 缓存 / 费用统计，相当于把 CLI 的 `debug.turn_tokens` 搬到桌面端。

![效果图](assets/screenshot.png)

每一轮结束后（生成中也会实时更新），消息下方会多出一行：

```text
本轮  输入 15,733 · 输出 6,250 · 缓存读 10,300,544 · 缓存命中 99.8% · 合计 10,332,638 · ¥0.288
```

鼠标悬停可以看到完整明细：推理 token、缓存写、模型请求次数、耗时，以及原始的美元费用。

## 为什么做这个

OpenCode Desktop 右上角已经有一个上下文胶囊，但它回答的是「最近一次请求」和「整个会话累计」，不回答长任务里最实际的问题：

> 这一轮到底花了多少？

终端 TUI 有 `debug.turn_tokens`，桌面端没有官方的「消息底部插槽」。这个插件补上了这一块：

- 把一轮里所有模型请求（含工具循环）汇总成一个数；
- 显示真正影响费用的指标：缓存命中率、人民币费用；
- 生成过程中数字会连续滚动，不是每 500ms 跳一下；
- 不想要时可以直接在插件设置里关掉。

## 功能

- **按轮统计，而不是按单条消息**：一轮可能包含 20 多次 model request，只显示最后一条会严重低估。
- **实时计数**：和 CLI 一样连续滚动，550ms ease-out；尊重系统的「减少动态效果」设置。
- **缓存感知**：显示缓存读和缓存命中率。DeepSeek / Anthropic 的费用差异主要在这里。
- **默认人民币**：把应用上报的美元费用按可配置汇率换成 ¥，原始美元放在悬停提示里。
- **撤销感知**：被 revert / undo 边界隐藏的消息不会计入。
- **中英双语**：跟随应用语言自动切换。
- **零运行时依赖**：一个构建好的 CJS 文件；不联网、不上传数据。
- **安静失败**：如果 OpenCode 更新导致内部 DOM 变化，插件只打印一次警告，不会破坏时间线。

## 安装

### 从 GitHub 安装

```sh
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```

然后在桌面端按 `Ctrl/Cmd + R` 重载，或者执行：

```sh
opencode service restart
```

### 手动安装

```powershell
git clone https://github.com/AquariusCZ/opencode-token-usage-gui.git `
  "$env:USERPROFILE\.config\opencode\plugins\opencode-token-usage-gui"
```

macOS / Linux：

```sh
git clone https://github.com/AquariusCZ/opencode-token-usage-gui.git \
  ~/.config/opencode/plugins/opencode-token-usage-gui
```

OpenCode 会自动发现 `~/.config/opencode/plugins/` 下的插件目录。如果没出现，重启服务，或在 **设置 → 扩展 → 插件** 里点 Reload。

卸载：删掉目录并重载。只想关掉桌面 UI：在 **设置 → 扩展 → 插件** 里关掉 `token-usage-gui` 的开关。

## 配置

在 `opencode.json(c)` 的插件条目里传 options：

```jsonc
{
  "plugins": [
    {
      "package": "opencode-token-usage-gui",
      "options": {
        "compact": false,
        "detailed": false,
        "showCost": true,
        "animate": true,
        "currency": "CNY",
        "usdToCny": 6.68
      }
    }
  ]
}
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `compact` | `false` | 只显示输入、输出、合计、费用。 |
| `detailed` | `false` | 在可见行里额外显示推理 token 和缓存写。 |
| `showCost` | `true` | 显示每轮费用。 |
| `animate` | `true` | 数字滚动动画。 |
| `currency` | `"CNY"` | `"CNY"` 或 `"USD"`。 |
| `usdToCny` | `6.68` | 人民币换算汇率。默认值是 2026-10-30 的参考汇率，建议改成你自己的计费汇率。 |

本地目录也可以用同样的方式配置：

```jsonc
{
  "plugins": [
    {
      "package": "./plugins/opencode-token-usage-gui",
      "options": { "compact": true }
    }
  ]
}
```

## 数字口径

合计和 OpenCode 自己的口径一致：

```text
input + output + reasoning + cache.read + cache.write
```

- **一轮**：从一条 user 或 synthetic 消息开始，到下一条 user/synthetic 之前，包含中间所有 assistant 请求。
- **缓存命中率**：`cache.read / (input + cache.read + cache.write)`，表示 prompt 里有多大比例来自缓存。
- **费用**：来自应用上报的每请求 `message.cost`（美元）。人民币只是显示换算，不是第二套计费。

如果模型/供应商没有上报费用（免费模型、部分本地 provider），费用会隐藏，token 仍然显示。

## 实现方式

这是一个 GUI 插件（`./gui-experimental`），基于 OpenCode Desktop 的实验性插件 API。

1. 从应用的客户端 store 读取当前会话的消息列表；
2. 按前面的 user/synthetic 消息把 assistant 消息分组，累加 `tokens` 和 `cost`；
3. 找到渲染出来的 assistant 内容容器（`[data-slot="session-turn-assistant-content"]`），把 footer 节点挂进去；
4. 500ms 定时刷新；`MutationObserver` 在应用重渲染时把 footer 挂回去；`requestAnimationFrame` 做数字动画。

GUI 插件 API 目前没有官方的「消息底部插槽」，所以最后一步是 DOM 注入。这是整个插件最脆的地方：未来 OpenCode 如果改了 slot 名，footer 会消失（插件只打印一次警告），不会污染时间线。选择器和聚合逻辑分别隔离在 `src/gui.cjs` 和 `src/core.cjs`，适配通常只需要改一行选择器。

## 兼容性

- 在 **OpenCode Desktop 2.2.3** + Windows 11 上验证。
- 需要 V2 桌面端；终端 TUI 不适用。
- OpenCode 官方把 GUI 插件 API 标为 experimental，后续版本可能有变化。
- 基于 DOM 的实现理论上 macOS / Linux 也能用，但这两个平台没有实测。

终端里请继续用 CLI 的 `debug.turn_tokens`，或者装 TUI 专用的 token 插件。

## 隐私

- 不联网、没有遥测、不读取 API Key。
- 只读桌面端内存里已经存在的本地会话状态。
- 默认汇率是常量，不会在运行时请求汇率接口。

## 开发

```sh
npm install
npm test        # 纯逻辑测试，Node 内置 test runner
npm run build   # src/gui.cjs -> dist/gui-experimental.cjs
npm run check   # build + test
```

目录：

```text
src/core.cjs              纯聚合 / 格式化逻辑
src/gui.cjs               插件生命周期、DOM、动画
dist/gui-experimental.cjs 构建后的单文件 CJS（已提交）
test/core.test.cjs        单元测试
scripts/build.mjs         esbuild 打包
```

本地开发时，每次 build 后把 `dist/gui-experimental.cjs` 复制到插件目录，或者直接把插件指向仓库目录再重载。应用会监听构建产物并重载 GUI。

## 常见问题

**没有出现 footer**

1. 打开 **设置 → 扩展 → 插件**，确认 `token-usage-gui` 已列出并启用。
2. 重载窗口（`Ctrl/Cmd + R`）或执行 `opencode service restart`。
3. 看 `~/.local/share/opencode/log/opencode.log` 里有没有 `token-usage-gui` 的报错。

**有 token，但没有费用**

该请求没有上报 cost。免费模型和部分本地 provider 会这样，token 统计不受影响。

**人民币金额不对**

把 `usdToCny` 改成你的实际计费汇率，或者把 `currency` 设为 `"USD"` 直接看应用原始金额。

**OpenCode 升级后 footer 消失了**

大概率是内部时间线 slot 改名了。请带上 OpenCode 版本和截图开 issue，通常只需要更新选择器。

## License

MIT © [AquariusCZ](https://github.com/AquariusCZ)

---

[English README](README.md)
