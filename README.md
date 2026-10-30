<div align="center">

# OpenCode Token Usage

**See what every turn actually costs — right under the reply.**

A zero-config GUI plugin for **OpenCode Desktop V2** (2.2.3+): per-turn tokens, cache hit rate and RMB cost.
Requires the V2 desktop app; it does not work in the TUI.

[![CI](https://github.com/AquariusCZ/opencode-token-usage-gui/actions/workflows/ci.yml/badge.svg)](https://github.com/AquariusCZ/opencode-token-usage-gui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/AquariusCZ/opencode-token-usage-gui?label=release&color=111827)](https://github.com/AquariusCZ/opencode-token-usage-gui/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenCode Desktop](https://img.shields.io/badge/OpenCode%20Desktop-2.2.3%2B-111827)](https://opencode.ai/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/AquariusCZ/opencode-token-usage-gui/issues)

[Install](#install) · [Features](#features) · [Configuration](#configuration) · [How it works](#how-it-works) · [FAQ](#faq) · [中文](README.zh-CN.md)

</div>

```sh
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```

Then reload the window (`Ctrl/Cmd + R`) or run `opencode service restart`. Full options are under [Install](#install).

![OpenCode Desktop with a per-turn token footer](assets/screenshot-en.png)

*Illustrative English mock of the footer and details card. Not a real session screenshot. The illustration shows
`popoverSide: "right"`; the default is left.*

> OpenCode Desktop shows the latest request and the session total. It does not show what **this turn** cost.
> This plugin adds the missing line.

## The 10-second version

```text
This turn · Input 15,733 · Output 6,250 · Cache read 10,300,544 · Cache hit 99.8% · Total 10,332,638 · ¥0.288
```

Hover the line — or focus its info button — for a readable breakdown:

```text
Turn breakdown · 10,332,638 tokens · ¥0.288 (≈ $0.0431)
[■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■] 99.7% cache read
Input 15,733      Output 6,250
Reasoning 10,111  Cache read 10,300,544
Cache write 0     Cache hit 99.8%
21 model requests · 2m 15s · Exchange rate 6.68 · manual
```

Click the info button to pin the card while you read or copy it. The preview stays open when you move onto it — an
invisible 8 px bridge covers the gap — so there is nothing to chase; the pinned card closes with Escape or a click
outside. Escape closes it from any non-editing surface; text fields, editors, selects, menus/listboxes and dialogs
keep Escape for the app.

## Why not just use the built-in context panel?

The built-in panel answers **“how big is the context right now?”**
This plugin answers **“what did this turn cost, and why?”**

| | Built-in context panel | This plugin | CLI `debug.turn_tokens` |
| --- | :---: | :---: | :---: |
| Latest request | ✅ | ❌ (per-turn) | — |
| Per-turn total | ❌ | ✅ | ✅ |
| Cache hit rate | ❌ | ✅ | — |
| Per-turn cost | ❌ | ✅ CNY / USD | ❌ |
| Inline under every reply | ❌ | ✅ | ✅ |
| Works in the desktop GUI | ✅ | ✅ | ❌ |

A turn is not one request. In a long agent loop it can contain 20+ assistant requests and tool calls.
Showing only the last assistant message hides most of the cost. This plugin sums the whole turn, then shows the
numbers that actually change the bill.

## Features

- **Per-turn, not per-message.** One footer per turn, aggregating every assistant request and tool loop.
- **A details card that is actually readable.** Hover or focus the footer for a theme-aware card with a token
  composition bar, a six-cell metric grid, request count, wall time, and the exchange-rate source. The card stays
  open while your pointer is over it (an invisible bridge covers the gap) and can be pinned with the info button
  for persistent reading and copying. It opens on the configured side of the footer (left by default), then below
  it, then above, so it does not cover the turn's step rows on a wide window; it clamps to the viewport and
  repositions on scroll and resize.
- **Live from the first token.** While a turn is thinking or running tools, its capsule sits in the composer dock,
  above the queued-message panel and the composer card. It starts at zero and updates live, then moves under the
  turn when the turn settles. Completed turns keep their capsules.
- **Session summary when the work is done.** When the session is idle and no pending or queued message remains,
  the composer dock switches to a session-wide capsule labeled “Session”. Token and cost totals come from the
  app's session ledger — `session.get().tokens` plus `session.cost()`, including title/compaction and, when the
  API is available, subagent usage — so they are lifetime billed totals, not the sum of the loaded transcript.
  The inline capsule shows tokens, cost and cache hit; hover it for the full session card, which adds requests
  and active time. Turn, request and active-time counts cover the loaded transcript and are marked “loaded” when
  older message pages exist. Per-turn capsules stay in the transcript. Starting a new turn replaces the summary
  with the live capsule.
- **Above the app's normal layers.** The details card is rendered in a fixed body portal at z-index 2147483000,
  above the timeline, later messages and the composer, so normal stacking contexts cannot cover or clip it.
  An app-level modal/dialog may still sit above it.
- **A footer you can hit.** The visible line is a padded pill with a dedicated info button whose hit area extends
  past the glyph; no need to land on a single 12 px line.
- **Keyboard accessible.** Tab to the info button, press Enter or Space to pin, Escape or an outside click to close.
  Escape closes the card from any non-editing surface; text fields, contenteditable editors, selects, menus/listboxes
  and dialogs keep Escape for the app. `prefers-reduced-motion` disables the card transition.
- **Live count-up.** Continuous mode samples the store at 100 ms while running and follows the target with a
  60 Hz first-order lag; a new sample changes the target without restarting the animation, so the counter reads
  as one continuous motion. An `interval` mode keeps the old discrete refresh + tween behavior. Respects
  `prefers-reduced-motion`.
- **Cache-aware.** Shows cache reads and the cache hit rate — the metric that explains most of the cost difference
  on DeepSeek and Anthropic models.
- **RMB by default.** Converts the app's USD cost with a manual or daily-cached rate; the original USD amount stays
  in the card. `"currency": "USD"` switches back, `"auto"` follows the UI language.
- **Revert-aware.** Messages hidden by an undo/revert boundary are excluded from totals.
- **Stale-proof.** Stale footers are pruned on every sync, so a session switch, a revert, or a row the app removed
  cannot leave a ghost line behind.
- **Bilingual.** Follows the app locale: 中文 or English.
- **Compact or detailed.** Default shows the decision-making numbers; `detailed` adds reasoning tokens and cache
  writes to the visible line. The card always shows the full breakdown.
- **Zero runtime dependencies.** One built CJS file. No telemetry, no API keys, and no network requests unless you
  explicitly opt into `usdToCny: "auto"`.
- **Safe failure.** If the app's internal DOM changes, the plugin logs one warning and stays quiet instead of
  breaking the timeline.
- **Fast.** Aggregating 2,000 messages takes about 3 ms in the test suite; the sampler runs at 100 ms while a
  session is running (1000 ms idle), and the card only writes DOM when its data changes.

## Install

### The 30-second version (GitHub)

```sh
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```

Then reload the desktop window (`Ctrl/Cmd + R`) or restart the service:

```sh
opencode service restart
```

### Manual install

```sh
git clone https://github.com/AquariusCZ/opencode-token-usage-gui.git \
  ~/.config/opencode/plugins/opencode-token-usage-gui
```

Windows PowerShell:

```powershell
git clone https://github.com/AquariusCZ/opencode-token-usage-gui.git `
  "$env:USERPROFILE\.config\opencode\plugins\opencode-token-usage-gui"
```

OpenCode discovers immediate plugin directories under `~/.config/opencode/plugins/`. If the footer does not appear,
open **Settings → Extensions → Plugins** and use **Reload**, or run `opencode service restart`.

### Verify

1. A footer appears under each completed turn; while a turn is streaming, its live capsule sits above the
   composer.
2. **Settings → Extensions → Plugins** lists `token-usage-gui` and its switch is on.
3. `opencode plugin list` shows `token-usage-gui`.
4. If something is off, check `~/.local/share/opencode/log/opencode.log` for `token-usage-gui`.

### Uninstall

Remove the directory and reload. To disable only the desktop UI, use the plugin's switch in **Settings → Extensions →
Plugins**. To remove a package install:

```sh
opencode plugin remove opencode-token-usage-gui
```

## Configuration

Options go in the plugin entry of `opencode.json(c)`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-token-usage-gui",
      "options": {
        "compact": false,
        "detailed": false,
        "showCost": true,
        "popoverSide": "left",
        "animate": true,
        "refreshMode": "continuous", // default; "interval" switches to refreshMs/tweenMs
        "sampleMs": 100,
        "smoothMs": 250,
        "refreshMs": 500, // interval mode only
        "tweenMs": 550, // interval mode only
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
| `popoverSide` | `"left"` | Side for the details card: `"left"` or `"right"`. The chosen side is tried first; if it does not fit, the card falls back below, then above. It never switches to the other side. |
| `animate` | `true` | Animate the numbers. Set `false` to snap in both modes. |
| `refreshMode` | `"continuous"` | `"continuous"` (fluid counter) or `"interval"` (discrete refresh + tween). |
| `sampleMs` | `100` | Continuous mode: data sample interval while the session is running, clamped to 50–1000 ms. Idle sessions sample at 1000 ms. |
| `smoothMs` | `250` | Continuous mode: first-order lag time constant, clamped to 50–2000 ms. Larger = softer/slower. |
| `refreshMs` | `500` | Interval mode: refresh interval, clamped to 16–5000 ms. `16.67` = 60 Hz; intended for experiments. |
| `tweenMs` | `550` | Interval mode: tween duration, clamped to 0–2000 ms. |
| `currency` | `"CNY"` | `"CNY"`, `"USD"`, or `"auto"`. `auto` uses CNY for a Chinese UI and USD otherwise. |
| `usdToCny` | `6.68` | A number (manual rate, no network) or `"auto"` (daily cached rate; see below). |

A local directory works the same way:

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

### Card side

The details card opens to the left of the footer by default. Set `"popoverSide": "right"` to prefer the right gutter.

The chosen side is tried first. On a narrow window where it does not fit, the card falls back below the footer, then
above it; it does not switch to the opposite side. This keeps the configured direction predictable.

### Currency and exchange rate

`message.cost` is always USD from the provider. The footer is a **display conversion**, not a second billing source.

- `currency: "CNY"` (default) shows `¥`.
- `currency: "USD"` shows the native `$` amount.
- `currency: "auto"` uses CNY in a Chinese UI and USD otherwise.
- `usdToCny: 6.68` is a manual rate. It is deterministic and makes **no network request**.
- `usdToCny: "auto"` fetches the daily USD→CNY rate from `open.er-api.com`, caches it for 24 hours, and falls back to the last cached rate or the manual `6.68` when offline. Only this opt-in mode uses the network.

The details card always tells you which rate was used:

```text
Exchange rate 6.68 · manual
Exchange rate 6.72 · auto (2026-10-30)
Exchange rate 6.68 · fallback
```

Set `usdToCny` to your actual billing rate if you want the number to match your invoice exactly.

### Refresh modes

`refreshMode` is the switch:

- **`"continuous"` (default)** — the sampler reads the store every `sampleMs` (100 ms) while the session is running,
  and every 1000 ms when idle. The display runs at 60 Hz and follows the latest target with a first-order lag
  (`smoothMs`, 250 ms). A new sample only changes the target; it never restarts the animation, so the counter reads
  as one continuous motion from the first token to the final total.
- **`"interval"`** — the old behavior: read every `refreshMs` (500 ms), then tween to the new value over `tweenMs`
  (550 ms). Use this if you prefer visible step changes or a fixed sampling cadence.

`animate: false` disables both filters and snaps to the target.

Why this split: the display can update at 60 Hz, but the data can only change when the session store changes. Polling
the store at 60 Hz is wasteful (see the measurement below); sampling at 100 ms and filtering at 60 Hz gives the same
visual continuity at a fraction of the CPU.

Measured on a ~200-message session (Windows 11, OpenCode Desktop 2.2.3): `interval` at 500 ms used about **1.6% of
one CPU core**; polling at 16.67 ms (60 Hz) used about **12.7%** over the same 20-second window; `continuous` with
100 ms sampling used about **2.7%**. The count-up animation was already 60 Hz via `requestAnimationFrame`, so 60 Hz
*data* polling bought no extra smoothness. Continuous mode keeps the 60 Hz animation but samples at 100 ms, so it
gets the smooth motion without the 60 Hz polling cost.

The timer pauses while the window is hidden and refreshes immediately when it becomes visible again. A debounced
`MutationObserver` still reattaches the footer when the app re-renders the timeline.

### Display modes

| Mode | Visible line |
| --- | --- |
| Default | input · output · cache read · cache hit · total · cost |
| `compact: true` | input · output · total · cost |
| `detailed: true` | input · output · reasoning · cache read · cache write · cache hit · total · cost |

The details card always shows the full breakdown, including the composition bar, request count and wall time.

## What the numbers mean

The total follows OpenCode's own definition:

```text
input + output + reasoning + cache.read + cache.write
```

- **Turn** starts at a user or synthetic message and includes every assistant request until the next user/synthetic
  message.
- **Cache hit rate** is `cache.read / (input + cache.read + cache.write)`. It describes how much of the prompt was
  served from cache.
- **Cost** comes from the app's per-request `message.cost` (USD). CNY is a display conversion; it is not a second
  billing source.
- **Requests** counts assistant messages with a usage record, not individual tool calls.
- **Duration** runs from the first assistant request to the last completed one in the turn.

If a turn has no reported cost (free models, some providers), the cost is hidden and the token counts still show.

## How it works

```text
user message
   │
   ├─ assistant request 1 ─┐
   ├─ tool call            │
   ├─ assistant request 2  ├─ one turn
   ├─ tool call            │
   └─ assistant request 3 ─┘
                │
                ▼
   input + output + reasoning + cache.read + cache.write
```

1. The plugin reads the active session's message list from the app's client store.
2. It groups assistant messages by the preceding user/synthetic message and sums `tokens` and `cost`.
3. It finds the rendered assistant content container (`[data-slot="session-turn-assistant-content"]`) and appends
   a footer node.
4. A 100 ms sampler (1000 ms when idle) keeps values fresh; a `MutationObserver` re-attaches the footer when the
   app re-renders the timeline; `requestAnimationFrame` animates changes.
5. While the app reports `session.status` as `running` (thinking or tools), the active turn's footer becomes the
   first flow child of the `[data-component="session-composer-dock"]`'s `z-[70]` column, **above** the queue grow
   and `[data-slot="composer-morph"]`. The queue's 12 px negative-margin tuck lands on the composer card, not on the
   capsule; the dock's ResizeObserver updates the timeline inset; a morph face flight (`data-moving` +
   `overflow-clip`) cannot clip a node outside the morph. The line starts at zero and updates live; when the turn
   settles it moves into the assistant content. Hovering opens the fixed body-portal card at z-index 2147483000,
   preferring the configured side (left by default), then below, then above. The follow timer skips a hidden window.
6. When the session is idle with no pending/queued message, the dock shows a synthetic “Session” footer. Token and
   cost totals come from the app's session ledger: `session.get(id).tokens` and `session.cost(id)` (family-aware
   for a root, own usage for a child), folded over the session and, when the API exists, its family. The ledger
   includes title/compaction usage, reverted usage (a revert does not refund) and subagent usage, so the summary is
   a lifetime billed total and can exceed the sum of the per-turn footers. Turn count, requests and active time
   still come from `summarizeTurns(turns)` over the loaded transcript, and are labeled “loaded” when
   `message.more(id)` reports older pages. `message.sync`/`loadMore` are never called, so reading the summary never
   mutates the transcript or the scroll position. Idleness is checked against the client store's pending list, so a
   queued prompt with its panel closed still hides the summary; a second `MutationObserver` watches the active
   pane's composer dock, so queue rows appearing or disappearing refresh within the 120 ms debounce instead of the
   1 s idle sample. It is replaced by the live capsule when the next turn starts.

There is no official message-footer slot in the GUI plugin API, so the last step is DOM injection. That is the
intentionally fragile part: if a future OpenCode release renames the slot, the footer disappears (the plugin logs
one warning) rather than corrupting the timeline. The selector, footer, placement and aggregation logic are isolated in
`src/gui.cjs`, `src/footer.cjs`, `src/placement.cjs` and `src/core.cjs`, so adapting is usually a one-line change.

## Compatibility

- Tested with **OpenCode Desktop 2.2.3** on Windows 11.
- Requires the V2 desktop app; it does not work in the TUI.
- The GUI plugin API is marked experimental by OpenCode and may change between releases.
- The DOM-based rendering should work on macOS and Linux, but those platforms have not been tested.

For the TUI, use the CLI's built-in `debug.turn_tokens` or one of the terminal-only token plugins.

## Privacy

- No network requests by default, no telemetry, no API keys.
- Reads only the local session state that the desktop app already has in memory.
- The default exchange rate is a manual constant; it is not fetched at runtime.
- `usdToCny: "auto"` is the only network path: one request per day to `open.er-api.com`, cached for 24 hours. Leave it
  on the default manual value for a fully offline plugin.

## FAQ

**Does it send my prompts or session data anywhere?**
No session data is sent anywhere. The only network request is the opt-in daily USD→CNY rate fetch
(`usdToCny: "auto"`); the default plugin is fully offline.

**Why per-turn instead of per-message?**
A turn can contain many assistant requests and tool loops. Per-message numbers look smaller but are misleading.
Use `detailed` if you want more metrics on the visible line.

**Where is the total for the whole session?**
When the session is idle and no pending or queued message remains, the composer dock shows a “Session” capsule
backed by the app's session ledger, so its tokens and cost include title/compaction (and subagent) usage, not just
the visible transcript; hover it for the session breakdown. Turn/request/active-time counts cover the loaded
transcript and say “loaded” when older pages exist. Per-turn capsules remain in the conversation.

**Can I see reasoning tokens?**
Yes: set `detailed: true`, or open the details card. Reasoning is always in the card.

**Can I use USD instead of RMB?**
Yes: set `"currency": "USD"`. The card still shows the original USD amount when CNY is selected.

**How do I keep the card open?**
Click the small info button at the end of the footer. The pinned card is selectable, so you can copy numbers; click
the button again, press Escape, or click outside to close it. Escape closes it from any non-editing surface; text
fields, editors, selects, menus/listboxes and dialogs keep Escape for the app.

**Can I choose which side the card opens on?**
Yes: set `"popoverSide": "left"` (default) or `"popoverSide": "right"`. The chosen side is tried first, then below,
then above; it does not switch to the other side.

**Why is the card never cut off by later messages?**
It is rendered into a fixed portal on `document.body` at a very high z-index (2147483000), above the app's
normal stacking contexts, not inside the scrolling timeline row. Later messages, row clipping and the composer
cannot paint over it.

**Why is the cost zero?**
The provider did not report a cost for that request. Free models and some local providers do not report one.

**Will it survive an OpenCode update?**
Usually yes; the selector is the fragile part. If the footer disappears after an update, open an issue with your
OpenCode version and a screenshot.

**How is the exchange rate determined?**
By default it is the manual `usdToCny` number (`6.68`). With `"usdToCny": "auto"` it fetches the daily rate, caches
it for 24 hours, and falls back to the last cache or `6.68`. The details card shows the rate, its source, and the
date when it was automatic.

**Can I change how often the footer refreshes?**
Yes: `sampleMs` (50–1000, default 100) controls continuous sampling and `smoothMs` (50–2000, default 250) controls
the follow speed; interval mode uses `refreshMs` (16–5000, default 500) and `tweenMs` (0–2000, default 550). The
timer pauses while the window is hidden.

**Does it work in the TUI?**
No. The TUI has `debug.turn_tokens`; this plugin is for the desktop GUI.

## Roadmap

- Per-message mode for people who want a footer under every assistant message.
- Context usage percentage in the details card.
- CSV/JSON export of turn usage.
- Provider-specific price tables instead of a single USD→CNY rate.
- A small settings panel instead of JSON options.
- A selector health check that reports when the app's DOM changes.

Ideas and PRs are welcome. If the plugin saves you a scroll, a star helps other people find it.

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
src/footer.cjs            footer DOM, details card and interactions
src/placement.cjs         DOM-free card placement math
src/gui.cjs               plugin lifecycle, DOM discovery, animation
dist/gui-experimental.cjs built single-file CJS entry (committed)
test/core.test.cjs        aggregation and formatter tests
test/placement.test.cjs   card placement edge cases
scripts/build.mjs         esbuild bundle
assets/mock.html          interactive illustrative mock
```

For local development, copy `dist/gui-experimental.cjs` into your plugin directory after each build, or point the
plugin at the repo directory and reload. The app watches the built file and reloads the GUI for local plugin
directories.

## Community

Questions / launch feedback: [OpenCode Discord](https://opencode.ai/discord) · [Issues](https://github.com/AquariusCZ/opencode-token-usage-gui/issues)

## Contributing

- Open an issue for bugs, selector breakage, or feature requests.
- Keep `dist/gui-experimental.cjs` in sync with `src/`; CI checks it.
- Run `npm test` before opening a PR.
- If an OpenCode update breaks the footer, include the app version and a screenshot.

## License

MIT © [AquariusCZ](https://github.com/AquariusCZ)

---

[中文说明](README.zh-CN.md)
