"use strict"

const { Plugin, Style } = require("@opencode/plugin/gui")
const {
  METRICS,
  approachValue,
  buildTurns,
  cacheHitRate,
  clampNumber,
  finite,
  formatMoney,
  normalizeCurrency,
  normalizePopoverSide,
  normalizeRefreshMode,
  sameTotals,
  smoothingAlpha,
} = require("./core.cjs")
const {
  CSS,
  bindTooltip,
  createFooter,
  updateFooter,
} = require("./footer.cjs")

const STYLE_ID = "opencode-token-usage-gui-style"
const GUARD_KEY = "__OPENCODE_TOKEN_USAGE_GUI__"
const DEFAULT_REFRESH_MS = 500
const MIN_REFRESH_MS = 16
const MAX_REFRESH_MS = 5000
const DEFAULT_TWEEN_MS = 550
const MAX_TWEEN_MS = 2000
const DEFAULT_SAMPLE_MS = 100
const MIN_SAMPLE_MS = 50
const MAX_SAMPLE_MS = 1000
const DEFAULT_SMOOTH_MS = 250
const MIN_SMOOTH_MS = 50
const MAX_SMOOTH_MS = 2000
const IDLE_SAMPLE_MS = 1000
const MUTATION_DELAY_MS = 120
const DEFAULT_USD_TO_CNY = 6.68
const FX_CACHE_KEY = "opencode-token-usage-gui:fx"
const FX_URL = "https://open.er-api.com/v6/latest/USD"
const FX_TTL_MS = 24 * 60 * 60 * 1000
const FX_TIMEOUT_MS = 8000

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
    rate: "Exchange rate",
    rateManual: "manual",
    rateAuto: "auto",
    rateFallback: "fallback",
    breakdown: "Turn breakdown",
    composition: "Token composition",
    showDetails: "Show token breakdown",
    hideDetails: "Hide token breakdown",
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
    tokens: "tokens",
    requests: "次模型请求",
    rate: "汇率",
    rateManual: "手动",
    rateAuto: "自动",
    rateFallback: "兜底",
    breakdown: "本轮明细",
    composition: "tokens 构成",
    showDetails: "查看用量明细",
    hideDetails: "收起用量明细",
  },
}

function pickLocale(ctx) {
  try {
    const value = ctx.locale && typeof ctx.locale.locale === "function" ? ctx.locale.locale() : ""
    if (value) return String(value).toLowerCase().replace(/_/g, "-")
  } catch {}
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().replace(/_/g, "-")
  }
  return "en"
}

function readFxCache() {
  try {
    if (typeof localStorage === "undefined") return null
    const raw = localStorage.getItem(FX_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const rate = Number(parsed && parsed.rate)
    if (!Number.isFinite(rate) || rate <= 0) return null
    return { rate, at: Number(parsed && parsed.at) || 0 }
  } catch {
    return null
  }
}

function writeFxCache(value) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FX_CACHE_KEY, JSON.stringify(value))
    }
  } catch {}
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

/**
 * Several composer faces can be mounted at once (permission or subagent
 * panels); pick the visible one with the largest box, like findScroll does.
 * Scope the search to the active session pane so a larger secondary or
 * permission composer cannot win over the pane that is actually on screen.
 */
