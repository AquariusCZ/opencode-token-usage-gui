"use strict"

/**
 * Pure data helpers for the token-usage footer.
 *
 * OpenCode stores one usage record per model request in `message.tokens`.
 * Recent builds delimit a turn with idle markers: everything between two idle
 * markers is one turn, starting at the user message that opened it. Steers
 * (`delivery: "steer"`) and queued prompts are inputs inside the running turn.
 * Older transcripts, and the first window of a live session, can predate the
 * first idle; until then every user message is its own turn. Synthetic and
 * compaction notices are not turns themselves, but when one arrives with no
 * open turn it owns the assistant usage that follows it.
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

/** The five token buckets that make up the total, in display order. */
const TOKEN_KEYS = Object.freeze(["input", "output", "reasoning", "cacheRead", "cacheWrite"])

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

/**
 * Frame-rate independent easing factor for a first-order lag filter.
 * alpha = 1 - exp(-dt / tau), so the same tau behaves the same at 30, 60 or
 * 120 Hz. A new target never resets the displayed value; it only changes the
 * point the value is easing toward.
 */
function smoothingAlpha(dtMs, tauMs) {
  const dt = Math.max(0, finite(dtMs))
  const tau = Math.max(1, finite(tauMs))
  return Math.min(1, 1 - Math.exp(-dt / tau))
}

function approachValue(current, target, alpha) {
  const a = Math.min(1, Math.max(0, finite(alpha)))
  return finite(current) + (finite(target) - finite(current)) * a
}

/** "interval" or "continuous" (default). */
function normalizeRefreshMode(value) {
  return String(value || "continuous").toLowerCase() === "interval" ? "interval" : "continuous"
}

/**
 * Resolve the display currency. "auto" follows the UI language: Chinese gets
 * CNY, everything else gets USD (the app's native billing currency).
 */
function normalizeCurrency(value, locale) {
  const code = String(value || "CNY").toUpperCase()
  if (code === "USD") return "USD"
  if (code === "AUTO") {
    return String(locale || "").toLowerCase().startsWith("zh") ? "CNY" : "USD"
  }
  return "CNY"
}

