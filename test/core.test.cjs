"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")

const {
  buildTurns,
  cacheHitRate,
  formatCost,
  formatDuration,
  formatInt,
  formatMoney,
  formatPercent,
  sameTotals,
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

test("synthetic messages and steer messages start a new turn", () => {
  const turns = buildTurns([
    user("u1"),
    assistant("a1", { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }),
    { id: "s1", type: "synthetic" },
    assistant("a2", { input: 2, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }),
  ])

  assert.equal(turns.size, 2)
  assert.equal(turns.get("u1").totals.total, 2)
  assert.equal(turns.get("s1").totals.total, 4)
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

test("cacheHitRate uses prompt tokens only", () => {
  assert.equal(cacheHitRate({ input: 100, cacheRead: 100, cacheWrite: 0 }), 50)
  assert.equal(cacheHitRate({ input: 0, cacheRead: 0, cacheWrite: 0 }), null)
  assert.equal(cacheHitRate({ input: 0, cacheRead: 10, cacheWrite: 0 }), 100)
})

test("sameTotals compares rounded values", () => {
  assert.equal(sameTotals({ total: 1.2, input: 0 }, { total: 1.4, input: 0 }), true)
  assert.equal(sameTotals({ total: 1.2, input: 0 }, { total: 2.4, input: 0 }), false)
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
  }

  const started = performance.now()
  const turns = buildTurns(messages)
  const elapsed = performance.now() - started

  assert.equal(turns.size, 500)
  assert.equal(turns.get("u499").totals.total, 4 * 6150)
  assert.ok(elapsed < 250, `expected <250ms, got ${elapsed.toFixed(1)}ms`)
})
