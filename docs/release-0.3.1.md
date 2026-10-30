# v0.3.1 — one session summary in the dock, per-turn capsules in the transcript

This release fixes a v0.3.0 edge case: a queued or steered prompt could create a zero-value "This turn" capsule in
the composer dock, and the dock could flip between a per-turn line and the session summary. The dock now always
shows the session summary; per-turn capsules stay under their turn.

## What changed

- **Two capsule types, cleanly separated.** One **Session** capsule in the composer dock above the input, and one
  capsule under each turn in the transcript.
- **The dock is always the session summary.** Once the session has usage, the "Session" capsule is visible while a
  turn runs, while the session is idle, and while messages are queued. It is never replaced by a per-turn capsule.
- **Per-turn capsules update in place.** The active turn's capsule updates under its reply while the turn is
  thinking or running tools; a queued or steered prompt never creates a zero-value capsule.
- **Turns follow the app's idle markers.** A turn opens at the first user prompt of an execution and closes at the
  next `idle` marker. Steers and delivered queued prompts belong to the running turn; synthetic, system and
  compaction notices never start one. Transcripts without idle markers (older sessions) fall back to user-message
  boundaries, so their history is preserved.
- **Steer rows track the turn.** Rows whose `data-message-id` is the delivered steer id now resolve to the turn, so
  the capsule follows the live end of the turn.
- **First-step summary.** The summary keeps the transcript totals until the session ledger reports tokens, so it no
  longer disappears on the first step.
- **Grammar.** The card says "1 turn" instead of "1 turns".
- **45 tests.**

## Install

```sh
opencode plugin add github:AquariusCZ/opencode-token-usage-gui
```

Reload the desktop window with `Ctrl/Cmd + R`, or restart the service:

```sh
opencode service restart
```

30 seconds, no config. Options live in the plugin entry of `opencode.json(c)`.

## Upgrading from v0.3.0

Update the plugin directory to the v0.3.1 tag, then reload the window or restart the service.
`dist/gui-experimental.cjs` is committed, so a fresh clone works without a build step.

If the capsule does not appear: **Settings → Extensions → Plugins → Reload**, and check
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

`npm run check` builds the bundle and runs **45 tests**: turn aggregation (including idle-marker and legacy
boundaries), cache math, formatters, card placement, and a 2,000-message performance case.

## Links

- Repository and README: https://github.com/AquariusCZ/opencode-token-usage-gui
- Screenshot: https://github.com/AquariusCZ/opencode-token-usage-gui/blob/main/assets/screenshot-en.png
- Issues and selector breakage reports: https://github.com/AquariusCZ/opencode-token-usage-gui/issues
- OpenCode Discord: https://opencode.ai/discord

If the plugin saves you a scroll, a star helps other people find it. If it breaks, an issue with your desktop version
and a screenshot helps more.
