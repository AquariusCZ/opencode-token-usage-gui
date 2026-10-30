"use strict"

const { TOKEN_KEYS, formatCost, formatDuration, tokenComposition } = require("./core.cjs")
const { placeTooltip } = require("./placement.cjs")

const FOOTER_ATTR = "data-token-usage"
const SHOW_DELAY_MS = 120
const HIDE_DELAY_MS = 80

let popoverSeq = 0

/**
 * The details card deliberately relies on the app's own v2 tokens. They flip
 * with the theme, so the card matches the surrounding UI in light and dark
 * mode without sniffing `prefers-color-scheme` or hard-coding a palette.
 */
const CSS = `
[${FOOTER_ATTR}] {
  position: relative;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 6px;
  row-gap: 2px;
  width: fit-content;
  max-width: 100%;
  margin: 6px 0 0 -9px;
  padding: 5px 9px 6px;
  border-radius: 8px;
  color: var(--v2-text-text-muted, #a3a3a3);
  font-size: 12px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  user-select: text;
  -webkit-user-select: text;
  transition: background-color 140ms ease;
}
[${FOOTER_ATTR}]:hover,
[${FOOTER_ATTR}][data-open="true"] {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.08));
}
[${FOOTER_ATTR}][data-pinned] {
  background: var(--v2-overlay-simple-overlay-pressed, rgba(127, 127, 127, 0.12));
}
[${FOOTER_ATTR}] .tu-label {
  color: var(--v2-text-text-faint, #8a8a8a);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
[${FOOTER_ATTR}] .tu-group,
[${FOOTER_ATTR}] .tu-cost-group {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
[${FOOTER_ATTR}] .tu-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
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
  opacity: 0.4;
  user-select: none;
}
[${FOOTER_ATTR}] [hidden],
.tu-portal [hidden] {
  display: none !important;
}
[${FOOTER_ATTR}] .tu-total .tu-val {
  color: var(--v2-text-text-base, #d4d4d4);
  font-weight: 600;
}
[${FOOTER_ATTR}] .tu-cost {
  color: var(--v2-text-text-base, #d4d4d4);
  font-weight: 600;
}
[${FOOTER_ATTR}] .tu-info {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0 0 0 1px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--v2-text-text-faint, #8a8a8a);
  opacity: 0.45;
  cursor: pointer;
  transition: opacity 120ms ease, color 120ms ease, background-color 120ms ease;
}
[${FOOTER_ATTR}]:hover .tu-info,
[${FOOTER_ATTR}][data-open="true"] .tu-info {
  opacity: 0.8;
}
[${FOOTER_ATTR}] .tu-info:hover {
  opacity: 1;
  color: var(--v2-text-text-base, #d4d4d4);
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.1));
}
[${FOOTER_ATTR}] .tu-info::after {
  content: "";
  position: absolute;
  inset: -5px;
}
[${FOOTER_ATTR}] .tu-info:focus-visible {
  outline: 2px solid var(--v2-border-border-focus, #3b5cf6);
  outline-offset: 1px;
  opacity: 1;
}
[${FOOTER_ATTR}][data-pinned] .tu-info {
  opacity: 1;
  color: var(--v2-text-text-base, #d4d4d4);
}
[${FOOTER_ATTR}] .tu-info svg {
  display: block;
  width: 12px;
  height: 12px;
}
.tu-portal {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483000;
  box-sizing: content-box;
  width: max-content;
  height: max-content;
  padding: 8px;
  pointer-events: none;
  overflow: visible;
  font-family: inherit;
}
.tu-portal[data-open="true"] {
  pointer-events: auto;
}
.tu-portal .tu-pop {
  position: relative;
  box-sizing: border-box;
  width: 348px;
  max-width: calc(100vw - 24px);
  padding: 14px 15px 13px;
  border: 1px solid var(--v2-border-border-muted, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: var(--v2-background-bg-layer-01, #1f1f22);
  box-shadow: var(
    --v2-elevation-floating,
    0 12px 32px rgba(0, 0, 0, 0.28),
    0 2px 8px rgba(0, 0, 0, 0.18)
  );
  color: var(--v2-text-text-base, #f2f2f2);
  text-align: left;
  white-space: normal;
  font-size: 11.5px;
  line-height: 1.45;
  letter-spacing: 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px) scale(0.985);
  transform-origin: bottom left;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  overflow-y: auto;
  transition:
    opacity 120ms ease,
    transform 170ms cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0s linear 170ms;
}
.tu-portal .tu-pop[data-placement="bottom"] {
  transform: translateY(-4px) scale(0.985);
  transform-origin: top left;
}
.tu-portal .tu-pop[data-placement="right"] {
  transform: translateX(-4px) scale(0.985);
  transform-origin: left center;
}
.tu-portal .tu-pop[data-placement="left"] {
  transform: translateX(4px) scale(0.985);
  transform-origin: right center;
}
.tu-portal .tu-pop[data-open="true"] {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}
.tu-portal[data-open="true"] .tu-pop {
  pointer-events: auto;
  user-select: text;
  -webkit-user-select: text;
}
.tu-portal .tu-pop[hidden] {
  display: none !important;
}
.tu-portal .tu-pop-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 11px;
}
.tu-portal .tu-pop-title {
  min-width: 0;
}
.tu-portal .tu-eyebrow {
  display: block;
  margin-bottom: 3px;
  color: var(--v2-text-text-faint, #8a8a8a);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.tu-portal .tu-pop-total {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}
.tu-portal .tu-total-num {
  color: var(--v2-text-text-base, #f2f2f2);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.tu-portal .tu-total-unit {
  color: var(--v2-text-text-faint, #8a8a8a);
  font-size: 10.5px;
  white-space: nowrap;
}
.tu-portal .tu-cost-block {
  flex: none;
  padding-top: 1px;
  text-align: right;
}
.tu-portal .tu-cost-main {
  display: block;
  color: var(--v2-text-text-base, #f2f2f2);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.tu-portal .tu-cost-alt {
  display: block;
  margin-top: 1px;
  color: var(--v2-text-text-faint, #8a8a8a);
  font-size: 10px;
  white-space: nowrap;
}
.tu-portal .tu-bar {
  display: flex;
  gap: 2px;
  height: 6px;
  margin: 0 0 11px;
  border-radius: 3px;
  background: var(--v2-background-bg-layer-03, rgba(127, 127, 127, 0.16));
  overflow: hidden;
}
.tu-portal .tu-seg {
  display: block;
  height: 100%;
  border-radius: 2px;
  flex-shrink: 1;
  min-width: 2px;
  transition: width 220ms ease;
}
.tu-portal .tu-seg[hidden] {
  display: none !important;
}
.tu-portal .tu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  column-gap: 16px;
  row-gap: 5px;
  margin: 0 0 10px;
}
.tu-portal .tu-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.tu-portal .tu-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 2px;
  opacity: 0.9;
}
.tu-portal .tu-dot-ring {
  background: transparent !important;
  border: 1px solid var(--v2-text-text-muted, #a3a3a3);
  border-radius: 50%;
  opacity: 0.8;
}
.tu-portal .tu-cell-key {
  color: var(--v2-text-text-muted, #a3a3a3);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tu-portal .tu-cell-val {
  margin-left: auto;
  color: var(--v2-text-text-base, #f2f2f2);
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
}
.tu-portal .tu-pop-meta {
  padding-top: 9px;
  border-top: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.16));
  color: var(--v2-text-text-muted, #a3a3a3);
  font-size: 10.5px;
}
.tu-portal .tu-pop-rate {
  margin-top: 2px;
  color: var(--v2-text-text-muted, #a3a3a3);
  font-size: 10px;
}
.tu-portal .tu-seg[data-metric="input"],
.tu-portal .tu-dot[data-metric="input"] {
  background: var(--v2-blue-500, #7698fd);
}
.tu-portal .tu-seg[data-metric="output"],
.tu-portal .tu-dot[data-metric="output"] {
  background: var(--v2-green-600, #49c970);
}
.tu-portal .tu-seg[data-metric="reasoning"],
.tu-portal .tu-dot[data-metric="reasoning"] {
  background: var(--v2-purple-500, #8271f8);
}
.tu-portal .tu-seg[data-metric="cacheRead"],
.tu-portal .tu-dot[data-metric="cacheRead"] {
  background: var(--v2-blue-300, #c3d4fd);
}
.tu-portal .tu-seg[data-metric="cacheWrite"],
.tu-portal .tu-dot[data-metric="cacheWrite"] {
  background: var(--v2-orange-600, #ff8648);
}
.tu-live-lane {
  width: 100%;
  max-width: var(--container-session, 744px);
  margin-inline: auto;
  padding-inline: 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 29px;
}
@media (min-width: 768px) {
  .tu-live-lane {
    padding-inline: 24px;
  }
}
.tu-live-dock {
  width: 100%;
  display: flex;
  align-items: center;
  min-width: 0;
  pointer-events: auto;
  padding: 2px 0 4px;
}
.tu-live-dock [${FOOTER_ATTR}] {
  margin: 0;
  max-width: 100%;
}
@media (prefers-reduced-motion: reduce) {
  [${FOOTER_ATTR}],
  .tu-portal .tu-pop,
  .tu-portal .tu-pop[data-placement="bottom"],
  .tu-portal .tu-pop[data-open="true"] {
    transition: none;
    transform: none;
  }
}
`

