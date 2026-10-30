"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")

const {
  addSessionTokens,
  approachValue,
  buildTurns,
  cacheHitRate,
  clampNumber,
  emptyTotals,
  formatCost,
  formatDuration,
  formatInt,
  formatMoney,
  formatPercent,
  normalizeCurrency,
  normalizePopoverSide,
  normalizeRefreshMode,
  sameTotals,
  smoothingAlpha,
  summarizeTurns,
  tokenComposition,
  tokenUsage,
  visibleMessages,
} = require("../src/core.cjs")

function assistant(id, tokens, options = {}) {
  return {
    id,
    type: "assistant",
    tokens,
    cost: options.cost ?? 0,
    time: {
      created: options.created ?? 0,
      completed: options.completed ?? 0,
    },
  }
}

function user(id) {
  return { id, type: "user" }
}

function idle(id, at = 0) {
  return { id, type: "idle", outcome: "succeeded", time: { created: at } }
}

test("tokenUsage follows OpenCode's total formula", () => {
  const usage = tokenUsage({
    tokens: {
      input: 100,
      output: 10,
      reasoning: 5,
      cache: { read: 50, write: 4 },
    },
  })

  assert.deepEqual(usage, {
    input: 100,
    output: 10,
    reasoning: 5,
    cacheRead: 50,
    cacheWrite: 4,
    total: 169,
  })
})

test("addSessionTokens folds a ledger snapshot into running totals", () => {
  const totals = emptyTotals()
  addSessionTokens(totals, { input: 1, output: 2, reasoning: 3, cache: { read: 4, write: 5 } })

  assert.equal(totals.total, 15)
  assert.deepEqual(totals, {
    input: 1,
    output: 2,
    reasoning: 3,
    cacheRead: 4,
    cacheWrite: 5,
    total: 15,
  })

  addSessionTokens(totals, { input: 10, output: 0, reasoning: 0, cache: { read: 0, write: 0 } })
  assert.equal(totals.total, 25)

  addSessionTokens(totals, null)
  assert.equal(totals.total, 25)
})

test("tokenUsage returns null without a tokens object", () => {
  assert.equal(tokenUsage({ id: "a" }), null)
  assert.equal(tokenUsage(null), null)
})

test("a turn aggregates every assistant request after one user message", () => {
  const messages = [
    user("u1"),
    assistant(
      "a1",
      { input: 100, output: 10, reasoning: 5, cache: { read: 50, write: 0 } },
      { cost: 0.001, created: 1_000, completed: 2_000 },
    ),
    assistant(
      "a2",
      { input: 20, output: 2, reasoning: 1, cache: { read: 30, write: 4 } },
      { cost: 0.002, created: 3_000, completed: 4_000 },
    ),
    idle("i1"),
    user("u2"),
    assistant(
      "a3",
      { input: 7, output: 1, reasoning: 0, cache: { read: 2, write: 0 } },
      { cost: 0.0001, created: 5_000, completed: 6_000 },
    ),
  ]

  const turns = buildTurns(messages)

  assert.equal(turns.size, 2)

  const first = turns.get("u1")
  assert.deepEqual(first.totals, {
    input: 120,
    output: 12,
    reasoning: 6,
    cacheRead: 80,
    cacheWrite: 4,
    total: 222,
  })
  assert.equal(first.cost, 0.003)
  assert.equal(first.requests, 2)
  assert.deepEqual(first.messageIds, ["a1", "a2"])
  assert.equal(first.durationMs, 3_000)
  assert.equal(first.cacheHitRate, (80 / 204) * 100)

  const second = turns.get("u2")
  assert.equal(second.totals.total, 10)
  assert.equal(second.requests, 1)
})

