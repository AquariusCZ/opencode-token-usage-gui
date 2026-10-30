# v0.3.0 — per-turn token, cache and cost capsules for OpenCode Desktop V2

OpenCode Desktop shows the latest request and the session total. It does not show what **this turn** cost.
This release adds the missing line — and a readable card behind it.

## What it does

- **One capsule per turn.** Input, output, cache reads, cache hit rate, total tokens and RMB cost, under the reply
  they belong to. The whole agent loop is included, not just the last assistant message.
- **A live capsule while work is in flight.** While the model is thinking or running tools, the capsule sits in the
  composer dock, starts at zero and follows the turn. When the turn settles, it moves under the reply.
- **A session summary when the work is done.** Idle session, no pending or queued message: the dock shows a
  session-wide capsule with ledger totals, requests and active time. Starting the next turn replaces it with the
  live capsule.
- **A details card worth hovering.** Theme-native card with a composition bar, six metrics, request count, wall
  time and the exchange-rate source. Pin it with the info button; Escape or an outside click closes it.
- **`popoverSide`.** Prefer the left gutter (default) or the right; the card falls below or above when the chosen
  side does not fit, and never jumps to the opposite side.
- **Theme-native and keyboard accessible.** Colors come from the desktop's own v2 tokens in light and dark mode.
  Tab / Enter / Space pin, Escape closes from non-editing surfaces, `prefers-reduced-motion` is honored.
- **Zero runtime dependencies.** One built CJS file, no telemetry, no API keys, no network requests unless you opt
  into `usdToCny: "auto"` for a daily FX rate.

## Install

```sh
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```

Reload the desktop window with `Ctrl/Cmd + R`, or restart the service:

```sh
opencode service restart
```

30 seconds, no config. Options live in the plugin entry of `opencode.json(c)`.

## Upgrading from v0.2.x

Update the plugin directory to the v0.3.0 tag, then reload the window or restart the service.
`dist/gui-experimental.cjs` is committed, so a fresh clone works without a build step.

If the footer does not appear: **Settings → Extensions → Plugins → Reload**, and check
`~/.local/share/opencode/log/opencode.log` for `token-usage-gui`.

## Compatibility and caveats

- Built for the **experimental V2 GUI plugin API** (`./gui-experimental`, `@opencode/plugin/gui`). The API may change
  between OpenCode releases.
- Tested with **OpenCode Desktop 2.2.3** on Windows 11. macOS and Linux should work but are untested. It does not
  work in the TUI.
- There is no official message-footer slot, so the footer is **injected into the message DOM**. If a future desktop
  release renames the slot, the footer disappears and the plugin logs one warning instead of breaking the timeline.
- The screenshot in the README is an **illustrative mock**, clearly labeled. A real capture is a to-do.
- Not an official OpenCode plugin; MIT-licensed community work.

## Tests

`npm run check` builds the bundle and runs **35 tests**: turn aggregation, cache math, formatters, card placement,
and a 2,000-message performance case.

## Links

- Repository and README: https://github.com/AquariusCZ/opencode-token-usage-gui
- Screenshot: https://github.com/AquariusCZ/opencode-token-usage-gui/blob/main/assets/screenshot-en.png
- Issues and selector breakage reports: https://github.com/AquariusCZ/opencode-token-usage-gui/issues
- OpenCode Discord: https://opencode.ai/discord

If the plugin saves you a scroll, a star helps other people find it. If it breaks, an issue with your desktop version
and a screenshot helps more.