function findComposerFace(scroll) {
  const panel = scroll && scroll.closest ? scroll.closest('[data-slot="session-chat-panel"]') : null
  const scope = panel || document
  let faces = Array.from(scope.querySelectorAll('[data-slot="composer-face"]')).filter(isVisible)
  if (faces.length === 0 && scope !== document) {
    faces = Array.from(document.querySelectorAll('[data-slot="composer-face"]')).filter(isVisible)
  }
  if (faces.length === 0) return null
  return faces.reduce((best, item) => (area(item) > area(best) ? item : best), faces[0])
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

function paint(entry, view) {
  for (const key of METRICS) {
    const value = entry.values[key]
    if (value) setText(value, view.int(entry.current[key]))
  }

  const hit = cacheHitRate(entry.current)
  if (entry.values.cacheHit) {
    setText(entry.values.cacheHit, view.percent(hit))
    entry.groups.cacheHit.hidden = hit === null
  }
  if (entry.values.cacheWrite) {
    entry.groups.cacheWrite.hidden = finite(entry.current.cacheWrite) <= 0
  }
}

function applyTurn(entry, turn, view, animate) {
  const changed = !sameTotals(entry.target, turn.totals)
  entry.turn = turn
  updateFooter(entry, turn, view)
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

  if (view.continuous) {
    // Continuous mode keeps the current value and only moves the target.
    // The 60 Hz filter in tick() eases toward it; a new sample never resets
    // the animation, so the counter reads as one continuous motion.
    entry.target = next
    view.ensureAnimation()
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
    // A malformed or unsupported hint (for example "zh_CN-x") makes Intl throw;
    // resolve once and fall back to en-US so formatting never breaks.
    const resolvedLocale = (() => {
      try {
        return new Intl.NumberFormat(locale).resolvedOptions().locale
      } catch {
        return "en-US"
      }
    })()
    const options = ctx.options || {}
    const compact = options.compact === true
    const detailed = options.detailed === true
    const showCost = options.showCost !== false
    const refreshMode = normalizeRefreshMode(options.refreshMode)
    const continuous = refreshMode === "continuous"
    const refreshMs = clampNumber(options.refreshMs, MIN_REFRESH_MS, MAX_REFRESH_MS, DEFAULT_REFRESH_MS)
    const tweenMs = clampNumber(options.tweenMs, 0, MAX_TWEEN_MS, DEFAULT_TWEEN_MS)
    const sampleMs = clampNumber(options.sampleMs, MIN_SAMPLE_MS, MAX_SAMPLE_MS, DEFAULT_SAMPLE_MS)
    const smoothMs = clampNumber(options.smoothMs, MIN_SMOOTH_MS, MAX_SMOOTH_MS, DEFAULT_SMOOTH_MS)
    const animate = options.animate !== false && !reducedMotion() && (continuous || tweenMs > 0)
    const currency = normalizeCurrency(options.currency, locale)
    const popoverSide = normalizePopoverSide(options.popoverSide)
    const autoRate = String(options.usdToCny).toLowerCase() === "auto"
    const manualRate = finite(options.usdToCny) > 0 ? finite(options.usdToCny) : DEFAULT_USD_TO_CNY
    const rate = { value: manualRate, at: 0, source: "manual" }
    const intFmt = new Intl.NumberFormat(resolvedLocale, { maximumFractionDigits: 0 })
    const pctFmt = new Intl.NumberFormat(resolvedLocale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })

    const view = {
      locale: resolvedLocale,
      copy,
      compact,
      detailed,
      showCost,
      continuous,
      currency,
      popoverSide,
      money: (usd) =>
        formatMoney(
          finite(usd) * (currency === "CNY" ? rate.value : 1),
          currency,
          resolvedLocale,
        ),
      rateLine: () => {
        if (currency !== "CNY" || !(rate.value > 0)) return ""
        let source = copy.rateManual
        if (rate.source === "auto") {
          source = copy.rateAuto
          if (rate.at > 0) {
            const date = new Date(rate.at)
            const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
              date.getDate(),
            ).padStart(2, "0")}`
            source += ` (${stamp})`
          }
        } else if (rate.source === "fallback") {
          source = copy.rateFallback
        }
        return `${copy.rate} ${rate.value.toFixed(2)} · ${source}`
      },
      int: (value) => intFmt.format(Math.round(finite(value))),
      percent: (value) =>
        value === null || value === undefined || !Number.isFinite(Number(value))
          ? "—"
          : pctFmt.format(Number(value) / 100),
      ensureAnimation: () => {
        if (animate && frame === undefined) {
          lastFrame = 0
          frame = requestAnimationFrame(tick)
        }
      },
    }

    // Tear down the previous instance first: it may still own (and remove) the
    // <style> node that installStyle() is about to reuse.
    const previous = window[GUARD_KEY]
    if (previous && typeof previous.cleanup === "function") {
      try {
        previous.cleanup()
      } catch {}
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
    let sampleTimer
    let frame
    let lastFrame = 0
    let mutationTimer
    let observedScroll = null
    let warned = false
    let disposed = false
    let cleaned = false

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

    /**
     * The active turn's capsule lives in the composer dock as the first flow
     * child of the z-70 column: above the queued-message panel and the
     * composer morph. The queue panel's negative margin tucks it under the
     * composer card, not over the capsule, and a morph flight (data-moving +
     * overflow-clip) cannot clip a node outside the morph. The app's composer
     * pills (subagents, Goal, todos) are an absolute z-70 layer above the
     * input; a capsule inside the timeline is painted under them and masked
     * by the bottom fade. A flow child in the dock is measured with the dock,
     * so the timeline inset follows. Older builds without a composer face
     * fall back to the timeline tail.
     */
    const ensureLiveHost = (scroll) => {
      const face = findComposerFace(scroll)
      const morph = face && face.parentElement
      const column = morph && morph.parentElement
      const dock = column && column.closest('[data-component="session-composer-dock"]')
      if (
        face &&
        morph &&
        morph.matches &&
        morph.matches('[data-slot="composer-morph"]') &&
        column &&
        dock
      ) {
        let host = column.querySelector(":scope > [data-token-usage-live]")
        if (!host) {
          host = document.createElement("div")
          host.className = "tu-live-dock"
          host.setAttribute("data-token-usage-live", "")
        }
        if (column.firstElementChild !== host) column.prepend(host)
        return host
      }

      const spacer = scroll.querySelector('[data-timeline-row="bottom-spacer"]')
      if (!spacer) return null
      let lane = spacer.querySelector(":scope > [data-token-usage-live]")
      if (!lane) {
        lane = document.createElement("div")
        lane.className = "tu-live-lane"
        lane.setAttribute("data-token-usage-live", "")
        spacer.append(lane)
      }
      return lane
    }

    const tick = (now) => {
      if (continuous) {
        const dt = lastFrame ? Math.max(0, now - lastFrame) : 16.67
        lastFrame = now
        const alpha = smoothingAlpha(dt, smoothMs)
        let active = false

        for (const entry of state.values()) {
          let done = true
          for (const key of METRICS) {
            const target = entry.target[key]
            if (Math.abs(target - entry.current[key]) < 0.5) {
              entry.current[key] = target
            } else {
              entry.current[key] = approachValue(entry.current[key], target, alpha)
              done = false
            }
          }
          paint(entry, view)
          if (!done) active = true
        }

        frame = active ? requestAnimationFrame(tick) : undefined
        if (!active) lastFrame = 0
        return
      }

      let active = false
      for (const entry of state.values()) {
        if (!entry.startedAt) continue
        const progress = Math.min(1, (now - entry.startedAt) / tweenMs)
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
      const seen = new Set()
      let sessionId = null
      let known = null
      let running = false
      let activeTurnId = null
      try {
        const session = ctx.sessions.current()
        if (!session || !session.id) return
        sessionId = session.id

        const data = session.server && session.server.data
        const messagesApi = data && data.session && data.session.message
        if (!messagesApi || typeof messagesApi.list !== "function") return

        const messages = messagesApi.list(session.id)
        if (!Array.isArray(messages) || messages.length === 0) return

        const info = data.session.get && data.session.get(session.id)
        const turns = buildTurns(messages, info && info.revert && info.revert.messageID)
        if (turns.size === 0) return

        const scroll = findScroll()
        if (!scroll) return
        observe(scroll)

        const statusApi = data.session && data.session.status
        running = false
        if (typeof statusApi === "function") {
          try {
            running = statusApi.call(data.session, session.id) === "running"
          } catch {}
        }
        const turnIds = Array.from(turns.keys())
        activeTurnId = running ? turnIds[turnIds.length - 1] : null
        const liveHost = running ? ensureLiveHost(scroll) : null

        const byMessage = new Map()
        known = new Set(turns.keys())
        for (const [turnId, turn] of turns) {
          for (const messageId of turn.messageIds) {
            byMessage.set(messageId, turnId)
            known.add(messageId)
          }
        }

        const rows = collectRows(scroll)
        if (rows.length === 0 && !running) return

        const chosen = new Map()
        for (const row of rows) {
          const id = row.getAttribute("data-message-id")
          if (!id) continue
          const turnId = turns.has(id) ? id : byMessage.get(id)
          if (!turnId) continue
          const turn = turns.get(turnId)
          if (!turn || (turn.totals.total <= 0 && turn.cost <= 0)) continue
          chosen.set(turnId, row)
        }

        if (running && activeTurnId && turns.has(activeTurnId) && !chosen.has(activeTurnId)) {
          chosen.set(activeTurnId, null)
        }

        for (const [turnId, row] of chosen) {
          const turn = turns.get(turnId)
          if (!turn) continue
          const active = running && turnId === activeTurnId
          if (!active && turn.totals.total <= 0 && turn.cost <= 0) {
            const staleKey = `${session.id}:${turnId}`
            const staleEntry = state.get(staleKey)
            if (staleEntry) {
              state.delete(staleKey)
              if (staleEntry.dispose) staleEntry.dispose()
              staleEntry.root.remove()
            }
            continue
          }
          const key = `${session.id}:${turnId}`
          seen.add(key)

          let entry = state.get(key)
          if (!entry) {
            entry = createFooter(turn, view)
            entry.target = { ...turn.totals }
            entry.current = { ...turn.totals }
            entry.from = { ...turn.totals }
            entry.startedAt = 0
            entry.scrollEl = scroll
            bindTooltip(entry, view)
            state.set(key, entry)
            paint(entry, view)
          } else {
            entry.scrollEl = scroll
            applyTurn(entry, turn, view, animate)
          }

          const useLive = Boolean(active && liveHost)
          entry.docked = useLive
          const target = useLive ? liveHost : row ? contentTarget(row) : null
          if (!target) continue

          if (
            entry.targetEl !== target ||
            !entry.root.isConnected ||
            entry.root.parentElement !== target
          ) {
            target.appendChild(entry.root)
            entry.targetEl = target
            if (entry.isOpen()) entry.reposition()
          }
        }
      } finally {
        // Drop entries that no longer belong here. Same-session footers stay
        // attached through a transient re-render, and the docked active turn
        // stays in the composer dock while it is still running; a session
        // switch, a finished turn, a reverted turn or a detached row removes
        // them.
        for (const [key, entry] of state) {
          if (seen.has(key)) continue
          let stale = true
          if (sessionId && entry.root.isConnected && key.startsWith(`${sessionId}:`)) {
            if (!known) {
              stale = false
            } else {
              const owner =
                entry.targetEl && entry.targetEl.closest
                  ? entry.targetEl.closest("[data-message-id]")
                  : null
              const id = owner && owner.getAttribute("data-message-id")
              stale = !(id && known.has(id))
            }
          }
          const turnId = key.slice(`${sessionId}:`.length)
          if (entry.docked && running && turnId === activeTurnId) stale = false
          if (!stale) continue
          state.delete(key)
          if (entry.dispose) entry.dispose()
          entry.root.remove()
        }
        for (const lane of document.querySelectorAll("[data-token-usage-live]")) {
          if (!lane.firstChild) lane.remove()
        }
      }
    }

    const refresh = () => {
      if (disposed || document.hidden) return
      try {
        sync()
      } catch (error) {
        warn(error)
      }
    }

    const sampleInterval = () => {
      if (!continuous) return refreshMs
      const session = ctx.sessions.current()
      const data = session && session.server && session.server.data
      const status = data && data.session && data.session.status
      if (typeof status !== "function" || !session.id) return sampleMs
      try {
        return status.call(data.session, session.id) === "running"
          ? sampleMs
          : Math.max(sampleMs, IDLE_SAMPLE_MS)
      } catch {
        return sampleMs
      }
    }

    const scheduleSample = () => {
      if (sampleTimer) clearTimeout(sampleTimer)
      sampleTimer = undefined
      if (disposed || document.hidden) return
      sampleTimer = setTimeout(() => {
        if (disposed) return
        refresh()
        scheduleSample()
      }, sampleInterval())
    }

    const refreshDetails = () => {
      if (disposed) return
      for (const entry of state.values()) {
        if (entry.turn) updateFooter(entry, entry.turn, view)
      }
    }

    const loadRate = async () => {
      if (!autoRate || currency !== "CNY" || disposed) return

      const cached = readFxCache()
      if (cached) {
        rate.value = cached.rate
        rate.at = cached.at
        rate.source = "auto"
        refreshDetails()
        if (cached.at > 0 && Date.now() - cached.at < FX_TTL_MS) return
      }

      try {
        if (typeof fetch !== "function") throw new Error("fetch is not available")
        const controller = typeof AbortController === "function" ? new AbortController() : undefined
        const timeout = controller ? setTimeout(() => controller.abort(), FX_TIMEOUT_MS) : undefined
        let response
        try {
          response = await fetch(FX_URL, {
            headers: { accept: "application/json" },
            signal: controller && controller.signal,
          })
        } finally {
          if (timeout) clearTimeout(timeout)
        }
        if (disposed) return
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const json = await response.json()
        const value = Number(json && json.rates && json.rates.CNY)
        if (!Number.isFinite(value) || value <= 0) throw new Error("invalid CNY rate")

        rate.value = value
        rate.at = Date.now()
        rate.source = "auto"
        writeFxCache({ rate: value, at: rate.at })
        refreshDetails()
      } catch (error) {
        if (disposed) return
        if (!cached) {
          rate.value = manualRate
          rate.at = 0
          rate.source = "fallback"
          refreshDetails()
        }
        console.warn(
          "[token-usage-gui] exchange-rate fetch failed; using",
          rate.value,
          error && error.message ? error.message : error,
        )
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (sampleTimer) clearTimeout(sampleTimer)
        sampleTimer = undefined
        return
      }
      refresh()
      scheduleSample()
    }

    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      disposed = true
      clearTimeout(sampleTimer)
      if (mutationTimer) clearTimeout(mutationTimer)
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (observer) observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibilityChange)
      for (const entry of state.values()) {
        if (entry.dispose) entry.dispose()
        entry.root.remove()
      }
      state.clear()
      for (const host of document.querySelectorAll("[data-token-usage-live]")) host.remove()
      if (styleNode) styleNode.remove()
      if (window[GUARD_KEY] && window[GUARD_KEY].cleanup === cleanup) delete window[GUARD_KEY]
    }

    window[GUARD_KEY] = { cleanup }

    document.addEventListener("visibilitychange", onVisibilityChange)
    refresh()
    scheduleSample()
    void loadRate()

    return cleanup
  },
})