test("idle mode keeps synthetic notices and steers inside the running turn", () => {
  const turns = buildTurns([
    idle("i0"),
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
    { id: "s1", type: "synthetic" },
    user("steer"),
    assistant("a2", { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 1)
  assert.equal(turns.has("s1"), false)
  assert.equal(turns.has("steer"), false)
  assert.equal(turns.get("u1").totals.total, 6)
  assert.equal(turns.get("u1").requests, 2)
  assert.deepEqual(turns.get("u1").userIds, ["u1", "steer"])
})

test("without idle markers every user message starts a new turn", () => {
  const turns = buildTurns([
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
    user("u2"),
    assistant("a2", { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 2)
  assert.deepEqual(turns.get("u1").messageIds, ["a1"])
  assert.equal(turns.get("u1").totals.total, 2)
  assert.deepEqual(turns.get("u2").messageIds, ["a2"])
  assert.equal(turns.get("u2").totals.total, 4)
})

test("a synthetic notice inside a running turn does not split it", () => {
  const turns = buildTurns([
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
    { id: "s1", type: "synthetic" },
    assistant("a2", { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 1)
  assert.equal(turns.has("s1"), false)
  assert.deepEqual(turns.get("u1").messageIds, ["a1", "a2"])
  assert.equal(turns.get("u1").totals.total, 6)
})

test("an orphan synthetic notice owns the assistant usage that follows", () => {
  const turns = buildTurns([
    idle("i0"),
    { id: "s1", type: "synthetic" },
    assistant("a1", { input: 2, output: 3, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 1)
  assert.deepEqual(turns.get("s1").messageIds, ["a1"])
  assert.equal(turns.get("s1").totals.total, 5)
})

test("an orphan compaction owns following usage but not its own cost", () => {
  const turns = buildTurns([
    {
      id: "c1",
      type: "compaction",
      cost: 9,
      tokens: { input: 1000, output: 1000, reasoning: 0, cache: { read: 0, write: 0 } },
    },
    assistant(
      "a1",
      { input: 3, output: 4, reasoning: 0, cache: { read: 0, write: 0 } },
      { cost: 0.002 },
    ),
  ])

  assert.equal(turns.size, 1)
  assert.deepEqual(turns.get("c1").messageIds, ["a1"])
  assert.equal(turns.get("c1").totals.total, 7)
  assert.equal(turns.get("c1").cost, 0.002)
})

test("compaction inside an open turn is only a notice", () => {
  const turns = buildTurns([
    idle("i0"),
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
    {
      id: "c1",
      type: "compaction",
      cost: 9,
      tokens: { input: 1000, output: 1000, reasoning: 0, cache: { read: 0, write: 0 } },
    },
    assistant("a2", { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 1)
  assert.equal(turns.has("c1"), false)
  assert.equal(turns.get("u1").totals.total, 6)
})

test("idle markers close a turn and the next user starts a new one", () => {
  const turns = buildTurns([
    user("u1"),
    assistant(
      "a1",
      { input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
      { created: 1_000, completed: 2_000 },
    ),
    idle("i1", 3_000),
    user("u2"),
    assistant(
      "a2",
      { input: 20, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
      { created: 4_000, completed: 5_000 },
    ),
  ])

  assert.equal(turns.size, 2)
  assert.equal(turns.get("u1").totals.total, 15)
  assert.equal(turns.get("u2").totals.total, 25)
  assert.equal(turns.get("u1").durationMs, 2_000)
  assert.equal(turns.get("u2").durationMs, 1_000)
})

test("a pending queued prompt does not start a turn", () => {
  const messages = [
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
    idle("i1", 2_000),
    user("u2"),
  ]

  const pending = buildTurns(messages, undefined, new Set(["u2"]))
  assert.equal(pending.size, 1)
  assert.equal(pending.has("u2"), false)

  const delivered = buildTurns(messages)
  assert.equal(delivered.size, 2)
  assert.equal(delivered.has("u2"), true)
  assert.equal(delivered.get("u2").totals.total, 0)
})

test("a pending steer stays inside the running turn", () => {
  const turns = buildTurns(
    [
      idle("i0"),
      user("u1"),
      assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
      user("u2"),
    ],
    undefined,
    new Set(["u2"]),
  )

  assert.equal(turns.size, 1)
  assert.equal(turns.has("u2"), false)
  assert.equal(turns.get("u1").totals.total, 2)
  assert.deepEqual(turns.get("u1").userIds, ["u1"])
})

test("a steer's usage is attributed to the turn opener", () => {
  const turns = buildTurns([
    idle("i0"),
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
    { id: "u2", type: "user", delivery: "steer" },
    assistant("a2", { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 1)
  assert.equal(turns.get("u1").totals.total, 6)
  assert.equal(turns.get("u1").requests, 2)
  assert.deepEqual(turns.get("u1").messageIds, ["a1", "a2"])
  assert.deepEqual(turns.get("u1").userIds, ["u1", "u2"])
})

test("summarizeTurns counts an open turn with usage and skips an open zero turn", () => {
  const running = buildTurns([
    user("u1"),
    assistant("a1", { input: 3, output: 2, reasoning: 0, cache: { read: 5, write: 0 } }),
  ])
  const runningSummary = summarizeTurns(running)
  assert.equal(runningSummary.turns, 1)
  assert.equal(runningSummary.totals.total, 10)
  assert.equal(runningSummary.requests, 1)

  const queued = buildTurns([user("u2")])

  const queuedSummary = summarizeTurns(queued)
  assert.equal(queuedSummary.turns, 0)
  assert.equal(queuedSummary.totals.total, 0)
})

test("assistant messages before the first user message are ignored", () => {
  const turns = buildTurns([
    assistant("orphan", { input: 9, output: 9, reasoning: 0, cache: { read: 0, write: 0 } }),
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 1)
  assert.equal(turns.get("u1").totals.total, 2)
})

test("empty requests do not create noise", () => {
  const turns = buildTurns([
    user("u1"),
    assistant("a1", { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }),
    assistant("a2", { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, { cost: 0.01 }),
  ])

  const turn = turns.get("u1")
  assert.equal(turn.requests, 1)
  assert.equal(turn.totals.total, 0)
  assert.equal(turn.cost, 0.01)
})

test("visibleMessages hides the revert boundary and everything after it", () => {
  const messages = [user("u1"), assistant("a1", {}), user("u2"), assistant("a2", {})]

  assert.deepEqual(
    visibleMessages(messages, "u2").map((message) => message.id),
    ["u1", "a1"],
  )
  assert.deepEqual(visibleMessages(messages, null), messages)
  assert.deepEqual(visibleMessages(messages, "missing"), [])
  assert.deepEqual(visibleMessages(null, null), [])
})

test("buildTurns respects the revert boundary", () => {
  const turns = buildTurns(
    [
      user("u1"),
      assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
      user("u2"),
      assistant("a2", { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }),
    ],
    "u2",
  )

  assert.equal(turns.size, 1)
  assert.equal(turns.has("u2"), false)
})

test("summarizeTurns folds every completed turn into one session payload", () => {
  const turns = new Map([
    [
      "u1",
      {
        totals: { input: 100, output: 20, reasoning: 5, cacheRead: 50, cacheWrite: 0, total: 175 },
        cost: 0.0012,
        requests: 3,
        durationMs: 4_000,
      },
    ],
    [
      "u2",
      {
        totals: { input: 40, output: 10, reasoning: 0, cacheRead: 10, cacheWrite: 2, total: 62 },
        cost: 0.0004,
        requests: 2,
        durationMs: 2_000,
      },
    ],
  ])

  const summary = summarizeTurns(turns)

  assert.equal(summary.id, "__session__")
  assert.equal(summary.session, true)
  assert.deepEqual(summary.totals, {
    input: 140,
    output: 30,
    reasoning: 5,
    cacheRead: 60,
    cacheWrite: 2,
    total: 237,
  })
  assert.ok(Math.abs(summary.cost - 0.0016) < 1e-12)
  assert.equal(summary.requests, 5)
  assert.equal(summary.durationMs, 6_000)
  assert.equal(summary.cacheHitRate, (60 / 202) * 100)
  assert.deepEqual(summary.messageIds, [])
  assert.equal(summary.turns, 2)
})

test("summarizeTurns of an empty map is empty", () => {
  const summary = summarizeTurns(new Map())

  assert.deepEqual(summary.totals, {
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0,
  })
  assert.equal(summary.cost, 0)
  assert.equal(summary.requests, 0)
  assert.equal(summary.durationMs, 0)
  assert.equal(summary.cacheHitRate, null)
  assert.equal(summary.turns, 0)
})

test("summarizeTurns ignores turns with no tokens and no cost", () => {
  const turns = new Map([
    [
      "empty",
      {
        totals: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        cost: 0,
        requests: 0,
        durationMs: 9_000,
      },
    ],
    [
      "real",
      {
        totals: { input: 7, output: 1, reasoning: 0, cacheRead: 2, cacheWrite: 0, total: 10 },
        cost: 0.0001,
        requests: 1,
        durationMs: 1_500,
      },
    ],
  ])

  const summary = summarizeTurns(turns)

  assert.equal(summary.turns, 1)
  assert.equal(summary.totals.total, 10)
  assert.equal(summary.requests, 1)
  assert.equal(summary.durationMs, 1_500)
})

test("cacheHitRate uses prompt tokens only", () => {
  assert.equal(cacheHitRate({ input: 100, cacheRead: 100, cacheWrite: 0 }), 50)
  assert.equal(cacheHitRate({ input: 0, cacheRead: 0, cacheWrite: 0 }), null)
  assert.equal(cacheHitRate({ input: 0, cacheRead: 10, cacheWrite: 0 }), 100)
})

test("tokenComposition turns totals into shares that sum to one", () => {
  const parts = tokenComposition({
    input: 100,
    output: 50,
    reasoning: 25,
    cacheRead: 800,
    cacheWrite: 25,
    total: 1000,
  })

  assert.deepEqual(
    parts.map((part) => [part.key, part.value, Number(part.share.toFixed(3))]),
    [
      ["input", 100, 0.1],
      ["output", 50, 0.05],
      ["reasoning", 25, 0.025],
      ["cacheRead", 800, 0.8],
      ["cacheWrite", 25, 0.025],
    ],
  )
  assert.equal(
    parts.reduce((sum, part) => sum + part.share, 0),
    1,
  )
})

test("tokenComposition is safe for empty and negative input", () => {
  assert.deepEqual(
    tokenComposition({ total: 0 }).map((part) => part.share),
    [0, 0, 0, 0, 0],
  )
  assert.deepEqual(
    tokenComposition({ input: -10, total: 5 }).map((part) => part.value),
    [0, 0, 0, 0, 0],
  )
})

test("tokenComposition fills the bar even when totals are inconsistent", () => {
  const parts = tokenComposition({ input: 1, output: 1, total: 100 })

  assert.equal(
    parts.reduce((sum, part) => sum + part.share, 0),
    1,
  )
})

test("sameTotals compares rounded values", () => {
  assert.equal(sameTotals({ total: 1.2, input: 0 }, { total: 1.4, input: 0 }), true)
  assert.equal(sameTotals({ total: 1.2, input: 0 }, { total: 2.4, input: 0 }), false)
})

test("clampNumber keeps options inside safe bounds", () => {
  assert.equal(clampNumber(50, 200, 5000, 500), 200)
  assert.equal(clampNumber(9000, 200, 5000, 500), 5000)
  assert.equal(clampNumber("nope", 200, 5000, 500), 500)
  assert.equal(clampNumber(0, 0, 2000, 550), 0)
})

test("normalizeCurrency resolves explicit and automatic modes", () => {
  assert.equal(normalizeCurrency("CNY", "en-US"), "CNY")
  assert.equal(normalizeCurrency("usd", "zh-CN"), "USD")
  assert.equal(normalizeCurrency("auto", "zh-CN"), "CNY")
  assert.equal(normalizeCurrency("auto", "en-US"), "USD")
  assert.equal(normalizeCurrency(undefined, "en-US"), "CNY")
})

test("normalizePopoverSide defaults to the left gutter", () => {
  assert.equal(normalizePopoverSide("right"), "right")
  assert.equal(normalizePopoverSide("RIGHT"), "right")
  assert.equal(normalizePopoverSide("left"), "left")
  assert.equal(normalizePopoverSide(undefined), "left")
  assert.equal(normalizePopoverSide("nonsense"), "left")
})

test("normalizeRefreshMode exposes the continuous/interval switch", () => {
  assert.equal(normalizeRefreshMode("interval"), "interval")
  assert.equal(normalizeRefreshMode("INTERVAL"), "interval")
  assert.equal(normalizeRefreshMode("continuous"), "continuous")
  assert.equal(normalizeRefreshMode(undefined), "continuous")
  assert.equal(normalizeRefreshMode("nonsense"), "continuous")
})

test("smoothingAlpha is frame-rate independent and bounded", () => {
  assert.equal(smoothingAlpha(0, 250), 0)
  assert.equal(smoothingAlpha(-10, 250), 0)
  assert.ok(Math.abs(smoothingAlpha(250, 250) - (1 - Math.exp(-1))) < 1e-9)
  assert.ok(smoothingAlpha(1000, 250) > 0.98)
  assert.equal(smoothingAlpha(1000, 250), Math.min(1, 1 - Math.exp(-4)))
})

test("approachValue never overshoots and clamps alpha", () => {
  assert.equal(approachValue(0, 100, 0.5), 50)
  assert.equal(approachValue(100, 100, 0.5), 100)
  assert.equal(approachValue(0, 100, 2), 100)
  assert.equal(approachValue(0, 100, -1), 0)
})

test("continuous smoothing keeps moving when the target changes", () => {
  const frame = 1000 / 60
  const alpha = smoothingAlpha(frame, 250)
  let value = 0

  for (let i = 0; i < 6; i += 1) value = approachValue(value, 1000, alpha)
  const beforeChange = value
  const afterChange = approachValue(value, 1500, alpha)

  assert.ok(beforeChange > 0, "the first target should move the value")
  assert.ok(afterChange > beforeChange, "a new target must continue from the current value, not reset")
  assert.ok(afterChange < 1500, "the filter must not jump straight to the new target")

  // A 100 ms data cadence with a 60 Hz display should produce a monotonic rise.
  let display = 0
  let target = 1000
  let previous = -1
  for (let tick = 0; tick < 30; tick += 1) {
    if (tick > 0 && tick % 6 === 0) target += 1000
    display = approachValue(display, target, alpha)
    assert.ok(display >= previous)
    previous = display
  }
})

test("formatters are stable and readable", () => {
  assert.equal(formatInt(1234.6, "en-US"), "1,235")
  assert.equal(formatPercent(39.2157, "en-US"), "39.2%")
  assert.equal(formatPercent(null, "en-US"), "—")

  assert.equal(formatCost(0, "en-US"), "$0")
  assert.equal(formatCost(0.000001, "en-US"), "<$0.00001")
  assert.equal(formatCost(0.00012, "en-US"), "$0.00012")
  assert.equal(formatCost(0.01234, "en-US"), "$0.0123")
  assert.equal(formatCost(1.234, "en-US"), "$1.23")

  assert.equal(formatMoney(0.92376, "CNY", "en-US"), "¥0.924")
  assert.equal(formatMoney(12.345, "CNY", "en-US"), "¥12.35")
  assert.equal(formatMoney(0.1283, "USD", "en-US"), "$0.1283")

  assert.equal(formatDuration(0), "0s")
  assert.equal(formatDuration(65_000), "1m 5s")
  assert.equal(formatDuration(3_600_000), "1h")
  assert.equal(formatDuration(3_661_000), "1h 1m")
})

test("buildTurns handles a long session quickly", () => {
  const messages = []
  for (let turn = 0; turn < 500; turn += 1) {
    messages.push(user(`u${turn}`))
    for (let request = 0; request < 4; request += 1) {
      messages.push(
        assistant(`a${turn}-${request}`, {
          input: 1000,
          output: 100,
          reasoning: 50,
          cache: { read: 5000, write: 0 },
        }),
      )
    }
    messages.push(idle(`i${turn}`))
  }

  const started = performance.now()
  const turns = buildTurns(messages)
  const elapsed = performance.now() - started

  assert.equal(turns.size, 500)
  assert.equal(turns.get("u499").totals.total, 4 * 6150)
  assert.ok(elapsed < 250, `expected <250ms, got ${elapsed.toFixed(1)}ms`)
})
