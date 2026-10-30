"use strict"

const { Plugin, Style } = require("@opencode/plugin/gui")
const {
  METRICS,
  buildTurns,
  cacheHitRate,
  finite,
  formatCost,
  formatDuration,
  formatMoney,
  sameTotals,
} = require("./core.cjs")

const FOOTER_ATTR = "data-token-usage"
const STYLE_ID = "opencode-token-usage-gui-style"
const GUARD_KEY = "__OPENCODE_TOKEN_USAGE_GUI__"
const REFRESH_MS = 500
const MUTATION_DELAY_MS = 120
const TWEEN_MS = 550

const COPY = {
  en: {
    turn: "This turn",
    input: "Input",
    output: "Output",
    reasoning: "Reasoning",
    cacheRead: "Cache read",
    cacheWrite: "Cache write",
    cacheHit: "Cache hit",
    total: "Total",
    tokens: "tokens",
    requests: "model requests",
  },
  zh: {
    turn: "本轮",
    input: "输入",
    output: "输出",
    reasoning: "推理",
    cacheRead: "缓存读",
    cacheWrite: "缓存写",
    cacheHit: "缓存命中",
    total: "合计",
    tokens: "词元",
    requests: "次模型请求",
  },
}

const CSS = `
[${FOOTER_ATTR}] {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 6px;
  row-gap: 2px;
  width: 100%;
  margin: 8px 0 2px;
  padding: 2px 0 8px;
  color: var(--v2-text-text-muted, #a3a3a3);
  font-size: 12px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  user-select: text;
  -webkit-user-select: text;
}
[${FOOTER_ATTR}] .tu-label {
  color: var(--v2-text-text-faint, #8a8a8a);
  font-size: 11px;
  letter-spacing: 0.02em;
}
[${FOOTER_ATTR}] .tu-item {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  white-space: nowrap;
}
[${FOOTER_ATTR}] .tu-key {
  color: var(--v2-text-text-faint, #8a8a8a);
  font-size: 11px;
}
[${FOOTER_ATTR}] .tu-val {
  color: var(--v2-text-text-muted, #a3a3a3);
}
[${FOOTER_ATTR}] .tu-sep {
  color: var(--v2-text-text-faint, #8a8a8a);
  opacity: 0.45;
  user-select: none;
}
[${FOOTER_ATTR}] .tu-total .tu-val {
  color: var(--v2-text-text-base, #d4d4d4);
  font-weight: 500;
}
[${FOOTER_ATTR}] .tu-cost {
  color: var(--v2-text-text-base, #d4d4d4);
  font-weight: 500;
}
[${FOOTER_ATTR}] [hidden] {
  display: none !important;
}
`

function pickLocale(ctx) {
  try {
    const value = ctx.locale && typeof ctx.locale.locale === "function" ? ctx.locale.locale() : ""
    if (value) return String(value).toLowerCase()
  } catch {}
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language.toLowerCase()
  return "en"
}

function reducedMotion() {
  try {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  } catch {
    return false
  }
}

function isVisible(element) {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  return getComputedStyle(element).visibility !== "hidden"
}

function area(element) {
  const rect = element.getBoundingClientRect()
  return rect.width * rect.height
}

function inViewport(element) {
  const rect = element.getBoundingClientRect()
  return rect.bottom > -120 && rect.top < (window.innerHeight || 0) + 120
}

function findScroll() {
  const candidates = Array.from(
    document.querySelectorAll('[data-slot="session-timeline-scroll"]'),
  ).filter(isVisible)
  if (candidates.length === 0) return null
  return candidates.reduce((best, item) => (area(item) > area(best) ? item : best), candidates[0])
}

/**
 * The timeline row attribute is an implementation detail. Prefer explicit
 * assistant-part rows, then fall back to the assistant content container.
 */
function collectRows(scroll) {
  const primary = Array.from(
    scroll.querySelectorAll('[data-timeline-row="AssistantPart"][data-message-id]'),
  )
  if (primary.length > 0) return primary

  const rows = []
  for (const content of scroll.querySelectorAll('[data-slot="session-turn-assistant-content"]')) {
    const row = content.closest("[data-message-id]")
    if (row) rows.push(row)
  }
  return rows
}

function contentTarget(row) {
  return (
    row.closest('[data-slot="session-turn-assistant-content"]') ||
    row.querySelector('[data-slot="session-turn-assistant-content"]') ||
    row.closest('[data-slot="session-turn-message-container"]') ||
    row.querySelector('[data-slot="session-turn-message-content"]') ||
    row
  )
}

function setText(node, text) {
  if (node.firstChild && node.firstChild.nodeType === 3 && node.childNodes.length === 1) {
    if (node.firstChild.nodeValue !== text) node.firstChild.nodeValue = text
    return
  }
  node.textContent = text
}