function normalizePopoverSide(value) {
  return String(value || "left").toLowerCase() === "right" ? "right" : "left"
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

/**
 * Fold one ledger snapshot (`SessionInfo.tokens`) into running totals. The
 * session ledger keeps a lifetime billed total, including title, compaction
 * and subagent usage, so it is not the same thing as the loaded transcript.
 */
function addSessionTokens(target, tokens) {
  if (!tokens || typeof tokens !== "object") return
  target.input += finite(tokens.input)
  target.output += finite(tokens.output)
  target.reasoning += finite(tokens.reasoning)
  target.cacheRead += finite(tokens.cache && tokens.cache.read)
  target.cacheWrite += finite(tokens.cache && tokens.cache.write)
  target.total =
    target.input + target.output + target.reasoning + target.cacheRead + target.cacheWrite
}

function cacheHitRate(totals) {
  const prompt = finite(totals && totals.input) + finite(totals && totals.cacheRead) + finite(totals && totals.cacheWrite)
  if (prompt <= 0) return null
  return (finite(totals.cacheRead) / prompt) * 100
}

/**
 * Split the turn total into the five buckets used by the composition bar.
 * Shares always add up to 1 when the total is positive, even if the caller's
 * buckets do not (for example a hand-built object in a test).
 */
function tokenComposition(totals) {
  const values = TOKEN_KEYS.map((key) => Math.max(0, finite(totals && totals[key])))
  const sum = values.reduce((total, value) => total + value, 0)
  const denominator = sum > 0 ? sum : Math.max(0, finite(totals && totals.total))
  return TOKEN_KEYS.map((key, index) => ({
    key,
    value: values[index],
    share: denominator > 0 ? values[index] / denominator : 0,
  }))
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
    userIds: [],
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
 * Split the visible transcript into turns.
 *
 * From the first idle marker onward a turn is idle-delimited: it opens at a
 * user message and closes at the next idle. A user message that arrives while
 * a turn is open is a steer or a delivered queued prompt and belongs to that
 * turn. Before the first idle there is no marker to end a turn, so the legacy
 * rule applies: every non-pending user message starts a new turn. A user
 * message whose id is still pending in the queue has not run yet, so it never
 * opens a turn or joins one.
 *
 * Synthetic and compaction messages are notices. When they arrive with no open
 * turn they open one under their own id, so assistant usage that follows (for
 * example a subagent or background shell result) is still counted. A notice
 * inside an open turn changes nothing. Compaction usage itself stays in the
 * session ledger; only the assistant requests after it are folded in here.
 *
 * @param {Array} messages
 * @param {string} [revertMessageID]
 * @param {Set<string>|string[]} [pendingInputIDs] queued user messages not delivered yet
 * @returns {Map<string, ReturnType<typeof emptyTurn>>} turn id -> aggregate
 */
function buildTurns(messages, revertMessageID, pendingInputIDs) {
  const turns = new Map()
  const pending =
    pendingInputIDs && typeof pendingInputIDs.has === "function"
      ? pendingInputIDs
      : Array.isArray(pendingInputIDs)
        ? new Set(pendingInputIDs)
        : null
  const visible = visibleMessages(messages, revertMessageID)

  // Precompute the first idle so the loop can pick the boundary rule per
  // message. A window with no idle at all stays in legacy mode throughout.
  let firstIdle = -1
  for (let index = 0; index < visible.length; index += 1) {
    const message = visible[index]
    if (message && typeof message === "object" && message.type === "idle") {
      firstIdle = index
      break
    }
  }

  let current = null

  const openTurn = (id) => {
    current = id
    let turn = turns.get(id)
    if (!turn) {
      turn = emptyTurn(id)
      turns.set(id, turn)
    }
    if (id && !turn.userIds.includes(id)) turn.userIds.push(id)
    return turn
  }

  for (let index = 0; index < visible.length; index += 1) {
    const message = visible[index]
    if (!message || typeof message !== "object") continue

    if (message.type === "idle") {
      if (!current) continue
      const turn = turns.get(current)
      if (turn) {
        const created = finite(message.time && message.time.created)
        if (created > 0 && created > turn.endedAt) turn.endedAt = created
      }
      current = null
      continue
    }

    if (message.type === "system") continue

    const idleMode = firstIdle !== -1 && index > firstIdle

    if (message.type === "synthetic" || message.type === "compaction") {
      // A notice only starts a turn when nothing is open; inside a turn it
      // stays a notice. This captures orphan subagent/background usage
      // without splitting a turn that is still running.
      if (!current) openTurn(message.id)
      continue
    }

    if (message.type === "user") {
      if (pending && message.id && pending.has(message.id)) continue
      if (idleMode && current) {
        const turn = turns.get(current)
        if (turn && message.id && !turn.userIds.includes(message.id)) {
          turn.userIds.push(message.id)
        }
        continue
      }
      openTurn(message.id)
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

/**
 * Fold every turn into one session payload. Turns with no tokens and no cost
 * (a queued prompt that has not run, an empty steer or a failed request) are
 * ignored, so an open turn still counts once it has usage.
 */
function summarizeTurns(turns) {
  const totals = emptyTotals()
  let cost = 0
  let requests = 0
  let durationMs = 0
  let count = 0
  if (turns && typeof turns.values === "function") {
    for (const turn of turns.values()) {
      if (!turn || !turn.totals) continue
      if (turn.totals.total <= 0 && turn.cost <= 0) continue
      addUsage(totals, turn.totals)
      cost += finite(turn.cost)
      requests += finite(turn.requests)
      durationMs += Math.max(0, finite(turn.durationMs))
      count += 1
    }
  }
  return {
    id: "__session__",
    session: true,
    totals,
    cost,
    requests,
    durationMs,
    cacheHitRate: cacheHitRate(totals),
    messageIds: [],
    turns: count,
  }
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
  TOKEN_KEYS,
  addSessionTokens,
  addUsage,
  approachValue,
  buildTurns,
  cacheHitRate,
  clampNumber,
  emptyTotals,
  finite,
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
}
