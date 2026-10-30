"use strict"

/**
 * Pure data helpers for the token-usage footer.
 *
 * OpenCode stores one usage record per model request in `message.tokens`.
 * A visible "turn" starts at a user (or synthetic) message and contains one
 * or more assistant messages while the agent loops through tool calls.
 *
 * Total follows OpenCode's own definition:
 *   input + output + reasoning + cache.read + cache.write
 * It is the same number the desktop context button and the TUI use.
 */

const METRICS = Object.freeze([
  "input",
  "output",
  "reasoning",
  "cacheRead",
  "cacheWrite",
  "total",
])

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function emptyTotals() {
  return {
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0,
  }
}

function tokenUsage(message) {
  const tokens = message && message.tokens
  if (!tokens || typeof tokens !== "object") return null

  const input = finite(tokens.input)
  const output = finite(tokens.output)
  const reasoning = finite(tokens.reasoning)
  const cacheRead = finite(tokens.cache && tokens.cache.read)
  const cacheWrite = finite(tokens.cache && tokens.cache.write)

  return {
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    total: input + output + reasoning + cacheRead + cacheWrite,
  }
}

function addUsage(target, usage) {
  target.input += usage.input
  target.output += usage.output
  target.reasoning += usage.reasoning
  target.cacheRead += usage.cacheRead
  target.cacheWrite += usage.cacheWrite
  target.total =
    target.input + target.output + target.reasoning + target.cacheRead + target.cacheWrite
}

function cacheHitRate(totals) {
  const prompt = finite(totals && totals.input) + finite(totals && totals.cacheRead) + finite(totals && totals.cacheWrite)
  if (prompt <= 0) return null
  return (finite(totals.cacheRead) / prompt) * 100
}

function emptyTurn(id) {
  return {
    id,
    totals: emptyTotals(),
    cost: 0,
    requests: 0,
    startedAt: 0,
    endedAt: 0,
    durationMs: 0,
    cacheHitRate: null,
    messageIds: [],
  }
}

/**
 * Drop the messages hidden by an undo/revert boundary. OpenCode hides the
 * boundary message and everything after it, so token totals must do the same.
 * If a boundary is set but not found (messages still loading), return an empty
 * list rather than showing stale numbers.
 */
function visibleMessages(messages, revertMessageID) {
  if (!Array.isArray(messages)) return []
  if (!revertMessageID) return messages
  const boundary = messages.findIndex((message) => message && message.id === revertMessageID)
  if (boundary === -1) return []
  return messages.slice(0, boundary)
}

/**
 * @returns {Map<string, ReturnType<typeof emptyTurn>>} turn id -> aggregate
 */
function buildTurns(messages, revertMessageID) {
  const turns = new Map()
  let current = null

  for (const message of visibleMessages(messages, revertMessageID)) {
    if (!message || typeof message !== "object") continue

    if (message.type === "user" || message.type === "synthetic") {
      current = message.id
      if (!turns.has(current)) turns.set(current, emptyTurn(current))
      continue
    }

    if (message.type !== "assistant" || !current) continue

    const usage = tokenUsage(message)
    if (!usage) continue

    const cost = finite(message.cost)
    if (usage.total <= 0 && cost <= 0) continue

    const turn = turns.get(current)
    if (!turn) continue

    addUsage(turn.totals, usage)
    turn.cost += cost
    turn.requests += 1
    if (message.id) turn.messageIds.push(message.id)

    const created = finite(message.time && message.time.created)
    const completed =
      finite(message.time && message.time.completed) ||
      finite(message.time && message.time.updated) ||
      created
    if (created > 0) {
      if (turn.startedAt === 0 || created < turn.startedAt) turn.startedAt = created
      if (completed > turn.endedAt) turn.endedAt = completed
    }
  }

  for (const turn of turns.values()) {
    turn.cacheHitRate = cacheHitRate(turn.totals)
    turn.durationMs =
      turn.startedAt > 0 && turn.endedAt >= turn.startedAt ? turn.endedAt - turn.startedAt : 0
  }

  return turns
}

function sameTotals(a, b) {
  return METRICS.every((key) => Math.round(finite(a && a[key])) === Math.round(finite(b && b[key])))
}

function formatInt(value, locale) {
  return new Intl.NumberFormat(locale || "en-US", { maximumFractionDigits: 0 }).format(
    Math.round(finite(value)),
  )
}

function formatCost(value, locale) {
  const amount = Math.max(0, finite(value))
  if (amount === 0) return "$0"
  if (amount < 0.000005) return "<$0.00001"
  const digits = amount < 0.001 ? 5 : amount < 1 ? 4 : 2
  const text = new Intl.NumberFormat(locale || "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
  return `$${text}`
}

function formatMoney(value, currency, locale) {
  const amount = Math.max(0, finite(value))
  const code = String(currency || "CNY").toUpperCase()
  if (code === "USD") return formatCost(amount, locale)
  if (amount === 0) return "¥0"
  if (amount < 0.00005) return "<¥0.0001"
  const digits = amount < 0.01 ? 4 : amount < 1 ? 3 : 2
  const text = new Intl.NumberFormat(locale || "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
  return `¥${text}`
}

function formatPercent(value, locale) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—"
  return new Intl.NumberFormat(locale || "en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value) / 100)
}

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.round(finite(milliseconds) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes < 60) return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes > 0 ? `${hours}h ${restMinutes}m` : `${hours}h`
}

module.exports = {
  METRICS,
  addUsage,
  buildTurns,
  cacheHitRate,
  emptyTotals,
  finite,
  formatCost,
  formatDuration,
  formatInt,
  formatMoney,
  formatPercent,
  sameTotals,
  tokenUsage,
  visibleMessages,
}