function separator() {
  const node = document.createElement("span")
  node.className = "tu-sep"
  node.setAttribute("aria-hidden", "true")
  node.textContent = "·"
  return node
}

function createFooter(turn, view) {
  const root = document.createElement("div")
  root.setAttribute(FOOTER_ATTR, "")
  root.setAttribute("role", "note")
  root.setAttribute("aria-live", "off")

  const values = {}
  const label = document.createElement("span")
  label.className = "tu-label"
  label.textContent = view.copy.turn
  root.append(label)

  const item = (key, text, className) => {
    root.append(separator())
    const wrap = document.createElement("span")
    wrap.className = className ? `tu-item ${className}` : "tu-item"
    const name = document.createElement("span")
    name.className = "tu-key"
    name.textContent = text
    const value = document.createElement("span")
    value.className = "tu-val"
    wrap.append(name, value)
    root.append(wrap)
    values[key] = value
    return wrap
  }

  item("input", view.copy.input)
  item("output", view.copy.output)

  if (!view.compact) {
    if (view.detailed) item("reasoning", view.copy.reasoning)
    item("cacheRead", view.copy.cacheRead)
    if (view.detailed) item("cacheWrite", view.copy.cacheWrite)
    item("cacheHit", view.copy.cacheHit)
  }

  item("total", view.copy.total, "tu-total")

  let costEl = null
  if (view.showCost) {
    root.append(separator())
    costEl = document.createElement("span")
    costEl.className = "tu-item tu-cost"
    root.append(costEl)
  }

  return { root, values, costEl }
}

function paint(entry, view) {
  for (const key of METRICS) {
    const value = entry.values[key]
    if (value) setText(value, view.int(entry.current[key]))
  }

  const hit = cacheHitRate(entry.current)
  if (entry.values.cacheHit) {
    setText(entry.values.cacheHit, view.percent(hit))
    entry.values.cacheHit.parentElement.hidden = hit === null
  }
  if (entry.values.cacheWrite) {
    entry.values.cacheWrite.parentElement.hidden = finite(entry.current.cacheWrite) <= 0
  }
}

function updateDetail(entry, turn, view) {
  const copy = view.copy
  const original = formatCost(turn.cost, view.locale)
  const shown = view.money(turn.cost)
  const cost =
    view.showCost && turn.cost > 0
      ? ` · ${shown}${view.currency === "CNY" ? ` (${original})` : ""}`
      : ""
  const lines = [
    `${copy.turn} ${view.int(turn.totals.total)} ${copy.tokens}${cost}`,
    `${copy.input} ${view.int(turn.totals.input)} · ${copy.output} ${view.int(turn.totals.output)} · ${copy.reasoning} ${view.int(turn.totals.reasoning)}`,
    `${copy.cacheRead} ${view.int(turn.totals.cacheRead)} · ${copy.cacheWrite} ${view.int(turn.totals.cacheWrite)} · ${copy.cacheHit} ${view.percent(turn.cacheHitRate)}`,
    `${view.int(turn.requests)} ${copy.requests}${turn.durationMs > 0 ? ` · ${formatDuration(turn.durationMs)}` : ""}`,
  ]
  entry.root.title = lines.join("\n")

  if (entry.costEl) {
    setText(entry.costEl, shown)
    entry.costEl.hidden = turn.cost <= 0
  }
}

function applyTurn(entry, turn, view, animate) {
  const changed = !sameTotals(entry.target, turn.totals)
  entry.turn = turn
  updateDetail(entry, turn, view)
  if (!changed) return

  const next = { ...turn.totals }
  if (!animate || !inViewport(entry.root) || next.total < entry.current.total) {
    entry.current = { ...next }
    entry.from = { ...next }
    entry.target = { ...next }
    entry.startedAt = 0
    paint(entry, view)
    return
  }

  entry.from = { ...entry.current }
  entry.target = next
  entry.startedAt = performance.now()
  view.ensureAnimation()
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return document.getElementById(STYLE_ID)
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
  return style
}

