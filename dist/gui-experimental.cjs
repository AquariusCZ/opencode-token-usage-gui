/*! opencode-token-usage-gui v0.1.0 | MIT | https://github.com/AquariusCZ/opencode-token-usage-gui */
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// src/core.cjs
var require_core = __commonJS({
  "src/core.cjs"(exports2, module2) {
    "use strict";
    var METRICS2 = Object.freeze([
      "input",
      "output",
      "reasoning",
      "cacheRead",
      "cacheWrite",
      "total"
    ]);
    function finite2(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    }
    function emptyTotals() {
      return {
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0
      };
    }
    function tokenUsage(message) {
      const tokens = message && message.tokens;
      if (!tokens || typeof tokens !== "object") return null;
      const input = finite2(tokens.input);
      const output = finite2(tokens.output);
      const reasoning = finite2(tokens.reasoning);
      const cacheRead = finite2(tokens.cache && tokens.cache.read);
      const cacheWrite = finite2(tokens.cache && tokens.cache.write);
      return {
        input,
        output,
        reasoning,
        cacheRead,
        cacheWrite,
        total: input + output + reasoning + cacheRead + cacheWrite
      };
    }
    function addUsage(target, usage) {
      target.input += usage.input;
      target.output += usage.output;
      target.reasoning += usage.reasoning;
      target.cacheRead += usage.cacheRead;
      target.cacheWrite += usage.cacheWrite;
      target.total = target.input + target.output + target.reasoning + target.cacheRead + target.cacheWrite;
    }
    function cacheHitRate2(totals) {
      const prompt = finite2(totals && totals.input) + finite2(totals && totals.cacheRead) + finite2(totals && totals.cacheWrite);
      if (prompt <= 0) return null;
      return finite2(totals.cacheRead) / prompt * 100;
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
        messageIds: []
      };
    }
    function visibleMessages(messages, revertMessageID) {
      if (!Array.isArray(messages)) return [];
      if (!revertMessageID) return messages;
      const boundary = messages.findIndex((message) => message && message.id === revertMessageID);
      if (boundary === -1) return [];
      return messages.slice(0, boundary);
    }
    function buildTurns2(messages, revertMessageID) {
      const turns = /* @__PURE__ */ new Map();
      let current = null;
      for (const message of visibleMessages(messages, revertMessageID)) {
        if (!message || typeof message !== "object") continue;
        if (message.type === "user" || message.type === "synthetic") {
          current = message.id;
          if (!turns.has(current)) turns.set(current, emptyTurn(current));
          continue;
        }
        if (message.type !== "assistant" || !current) continue;
        const usage = tokenUsage(message);
        if (!usage) continue;
        const cost = finite2(message.cost);
        if (usage.total <= 0 && cost <= 0) continue;
        const turn = turns.get(current);
        if (!turn) continue;
        addUsage(turn.totals, usage);
        turn.cost += cost;
        turn.requests += 1;
        if (message.id) turn.messageIds.push(message.id);
        const created = finite2(message.time && message.time.created);
        const completed = finite2(message.time && message.time.completed) || finite2(message.time && message.time.updated) || created;
        if (created > 0) {
          if (turn.startedAt === 0 || created < turn.startedAt) turn.startedAt = created;
          if (completed > turn.endedAt) turn.endedAt = completed;
        }
      }
      for (const turn of turns.values()) {
        turn.cacheHitRate = cacheHitRate2(turn.totals);
        turn.durationMs = turn.startedAt > 0 && turn.endedAt >= turn.startedAt ? turn.endedAt - turn.startedAt : 0;
      }
      return turns;
    }
    function sameTotals2(a, b) {
      return METRICS2.every((key) => Math.round(finite2(a && a[key])) === Math.round(finite2(b && b[key])));
    }
    function formatInt(value, locale) {
      return new Intl.NumberFormat(locale || "en-US", { maximumFractionDigits: 0 }).format(
        Math.round(finite2(value))
      );
    }
    function formatCost2(value, locale) {
      const amount = Math.max(0, finite2(value));
      if (amount === 0) return "$0";
      if (amount < 5e-6) return "<$0.00001";
      const digits = amount < 1e-3 ? 5 : amount < 1 ? 4 : 2;
      const text = new Intl.NumberFormat(locale || "en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(amount);
      return `$${text}`;
    }
    function formatMoney2(value, currency, locale) {
      const amount = Math.max(0, finite2(value));
      const code = String(currency || "CNY").toUpperCase();
      if (code === "USD") return formatCost2(amount, locale);
      if (amount === 0) return "\xA50";
      if (amount < 5e-5) return "<\xA50.0001";
      const digits = amount < 0.01 ? 4 : amount < 1 ? 3 : 2;
      const text = new Intl.NumberFormat(locale || "en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(amount);
      return `\xA5${text}`;
    }
    function formatPercent(value, locale) {
      if (value === null || value === void 0 || !Number.isFinite(Number(value))) return "\u2014";
      return new Intl.NumberFormat(locale || "en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(Number(value) / 100);
    }
    function formatDuration2(milliseconds) {
      const seconds = Math.max(0, Math.round(finite2(milliseconds) / 1e3));
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      const rest = seconds % 60;
      if (minutes < 60) return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const restMinutes = minutes % 60;
      return restMinutes > 0 ? `${hours}h ${restMinutes}m` : `${hours}h`;
    }
    module2.exports = {
      METRICS: METRICS2,
      addUsage,
      buildTurns: buildTurns2,
      cacheHitRate: cacheHitRate2,
      emptyTotals,
      finite: finite2,
      formatCost: formatCost2,
      formatDuration: formatDuration2,
      formatInt,
      formatMoney: formatMoney2,
      formatPercent,
      sameTotals: sameTotals2,
      tokenUsage,
      visibleMessages
    };
  }
});

// src/gui.cjs
var { Plugin, Style } = require("@opencode/plugin/gui");
var {
  METRICS,
  buildTurns,
  cacheHitRate,
  finite,
  formatCost,
  formatDuration,
  formatMoney,
  sameTotals
} = require_core();
var FOOTER_ATTR = "data-token-usage";
var STYLE_ID = "opencode-token-usage-gui-style";
var GUARD_KEY = "__OPENCODE_TOKEN_USAGE_GUI__";
var REFRESH_MS = 500;
var MUTATION_DELAY_MS = 120;
var TWEEN_MS = 550;
var COPY = {
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
    requests: "model requests"
  },
  zh: {
    turn: "\u672C\u8F6E",
    input: "\u8F93\u5165",
    output: "\u8F93\u51FA",
    reasoning: "\u63A8\u7406",
    cacheRead: "\u7F13\u5B58\u8BFB",
    cacheWrite: "\u7F13\u5B58\u5199",
    cacheHit: "\u7F13\u5B58\u547D\u4E2D",
    total: "\u5408\u8BA1",
    tokens: "\u8BCD\u5143",
    requests: "\u6B21\u6A21\u578B\u8BF7\u6C42"
  }
};
var CSS = `
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
`;
function pickLocale(ctx) {
  try {
    const value = ctx.locale && typeof ctx.locale.locale === "function" ? ctx.locale.locale() : "";
    if (value) return String(value).toLowerCase();
  } catch {
  }
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language.toLowerCase();
  return "en";
}
function reducedMotion() {
  try {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch {
    return false;
  }
}
function isVisible(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return getComputedStyle(element).visibility !== "hidden";
}
function area(element) {
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
}
function inViewport(element) {
  const rect = element.getBoundingClientRect();
  return rect.bottom > -120 && rect.top < (window.innerHeight || 0) + 120;
}
function findScroll() {
  const candidates = Array.from(
    document.querySelectorAll('[data-slot="session-timeline-scroll"]')
  ).filter(isVisible);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, item) => area(item) > area(best) ? item : best, candidates[0]);
}
function collectRows(scroll) {
  const primary = Array.from(
    scroll.querySelectorAll('[data-timeline-row="AssistantPart"][data-message-id]')
  );
  if (primary.length > 0) return primary;
  const rows = [];
  for (const content of scroll.querySelectorAll('[data-slot="session-turn-assistant-content"]')) {
    const row = content.closest("[data-message-id]");
    if (row) rows.push(row);
  }
  return rows;
}
function contentTarget(row) {
  return row.closest('[data-slot="session-turn-assistant-content"]') || row.querySelector('[data-slot="session-turn-assistant-content"]') || row.closest('[data-slot="session-turn-message-container"]') || row.querySelector('[data-slot="session-turn-message-content"]') || row;
}
function setText(node, text) {
  if (node.firstChild && node.firstChild.nodeType === 3 && node.childNodes.length === 1) {
    if (node.firstChild.nodeValue !== text) node.firstChild.nodeValue = text;
    return;
  }
  node.textContent = text;
}
function separator() {
  const node = document.createElement("span");
  node.className = "tu-sep";
  node.setAttribute("aria-hidden", "true");
  node.textContent = "\xB7";
  return node;
}
function createFooter(turn, view) {
  const root = document.createElement("div");
  root.setAttribute(FOOTER_ATTR, "");
  root.setAttribute("role", "note");
  root.setAttribute("aria-live", "off");
  const values = {};
  const label = document.createElement("span");
  label.className = "tu-label";
  label.textContent = view.copy.turn;
  root.append(label);
  const item = (key, text, className) => {
    root.append(separator());
    const wrap = document.createElement("span");
    wrap.className = className ? `tu-item ${className}` : "tu-item";
    const name = document.createElement("span");
    name.className = "tu-key";
    name.textContent = text;
    const value = document.createElement("span");
    value.className = "tu-val";
    wrap.append(name, value);
    root.append(wrap);
    values[key] = value;
    return wrap;
  };
  item("input", view.copy.input);
  item("output", view.copy.output);
  if (!view.compact) {
    if (view.detailed) item("reasoning", view.copy.reasoning);
    item("cacheRead", view.copy.cacheRead);
    if (view.detailed) item("cacheWrite", view.copy.cacheWrite);
    item("cacheHit", view.copy.cacheHit);
  }
  item("total", view.copy.total, "tu-total");
  let costEl = null;
  if (view.showCost) {
    root.append(separator());
    costEl = document.createElement("span");
    costEl.className = "tu-item tu-cost";
    root.append(costEl);
  }
  return { root, values, costEl };
}
function paint(entry, view) {
  for (const key of METRICS) {
    const value = entry.values[key];
    if (value) setText(value, view.int(entry.current[key]));
  }
  const hit = cacheHitRate(entry.current);
  if (entry.values.cacheHit) {
    setText(entry.values.cacheHit, view.percent(hit));
    entry.values.cacheHit.parentElement.hidden = hit === null;
  }
  if (entry.values.cacheWrite) {
    entry.values.cacheWrite.parentElement.hidden = finite(entry.current.cacheWrite) <= 0;
  }
}
function updateDetail(entry, turn, view) {
  const copy = view.copy;
  const original = formatCost(turn.cost, view.locale);
  const shown = view.money(turn.cost);
  const cost = view.showCost && turn.cost > 0 ? ` \xB7 ${shown}${view.currency === "CNY" ? ` (${original})` : ""}` : "";
  const lines = [
    `${copy.turn} ${view.int(turn.totals.total)} ${copy.tokens}${cost}`,
    `${copy.input} ${view.int(turn.totals.input)} \xB7 ${copy.output} ${view.int(turn.totals.output)} \xB7 ${copy.reasoning} ${view.int(turn.totals.reasoning)}`,
    `${copy.cacheRead} ${view.int(turn.totals.cacheRead)} \xB7 ${copy.cacheWrite} ${view.int(turn.totals.cacheWrite)} \xB7 ${copy.cacheHit} ${view.percent(turn.cacheHitRate)}`,
    `${view.int(turn.requests)} ${copy.requests}${turn.durationMs > 0 ? ` \xB7 ${formatDuration(turn.durationMs)}` : ""}`
  ];
  entry.root.title = lines.join("\n");
  if (entry.costEl) {
    setText(entry.costEl, shown);
    entry.costEl.hidden = turn.cost <= 0;
  }
}
function applyTurn(entry, turn, view, animate) {
  const changed = !sameTotals(entry.target, turn.totals);
  entry.turn = turn;
  updateDetail(entry, turn, view);
  if (!changed) return;
  const next = { ...turn.totals };
  if (!animate || !inViewport(entry.root) || next.total < entry.current.total) {
    entry.current = { ...next };
    entry.from = { ...next };
    entry.target = { ...next };
    entry.startedAt = 0;
    paint(entry, view);
    return;
  }
  entry.from = { ...entry.current };
  entry.target = next;
  entry.startedAt = performance.now();
  view.ensureAnimation();
}
function installStyle() {
  if (document.getElementById(STYLE_ID)) return document.getElementById(STYLE_ID);
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  return style;
}
module.exports = Plugin.define({
  setup(ctx) {
    const locale = pickLocale(ctx);
    const copy = locale.startsWith("zh") ? COPY.zh : COPY.en;
    const options = ctx.options || {};
    const compact = options.compact === true;
    const detailed = options.detailed === true;
    const showCost = options.showCost !== false;
    const animate = options.animate !== false && !reducedMotion();
    const currency = String(options.currency || "CNY").toUpperCase() === "USD" ? "USD" : "CNY";
    const usdToCny = finite(options.usdToCny) > 0 ? finite(options.usdToCny) : 6.68;
    const intFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const pctFmt = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    const view = {
      locale,
      copy,
      compact,
      detailed,
      showCost,
      currency,
      money: (usd) => formatMoney(
        finite(usd) * (currency === "CNY" ? usdToCny : 1),
        currency,
        locale
      ),
      int: (value) => intFmt.format(Math.round(finite(value))),
      percent: (value) => value === null || value === void 0 || !Number.isFinite(Number(value)) ? "\u2014" : pctFmt.format(Number(value) / 100),
      ensureAnimation: () => {
        if (animate && frame === void 0) frame = requestAnimationFrame(tick);
      }
    };
    let styleNode = null;
    if (Style) {
      try {
        ctx.add(Style, CSS);
      } catch {
        styleNode = installStyle();
      }
    } else {
      styleNode = installStyle();
    }
    const state = /* @__PURE__ */ new Map();
    let timer;
    let frame;
    let mutationTimer;
    let observedScroll = null;
    let warned = false;
    const warn = (error) => {
      if (warned) return;
      warned = true;
      console.warn("[token-usage-gui] could not update the footer; the app DOM may have changed", error);
    };
    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(() => {
      if (mutationTimer) return;
      mutationTimer = setTimeout(() => {
        mutationTimer = void 0;
        refresh();
      }, MUTATION_DELAY_MS);
    }) : null;
    const observe = (scroll) => {
      if (!observer || observedScroll === scroll) return;
      observer.disconnect();
      observedScroll = scroll;
      observer.observe(scroll, { childList: true, subtree: true });
    };
    const tick = (now) => {
      let active = false;
      for (const entry of state.values()) {
        if (!entry.startedAt) continue;
        const progress = Math.min(1, (now - entry.startedAt) / TWEEN_MS);
        const eased = 1 - Math.pow(1 - progress, 3);
        for (const key of METRICS) {
          entry.current[key] = entry.from[key] + (entry.target[key] - entry.from[key]) * eased;
        }
        paint(entry, view);
        if (progress < 1) active = true;
        else {
          entry.current = { ...entry.target };
          entry.startedAt = 0;
          paint(entry, view);
        }
      }
      frame = active ? requestAnimationFrame(tick) : void 0;
    };
    const sync = () => {
      const session = ctx.sessions.current();
      if (!session || !session.id) return;
      const data = session.server && session.server.data;
      const messagesApi = data && data.session && data.session.message;
      if (!messagesApi || typeof messagesApi.list !== "function") return;
      const messages = messagesApi.list(session.id);
      if (!Array.isArray(messages) || messages.length === 0) return;
      const info = data.session.get && data.session.get(session.id);
      const turns = buildTurns(messages, info && info.revert && info.revert.messageID);
      if (turns.size === 0) return;
      const byMessage = /* @__PURE__ */ new Map();
      for (const [turnId, turn] of turns) {
        for (const messageId of turn.messageIds) byMessage.set(messageId, turnId);
      }
      const scroll = findScroll();
      if (!scroll) return;
      observe(scroll);
      const rows = collectRows(scroll);
      if (rows.length === 0) return;
      const chosen = /* @__PURE__ */ new Map();
      for (const row of rows) {
        const id = row.getAttribute("data-message-id");
        if (!id) continue;
        const turnId = turns.has(id) ? id : byMessage.get(id);
        if (!turnId) continue;
        const turn = turns.get(turnId);
        if (!turn || turn.totals.total <= 0) continue;
        chosen.set(turnId, row);
      }
      const seen = /* @__PURE__ */ new Set();
      for (const [turnId, row] of chosen) {
        const turn = turns.get(turnId);
        const key = `${session.id}:${turnId}`;
        seen.add(key);
        let entry = state.get(key);
        if (!entry) {
          const footer = createFooter(turn, view);
          entry = {
            ...footer,
            turn,
            target: { ...turn.totals },
            current: { ...turn.totals },
            from: { ...turn.totals },
            startedAt: 0,
            targetEl: null
          };
          state.set(key, entry);
          paint(entry, view);
          updateDetail(entry, turn, view);
        } else {
          applyTurn(entry, turn, view, animate);
        }
        const target = contentTarget(row);
        if (entry.targetEl !== target || !entry.root.isConnected || entry.root.parentElement !== target) {
          target.appendChild(entry.root);
          entry.targetEl = target;
        }
      }
      for (const [key, entry] of state) {
        if (seen.has(key)) continue;
        if (!key.startsWith(`${session.id}:`) || !entry.root.isConnected) {
          entry.root.remove();
          state.delete(key);
        }
      }
    };
    const refresh = () => {
      try {
        sync();
      } catch (error) {
        warn(error);
      }
    };
    const cleanup = () => {
      clearInterval(timer);
      if (mutationTimer) clearTimeout(mutationTimer);
      if (frame !== void 0) cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      for (const entry of state.values()) entry.root.remove();
      state.clear();
      if (styleNode) styleNode.remove();
      if (window[GUARD_KEY] && window[GUARD_KEY].cleanup === cleanup) delete window[GUARD_KEY];
    };
    const previous = window[GUARD_KEY];
    if (previous && typeof previous.cleanup === "function" && previous.cleanup !== cleanup) {
      try {
        previous.cleanup();
      } catch {
      }
    }
    window[GUARD_KEY] = { cleanup };
    refresh();
    timer = setInterval(refresh, REFRESH_MS);
    return cleanup;
  }
});
