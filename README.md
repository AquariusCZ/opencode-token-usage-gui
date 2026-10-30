# OpenCode Token Usage (Desktop)

[![CI](https://github.com/AquariusCZ/opencode-token-usage-gui/actions/workflows/ci.yml/badge.svg)](https://github.com/AquariusCZ/opencode-token-usage-gui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Per-turn token, cache and cost footer for **OpenCode Desktop** — the desktop counterpart of the CLI's `debug.turn_tokens`.

![Screenshot](assets/screenshot.png)

The footer is appended under every completed (or streaming) turn:

```text
本轮  输入 15,733 · 输出 6,250 · 缓存读 10,300,544 · 缓存命中 99.8% · 合计 10,332,638 · ¥0.288
```

Hover it for the full breakdown: reasoning tokens, cache writes, request count, wall time, and the original USD cost.

## Why this exists

OpenCode Desktop already has a context button in the title bar. It shows the **latest request** and the **session total**, but it does not answer the question you ask after a long agent loop:

> How much did *this turn* actually cost?

The TUI has `debug.turn_tokens`; the desktop GUI has no official message-footer slot. This plugin fills that gap:

- aggregates every model request in a turn (including tool loops),
- shows the numbers that matter for cost (cache hit rate, CNY cost),
- updates live while the answer is still streaming,
- stays out of the way when disabled.

## Features

- **Per-turn, not per-message** — one footer for the whole turn. A turn can contain 20+ assistant requests; summing them is what makes the number meaningful.
- **Live count-up** — follows the CLI's ticking counter with a 550 ms ease-out tween. Respects `prefers-reduced-motion`.
- **Cache-aware** — shows cache reads and the cache hit rate, which is where most of the cost difference lives on DeepSeek and Anthropic models.
- **RMB by default** — converts the app's USD cost with a configurable rate, and puts the original USD amount in the tooltip.
- **Revert-aware** — messages hidden by an undo/revert boundary are excluded from the totals.
- **Bilingual** — follows the app language: 中文 or English.
- **Zero runtime dependencies** — one built CJS file; no network calls, no telemetry.
- **Safe failure** — if the app's internal DOM changes, the plugin logs one warning and stays quiet instead of breaking the timeline.

## Install

### From GitHub

```sh
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```

Then reload the desktop app (`Ctrl/Cmd + R`) or run:

```sh
opencode service restart
```

### Manual

```sh
git clone https://github.com/AquariusCZ/opencode-token-usage-gui.git \
  ~/.config/opencode/plugins/opencode-token-usage-gui
```

On Windows PowerShell:

```powershell
git clone https://github.com/AquariusCZ/opencode-token-usage-gui.git `
  "$env:USERPROFILE\.config\opencode\plugins\opencode-token-usage-gui"
```

OpenCode discovers immediate plugin directories under `~/.config/opencode/plugins/`. If the footer does not appear, restart the service or use **Settings → Extensions → Plugins → Reload**.

To uninstall, remove the directory and reload. To disable only the desktop UI, use the plugin's switch in **Settings → Extensions → Plugins**.

## Configuration

Options are passed through the plugin entry in `opencode.json(c)`:

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

| Option | Default | Description |
| --- | --- | --- |
| `compact` | `false` | Show only input, output, total and cost. |
| `detailed` | `false` | Also show reasoning tokens and cache writes on the visible line. |
| `showCost` | `true` | Show the per-turn cost. |
| `animate` | `true` | Tween the numbers instead of jumping every 500 ms. |
| `currency` | `"CNY"` | `"CNY"` or `"USD"`. |
| `usdToCny` | `6.68` | Conversion rate used for CNY. The default is the 2026-10-30 rate; set it to your billing rate. |

A local directory can be used the same way:

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

## What the numbers mean

The total follows OpenCode's own definition:

```text
input + output + reasoning + cache.read + cache.write
```

- **Turn** starts at a user or synthetic message and includes every assistant request until the next user/synthetic message.
- **Cache hit rate** is `cache.read / (input + cache.read + cache.write)`. It describes how much of the prompt was served from cache.
- **Cost** comes from the app's per-request `message.cost` (USD). CNY is a display conversion; it is not a second billing source.

If a turn has no reported cost (free models, some providers), the cost is hidden and the token counts still show.

## How it works

This is a GUI plugin (`./gui-experimental`) built against OpenCode Desktop's experimental plugin API.

1. The plugin reads the active session's message list from the app's client store.
2. It groups assistant messages by the preceding user/synthetic message and sums `tokens` and `cost`.
3. It finds the rendered assistant content container (`[data-slot="session-turn-assistant-content"]`) and appends a footer node.
4. A 500 ms interval keeps the values fresh; a `MutationObserver` re-attaches the footer when the app re-renders the timeline; `requestAnimationFrame` animates changes.

There is no official message-footer slot in the GUI plugin API, so the last step is DOM injection. That is the intentionally fragile part: if a future OpenCode release renames the slot, the footer disappears (the plugin logs one warning) rather than corrupting the timeline. The selector and the aggregation logic are isolated in `src/gui.cjs` and `src/core.cjs`, so adapting is usually a one-line change.

## Compatibility

- Tested with **OpenCode Desktop 2.2.3** on Windows 11.
- Requires the V2 desktop app; it does not work in the TUI.
- The GUI plugin API is marked experimental by OpenCode and may change between releases.
- The DOM-based rendering should work on macOS and Linux, but those platforms have not been tested.

For the TUI, use the CLI's built-in `debug.turn_tokens` or one of the terminal-only token plugins.

## Privacy

- No network requests, no telemetry, no API keys.
- Reads only the local session state that the desktop app already has in memory.
- The default exchange rate is a constant; it is not fetched at runtime.

## Development

```sh
npm install
npm test        # pure-logic tests, Node's built-in runner
npm run build   # bundles src/gui.cjs -> dist/gui-experimental.cjs
npm run check   # build + test
```

Layout:

```text
src/core.cjs              pure aggregation and formatting
src/gui.cjs               plugin lifecycle, DOM, animation
dist/gui-experimental.cjs built single-file CJS entry (committed)
test/core.test.cjs        unit tests
scripts/build.mjs         esbuild bundle
```

For local development, copy `dist/gui-experimental.cjs` into your plugin directory after each build, or point the plugin at the repo directory and reload. The app watches the built file and reloads the GUI for local plugin directories.

## Troubleshooting

**No footer appears**

1. Open **Settings → Extensions → Plugins** and confirm `token-usage-gui` is listed and enabled.
2. Reload the window (`Ctrl/Cmd + R`) or run `opencode service restart`.
3. Check `~/.local/share/opencode/log/opencode.log` for `token-usage-gui` errors.

**The footer appears but the cost is missing**

The provider did not report a cost for that request. Token counts still work. Free models and some local providers have no cost.

**The price looks wrong**

Set `usdToCny` to your actual billing rate, or switch `currency` to `"USD"` to see the app's native amount.

**The footer disappeared after an OpenCode update**

The internal timeline slot likely changed. Please open an issue with your OpenCode version and a screenshot; the fix is usually a selector update.

## License

MIT © [AquariusCZ](https://github.com/AquariusCZ)

---

[中文说明](README.zh-CN.md)
