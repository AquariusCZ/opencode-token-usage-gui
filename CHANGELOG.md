# Changelog

## 0.3.0 — 2026-10-30

- **A real breakdown card replaces the native `title` tooltip.** Hovering or focusing the footer now opens a
  theme-aware card instead of the browser's delayed, unstyleable tooltip.
- **A target you can actually hit.** The footer is a padded pill (about 30 px tall) with a dedicated info button
  whose hit area extends past its glyph. The card stays open when the pointer moves onto it — an invisible 8 px
  bridge spans the gap — so it does not vanish while you aim at it.
- **Click to pin.** The info button pins the card; pinned text is selectable, and Escape, a second click, or a
  click outside closes it. Keyboard users get the same flow through Tab / Enter / Space.
- **Readable at a glance.** The card adds a composition bar, a six-cell metric grid (input, output, reasoning,
  cache read, cache write, cache hit), request count, wall time, and the exchange-rate source. The visible footer
  stays compact.
- **Out of the way.** The card opens on the configured side (left by default), then below, then above, so it
  does not sit on top of the turn's step rows when the window has room. It clamps to the viewport and repositions
  on scroll and resize.
- **Configurable card side.** `popoverSide` (`"left"` default, or `"right"`) picks the preferred gutter; if it
  does not fit, the card falls back below, then above. It never switches to the opposite side.
- **Occlusion-proof live line.** The active turn's capsule is a normal flow child of the composer dock, on its own
  line below the app's subagent/Goal pills and above the input. The app's z-70 composer lane can no longer paint
  over it; the dock's ResizeObserver updates the timeline inset. It starts at zero, updates live, and moves under
  the turn when it settles. Completed turns keep their own capsules.
- **Above the app's normal stacking contexts.** The details card is now a fixed body portal at z-index
  2147483000, above the timeline, later messages and the composer, so virtualized-row clipping and normal
  stacking contexts cannot cover or cut it.
- **Theme-native.** Background, borders, elevation, text and overlay colors come from the desktop's own v2 tokens,
  so light and dark mode both look native. `prefers-reduced-motion` is honored.
- **Actually pauses when hidden.** The sample timer is now cleared while the window is hidden (the README already
  promised this); it restarts and refreshes on visibility.
- **No ghost footers.** Stale entries are pruned on every sync, so switching sessions, reverting a turn, or a row
  the app removed no longer leaves a footer behind, while a transient re-render keeps the existing ones.
- **Zero buckets no longer leave stray separators.** Hidden items now hide their leading separator too.
- Cost-only turns (reported cost with zero tokens) now get a footer instead of being dropped.
- **Hardening.** The fallback stylesheet now survives a plugin reload; cleanup removes the live dock line; a docked
  footer survives a transient row absence; FX dates use the local timezone; malformed locales fall back to en-US.
  Added a no-fit placement test (30 tests).
- Refreshed the interactive mock and screenshot; added an in-page light/dark toggle.

## 0.2.2 — 2026-10-30

- **Continuous mode (new default).** The sampler reads the store every 100 ms while the session is running and
  every 1000 ms when idle; the display runs at 60 Hz and follows the latest target with a first-order lag. A new
  sample only changes the target — it never restarts the animation — so the counter reads as one continuous
  motion from the first token to the final total.
- **`refreshMode` switch.** `"continuous"` (default) or `"interval"`; interval mode preserves the old
  `refreshMs` + `tweenMs` behavior.
- New `sampleMs` (50–1000, default 100) and `smoothMs` (50–2000, default 250) options.
- Measured CPU on a ~200-message session: continuous ~2.7% of one core, interval 500 ms ~1.6%, 60 Hz polling
  ~12.7%. Continuous keeps the 60 Hz animation without 60 Hz store polling.
- 18 unit tests; CI green.

## 0.2.0 — 2026-10-30

- Currency modes: `CNY`, `USD`, and `auto` (CNY for a Chinese UI, USD otherwise).
- Exchange-rate modes: manual `usdToCny` (no network) or `"auto"` with a 24-hour cache, daily refresh, and
  cache/default fallback. The tooltip shows the rate, source, and date.
- Configurable refresh rate: `refreshMs` (200–5000, default 500) and `tweenMs` (0–2000, default 550).
- Pauses the refresh timer while the window is hidden and refreshes on visibility.
- Replaced the real-machine screenshot with an English illustrative mock; added the HTML source.
- Expanded the README with a comparison table, currency/rate docs, refresh docs, FAQ, and roadmap.
- Added `publishConfig.access: public` for npm.

## 0.1.0 — 2026-10-30

Initial public release.

- Per-turn token aggregation across tool loops, matching OpenCode's total formula.
- Live count-up animation with `prefers-reduced-motion` support.
- Cache read and cache hit rate on the visible line; reasoning and cache writes in the tooltip.
- Per-turn cost in CNY by default (configurable rate), original USD in the tooltip.
- Revert/undo boundary handling.
- Chinese and English copy, following the app locale.
- Explicit `compact` and `detailed` display modes.
- Zero runtime dependencies; pure logic covered by Node's test runner.
- Verified against OpenCode Desktop 2.2.3 on Windows 11.