module.exports = Plugin.define({
  setup(ctx) {
    const locale = pickLocale(ctx)
    const copy = locale.startsWith("zh") ? COPY.zh : COPY.en
    const options = ctx.options || {}
    const compact = options.compact === true
    const detailed = options.detailed === true
    const showCost = options.showCost !== false
    const animate = options.animate !== false && !reducedMotion()
    const currency = String(options.currency || "CNY").toUpperCase() === "USD" ? "USD" : "CNY"
    const usdToCny = finite(options.usdToCny) > 0 ? finite(options.usdToCny) : 6.68
    const intFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
    const pctFmt = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })

    const view = {
      locale,
      copy,
      compact,
      detailed,
      showCost,
      currency,
      money: (usd) =>
        formatMoney(
          finite(usd) * (currency === "CNY" ? usdToCny : 1),
          currency,
          locale,
        ),
      int: (value) => intFmt.format(Math.round(finite(value))),
      percent: (value) =>
        value === null || value === undefined || !Number.isFinite(Number(value))
          ? "—"
          : pctFmt.format(Number(value) / 100),
      ensureAnimation: () => {
        if (animate && frame === undefined) frame = requestAnimationFrame(tick)
      },
    }

    let styleNode = null
    if (Style) {
      try {
        ctx.add(Style, CSS)
      } catch {
        styleNode = installStyle()
      }
    } else {
      styleNode = installStyle()
    }

    const state = new Map()
    let timer
    let frame
    let mutationTimer
    let observedScroll = null
    let warned = false

    const warn = (error) => {
      if (warned) return
      warned = true
      console.warn("[token-usage-gui] could not update the footer; the app DOM may have changed", error)
    }

    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            if (mutationTimer) return
            mutationTimer = setTimeout(() => {
              mutationTimer = undefined
              refresh()
            }, MUTATION_DELAY_MS)
          })
        : null

    const observe = (scroll) => {
      if (!observer || observedScroll === scroll) return
      observer.disconnect()
      observedScroll = scroll
      observer.observe(scroll, { childList: true, subtree: true })
    }

    const tick = (now) => {
      let active = false
      for (const entry of state.values()) {
        if (!entry.startedAt) continue
        const progress = Math.min(1, (now - entry.startedAt) / TWEEN_MS)
        const eased = 1 - Math.pow(1 - progress, 3)
        for (const key of METRICS) {
          entry.current[key] = entry.from[key] + (entry.target[key] - entry.from[key]) * eased
        }
        paint(entry, view)
        if (progress < 1) active = true
        else {
          entry.current = { ...entry.target }
          entry.startedAt = 0
          paint(entry, view)
        }
      }
      frame = active ? requestAnimationFrame(tick) : undefined
    }

    const sync = () => {
      const session = ctx.sessions.current()
      if (!session || !session.id) return

      const data = session.server && session.server.data
      const messagesApi = data && data.session && data.session.message
      if (!messagesApi || typeof messagesApi.list !== "function") return

      const messages = messagesApi.list(session.id)
      if (!Array.isArray(messages) || messages.length === 0) return

      const info = data.session.get && data.session.get(session.id)
      const turns = buildTurns(messages, info && info.revert && info.revert.messageID)
      if (turns.size === 0) return

      const byMessage = new Map()
      for (const [turnId, turn] of turns) {
        for (const messageId of turn.messageIds) byMessage.set(messageId, turnId)
      }

      const scroll = findScroll()
      if (!scroll) return
      observe(scroll)

      const rows = collectRows(scroll)
      if (rows.length === 0) return

      const chosen = new Map()
      for (const row of rows) {
        const id = row.getAttribute("data-message-id")
        if (!id) continue
        const turnId = turns.has(id) ? id : byMessage.get(id)
        if (!turnId) continue
        const turn = turns.get(turnId)
        if (!turn || turn.totals.total <= 0) continue
        chosen.set(turnId, row)
      }

      const seen = new Set()
      for (const [turnId, row] of chosen) {
        const turn = turns.get(turnId)
        const key = `${session.id}:${turnId}`
        seen.add(key)

        let entry = state.get(key)
        if (!entry) {
          const footer = createFooter(turn, view)
          entry = {
            ...footer,
            turn,
            target: { ...turn.totals },
            current: { ...turn.totals },
            from: { ...turn.totals },
            startedAt: 0,
            targetEl: null,
          }
          state.set(key, entry)
          paint(entry, view)
          updateDetail(entry, turn, view)
        } else {
          applyTurn(entry, turn, view, animate)
        }

        const target = contentTarget(row)
        if (
          entry.targetEl !== target ||
          !entry.root.isConnected ||
          entry.root.parentElement !== target
        ) {
          target.appendChild(entry.root)
          entry.targetEl = target
        }
      }

      for (const [key, entry] of state) {
        if (seen.has(key)) continue
        if (!key.startsWith(`${session.id}:`) || !entry.root.isConnected) {
          entry.root.remove()
          state.delete(key)
        }
      }
    }

    const refresh = () => {
      try {
        sync()
      } catch (error) {
        warn(error)
      }
    }

    const cleanup = () => {
      clearInterval(timer)
      if (mutationTimer) clearTimeout(mutationTimer)
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (observer) observer.disconnect()
      for (const entry of state.values()) entry.root.remove()
      state.clear()
      if (styleNode) styleNode.remove()
      if (window[GUARD_KEY] && window[GUARD_KEY].cleanup === cleanup) delete window[GUARD_KEY]
    }

    const previous = window[GUARD_KEY]
    if (previous && typeof previous.cleanup === "function" && previous.cleanup !== cleanup) {
      try {
        previous.cleanup()
      } catch {}
    }
    window[GUARD_KEY] = { cleanup }

    refresh()
    timer = setInterval(refresh, REFRESH_MS)

    return cleanup
  },
})
