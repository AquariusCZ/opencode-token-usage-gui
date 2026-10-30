# Changelog

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
