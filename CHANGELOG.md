# Changelog

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