function make(tag, className, text) {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

function setText(node, text) {
  if (!node) return
  if (node.firstChild && node.firstChild.nodeType === 3 && node.childNodes.length === 1) {
    if (node.firstChild.nodeValue !== text) node.firstChild.nodeValue = text
    return
  }
  node.textContent = text
}

function separator() {
  const node = make("span", "tu-sep", "·")
  node.setAttribute("aria-hidden", "true")
  return node
}

function infoIcon() {
  const namespace = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(namespace, "svg")
  svg.setAttribute("viewBox", "0 0 16 16")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")

  const circle = document.createElementNS(namespace, "circle")
  circle.setAttribute("cx", "8")
  circle.setAttribute("cy", "8")
  circle.setAttribute("r", "6.3")
  circle.setAttribute("fill", "none")
  circle.setAttribute("stroke", "currentColor")
  circle.setAttribute("stroke-width", "1.25")

  const dot = document.createElementNS(namespace, "circle")
  dot.setAttribute("cx", "8")
  dot.setAttribute("cy", "4.8")
  dot.setAttribute("r", "0.75")
  dot.setAttribute("fill", "currentColor")

  const stem = document.createElementNS(namespace, "path")
  stem.setAttribute("d", "M8 7.2v4.1")
  stem.setAttribute("fill", "none")
  stem.setAttribute("stroke", "currentColor")
  stem.setAttribute("stroke-width", "1.25")
  stem.setAttribute("stroke-linecap", "round")

  svg.append(circle, dot, stem)
  return svg
}

function createFooter(turn, view) {
  const copy = view.copy
  const root = document.createElement("div")
  root.setAttribute(FOOTER_ATTR, "")
  root.setAttribute("role", "note")
  root.setAttribute("aria-live", "off")

  const values = {}
  const groups = {}

  root.append(make("span", "tu-label", turn && turn.session ? copy.session : copy.turn))

  const item = (key, text, className) => {
    const group = make("span", "tu-group")
    const wrap = make("span", className ? `tu-item ${className}` : "tu-item")
    const value = make("span", "tu-val")
    wrap.append(make("span", "tu-key", text), value)
    group.append(separator(), wrap)
    root.append(group)
    values[key] = value
    groups[key] = group
    return wrap
  }

  item("input", copy.input)
  item("output", copy.output)

  if (!view.compact) {
    if (view.detailed) item("reasoning", copy.reasoning)
    item("cacheRead", copy.cacheRead)
    if (view.detailed) item("cacheWrite", copy.cacheWrite)
    item("cacheHit", copy.cacheHit)
  }

  item("total", copy.total, "tu-total")

  let costEl = null
  let costGroup = null
  if (view.showCost) {
    costGroup = make("span", "tu-cost-group")
    costEl = make("span", "tu-cost")
    costGroup.append(separator(), costEl)
    root.append(costGroup)
  }

  const info = document.createElement("button")
  info.type = "button"
  info.className = "tu-info"
  info.setAttribute("aria-label", copy.showDetails)
  info.setAttribute("aria-expanded", "false")
  info.append(infoIcon())
  root.append(info)

  const pop = make("div", "tu-pop")
  pop.id = `tu-pop-${++popoverSeq}`
  pop.setAttribute("role", "tooltip")
  pop.setAttribute("aria-hidden", "true")
  info.setAttribute("aria-describedby", pop.id)

  const head = make("div", "tu-pop-head")
  const title = make("div", "tu-pop-title")
  title.append(make("span", "tu-eyebrow", turn && turn.session ? copy.sessionBreakdown : copy.breakdown))
  const totalLine = make("span", "tu-pop-total")
  const totalNum = make("span", "tu-total-num")
  const totalUnit = make("span", "tu-total-unit", copy.tokens)
  totalLine.append(totalNum, totalUnit)
  title.append(totalLine)

  const costBlock = make("div", "tu-cost-block")
  const costMain = make("span", "tu-cost-main")
  const costAlt = make("span", "tu-cost-alt")
  costBlock.append(costMain, costAlt)
  head.append(title, costBlock)
  pop.append(head)

  const bar = make("div", "tu-bar")
  bar.setAttribute("role", "img")
  bar.setAttribute("aria-label", copy.composition)
  const segments = {}
  for (const key of TOKEN_KEYS) {
    const segment = make("span", "tu-seg")
    segment.dataset.metric = key
    bar.append(segment)
    segments[key] = segment
  }
  pop.append(bar)

  const grid = make("div", "tu-grid")
  const cells = {}
  for (const key of TOKEN_KEYS) {
    const cell = make("div", "tu-cell")
    const dot = make("span", "tu-dot")
    dot.dataset.metric = key
    const value = make("span", "tu-cell-val")
    cell.append(dot, make("span", "tu-cell-key", copy[key]), value)
    grid.append(cell)
    cells[key] = value
  }

  const hitCell = make("div", "tu-cell")
  const hitDot = make("span", "tu-dot tu-dot-ring")
  const hitValue = make("span", "tu-cell-val")
  hitCell.append(hitDot, make("span", "tu-cell-key", copy.cacheHit), hitValue)
  grid.append(hitCell)
  pop.append(grid)

  const meta = make("div", "tu-pop-meta")
  const rate = make("div", "tu-pop-rate")
  pop.append(meta, rate)

  const portal = make("div", "tu-portal")
  portal.append(pop)
  document.body.append(portal)

  const entry = {
    root,
    portal,
    values,
    groups,
    costEl,
    costGroup,
    info,
    pop,
    bar,
    totalNum,
    costMain,
    costAlt,
    costBlock,
    segments,
    cells,
    hitCell,
    hitValue,
    meta,
    rate,
    turn,
    targetEl: null,
    scrollEl: null,
    reposition: null,
    isOpen: () => false,
    dispose: null,
  }

  updateFooter(entry, turn, view)
  return entry
}

function updateFooter(entry, turn, view) {
  if (!entry || !turn) return
  entry.turn = turn
  const copy = view.copy
  const totals = turn.totals

  // The sampler calls this 10x per second while a turn is running. Skip the
  // DOM writes when nothing the card displays has changed.
  const rateLine = view.rateLine()
  const signature = [
    totals.input,
    totals.output,
    totals.reasoning,
    totals.cacheRead,
    totals.cacheWrite,
    totals.total,
    turn.cost,
    turn.requests,
    turn.durationMs,
    turn.cacheHitRate,
    view.currency,
    rateLine,
  ].join("|")
  if (entry.signature === signature) return
  entry.signature = signature

  setText(entry.totalNum, view.int(totals.total))

  const showCost = view.showCost && turn.cost > 0
  if (entry.costGroup) entry.costGroup.hidden = !showCost
  setText(entry.costEl, showCost ? view.money(turn.cost) : "")
  if (entry.costBlock) {
    entry.costBlock.hidden = !showCost
    if (showCost) {
      setText(entry.costMain, view.money(turn.cost))
      const original = view.currency === "CNY" ? formatCost(turn.cost, view.locale) : ""
      entry.costAlt.hidden = !original
      setText(entry.costAlt, original ? `≈ ${original}` : "")
    }
  }

  for (const key of TOKEN_KEYS) {
    setText(entry.cells[key], view.int(totals[key]))
  }

  const composition = tokenComposition(totals)
  entry.bar.hidden = !composition.some((part) => part.value > 0)
  for (const part of composition) {
    const segment = entry.segments[part.key]
    segment.hidden = part.share <= 0
    segment.style.width = `${(part.share * 100).toFixed(4)}%`
  }

  const hit =
    turn.cacheHitRate !== null && Number.isFinite(turn.cacheHitRate) ? turn.cacheHitRate : null
  entry.hitCell.hidden = hit === null
  setText(entry.hitValue, hit === null ? "—" : view.percent(hit))

  const parts = []
  if (turn.session && turn.turns > 0) parts.push(`${view.int(turn.turns)} ${copy.turns}`)
  parts.push(`${view.int(turn.requests)} ${copy.requests}`)
  if (turn.durationMs > 0) parts.push(formatDuration(turn.durationMs))
  setText(entry.meta, parts.join(" · "))

  const rateText = view.showCost && turn.cost > 0 ? rateLine : ""
  entry.rate.hidden = !rateText
  setText(entry.rate, rateText)

  if (entry.reposition && entry.isOpen()) entry.reposition()
}

function bindTooltip(entry, view) {
  const { root, info, pop, portal } = entry
  let open = false
  let pinned = false
  let showTimer
  let hideTimer
  let listening = false
  let onScroll = null
  let onResize = null
  let onOutside = null
  let followTimer = null

  const hovered = () => root.matches(":hover") || portal.matches(":hover")

  const position = () => {
    if (!open || !root.isConnected) return
    const area = {
      top: 0,
      left: 0,
      right: window.innerWidth || document.documentElement.clientWidth || 0,
      bottom: window.innerHeight || document.documentElement.clientHeight || 0,
    }
    if (area.right - area.left < 140 || area.bottom - area.top < 120) return

    pop.style.maxWidth = `${Math.max(160, area.right - area.left - 16)}px`
    pop.style.maxHeight = `${Math.max(140, area.bottom - area.top - 16)}px`

    const anchor = root.getBoundingClientRect()
    const result = placeTooltip({
      anchor: { top: anchor.top, bottom: anchor.bottom, left: anchor.left, right: anchor.right },
      info: info.getBoundingClientRect(),
      pop: { width: pop.offsetWidth, height: pop.offsetHeight },
      bounds: area,
      gap: 8,
      pad: 8,
      side: view.popoverSide,
    })
    portal.style.left = `${Math.round(result.left - 8)}px`
    portal.style.top = `${Math.round(result.top - 8)}px`
    pop.dataset.placement = result.placement
    portal.dataset.placement = result.placement
  }

  const listen = () => {
    if (listening) return
    listening = true
    onScroll = () => position()
    onResize = () => position()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    if (!followTimer) {
      followTimer = setInterval(() => {
        if (open && !document.hidden) position()
      }, 160)
    }
  }

  const unlisten = () => {
    if (!listening) return
    listening = false
    window.removeEventListener("scroll", onScroll, true)
    window.removeEventListener("resize", onResize)
    onScroll = null
    onResize = null
    if (followTimer) {
      clearInterval(followTimer)
      followTimer = null
    }
  }

  const attachOutside = () => {
    if (onOutside) return
    onOutside = (event) => {
      if (root.contains(event.target) || portal.contains(event.target)) return
      setPinned(false)
      hide(0)
    }
    document.addEventListener("pointerdown", onOutside, true)
    document.addEventListener("keydown", handleDocKey, false)
  }

  const detachOutside = () => {
    if (!onOutside) return
    document.removeEventListener("pointerdown", onOutside, true)
    document.removeEventListener("keydown", handleDocKey, false)
    onOutside = null
  }

  const handleDocKey = (event) => {
    if (event.key !== "Escape" || !pinned) return
    if (event.defaultPrevented) return
    const target = event.target
    const editing =
      target.closest &&
      target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="textbox"], [data-component="dock-prompt"], [data-kind="question"], [data-kind="elicitation"], [data-owns-escape]',
      )
    if (editing) return
    event.stopPropagation()
    setPinned(false)
    hide(0)
  }

  const show = () => {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    if (!open) {
      open = true
      updateFooter(entry, entry.turn, view)
      root.setAttribute("data-open", "true")
      pop.setAttribute("data-open", "true")
      portal.setAttribute("data-open", "true")
      pop.setAttribute("aria-hidden", "false")
      info.setAttribute("aria-expanded", "true")
      listen()
    }
    position()
  }

  const hide = (delay) => {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      if (pinned || !open) return
      open = false
      root.removeAttribute("data-open")
      pop.removeAttribute("data-open")
      portal.removeAttribute("data-open")
      pop.setAttribute("aria-hidden", "true")
      info.setAttribute("aria-expanded", "false")
      unlisten()
    }, delay)
  }

  function setPinned(value) {
    pinned = Boolean(value)
    root.toggleAttribute("data-pinned", pinned)
    info.setAttribute("aria-label", pinned ? view.copy.hideDetails : view.copy.showDetails)
    if (pinned) {
      show()
      attachOutside()
    } else {
      detachOutside()
      if (!hovered() && !info.matches(":focus-visible")) hide(0)
    }
  }

  const onEnter = () => {
    if (pinned) return
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    showTimer = setTimeout(show, SHOW_DELAY_MS)
  }

  const onLeave = () => {
    clearTimeout(showTimer)
    if (!pinned && !info.matches(":focus-visible")) hide(HIDE_DELAY_MS)
  }

  const onPortalEnter = () => {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    if (!open) show()
    else position()
  }

  const onPortalLeave = () => {
    if (!pinned) hide(HIDE_DELAY_MS)
  }

  const onClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const next = !pinned
    setPinned(next)
    if (!next) hide(0)
  }

  const onFocus = () => show()

  const onBlur = () => {
    if (!pinned && !hovered()) hide(0)
  }

  const onKeyDown = (event) => {
    if (event.key !== "Escape" || !open) return
    event.stopPropagation()
    setPinned(false)
    hide(0)
  }

  const onRemove = () => {
    pinned = false
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    unlisten()
    detachOutside()
  }

  root.addEventListener("pointerenter", onEnter)
  root.addEventListener("pointerleave", onLeave)
  portal.addEventListener("pointerenter", onPortalEnter)
  portal.addEventListener("pointerleave", onPortalLeave)
  info.addEventListener("click", onClick)
  info.addEventListener("focus", onFocus)
  info.addEventListener("blur", onBlur)
  root.addEventListener("keydown", onKeyDown)

  entry.reposition = position
  entry.isOpen = () => open
  entry.close = () => {
    setPinned(false)
    hide(0)
  }
  entry.dispose = () => {
    onRemove()
    root.removeEventListener("pointerenter", onEnter)
    root.removeEventListener("pointerleave", onLeave)
    portal.removeEventListener("pointerenter", onPortalEnter)
    portal.removeEventListener("pointerleave", onPortalLeave)
    info.removeEventListener("click", onClick)
    info.removeEventListener("focus", onFocus)
    info.removeEventListener("blur", onBlur)
    root.removeEventListener("keydown", onKeyDown)
    portal.remove()
  }

  return entry
}

module.exports = {
  CSS,
  FOOTER_ATTR,
  bindTooltip,
  createFooter,
  updateFooter,
}




