/*! opencode-token-usage-gui v0.3.1 | MIT | https://github.com/AquariusCZ/opencode-token-usage-gui */
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
    var TOKEN_KEYS = Object.freeze(["input", "output", "reasoning", "cacheRead", "cacheWrite"]);
    function finite2(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    }
    function clampNumber2(value, min, max, fallback) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(max, Math.max(min, number));
    }
    function smoothingAlpha2(dtMs, tauMs) {
      const dt = Math.max(0, finite2(dtMs));
      const tau = Math.max(1, finite2(tauMs));
      return Math.min(1, 1 - Math.exp(-dt / tau));
    }
    function approachValue2(current, target, alpha) {
      const a = Math.min(1, Math.max(0, finite2(alpha)));
      return finite2(current) + (finite2(target) - finite2(current)) * a;
    }
    function normalizeRefreshMode2(value) {
      return String(value || "continuous").toLowerCase() === "interval" ? "interval" : "continuous";
    }
    function normalizeCurrency2(value, locale) {
      const code = String(value || "CNY").toUpperCase();
      if (code === "USD") return "USD";
      if (code === "AUTO") {
        return String(locale || "").toLowerCase().startsWith("zh") ? "CNY" : "USD";
      }
      return "CNY";
    }
    function normalizePopoverSide2(value) {
      return String(value || "left").toLowerCase() === "right" ? "right" : "left";
    }
    function emptyTotals2() {
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
    function addSessionTokens2(target, tokens) {
      if (!tokens || typeof tokens !== "object") return;
      target.input += finite2(tokens.input);
      target.output += finite2(tokens.output);
      target.reasoning += finite2(tokens.reasoning);
      target.cacheRead += finite2(tokens.cache && tokens.cache.read);
      target.cacheWrite += finite2(tokens.cache && tokens.cache.write);
      target.total = target.input + target.output + target.reasoning + target.cacheRead + target.cacheWrite;
    }
    function cacheHitRate2(totals) {
      const prompt = finite2(totals && totals.input) + finite2(totals && totals.cacheRead) + finite2(totals && totals.cacheWrite);
      if (prompt <= 0) return null;
      return finite2(totals.cacheRead) / prompt * 100;
    }
    function tokenComposition(totals) {
      const values = TOKEN_KEYS.map((key) => Math.max(0, finite2(totals && totals[key])));
      const sum = values.reduce((total, value) => total + value, 0);
      const denominator = sum > 0 ? sum : Math.max(0, finite2(totals && totals.total));
      return TOKEN_KEYS.map((key, index) => ({
        key,
        value: values[index],
        share: denominator > 0 ? values[index] / denominator : 0
      }));
    }
    function emptyTurn(id) {
      return {
        id,
        totals: emptyTotals2(),
        cost: 0,
        requests: 0,
        startedAt: 0,
        endedAt: 0,
        durationMs: 0,
        cacheHitRate: null,
        messageIds: [],
        userIds: []
      };
    }
    function visibleMessages(messages, revertMessageID) {
      if (!Array.isArray(messages)) return [];
      if (!revertMessageID) return messages;
      const boundary = messages.findIndex((message) => message && message.id === revertMessageID);
      if (boundary === -1) return [];
      return messages.slice(0, boundary);
    }
    function buildTurns2(messages, revertMessageID, pendingInputIDs) {
      const turns = /* @__PURE__ */ new Map();
      const pending = pendingInputIDs && typeof pendingInputIDs.has === "function" ? pendingInputIDs : Array.isArray(pendingInputIDs) ? new Set(pendingInputIDs) : null;
      const visible = visibleMessages(messages, revertMessageID);
      let firstIdle = -1;
      for (let index = 0; index < visible.length; index += 1) {
        const message = visible[index];
        if (message && typeof message === "object" && message.type === "idle") {
          firstIdle = index;
          break;
        }
      }
      let current = null;
      const openTurn = (id) => {
        current = id;
        let turn = turns.get(id);
        if (!turn) {
          turn = emptyTurn(id);
          turns.set(id, turn);
        }
        if (id && !turn.userIds.includes(id)) turn.userIds.push(id);
        return turn;
      };
      for (let index = 0; index < visible.length; index += 1) {
        const message = visible[index];
        if (!message || typeof message !== "object") continue;
        if (message.type === "idle") {
          if (!current) continue;
          const turn2 = turns.get(current);
          if (turn2) {
            const created2 = finite2(message.time && message.time.created);
            if (created2 > 0 && created2 > turn2.endedAt) turn2.endedAt = created2;
          }
          current = null;
          continue;
        }
        if (message.type === "system") continue;
        const idleMode = firstIdle !== -1 && index > firstIdle;
        if (message.type === "synthetic" || message.type === "compaction") {
          if (!current) openTurn(message.id);
          continue;
        }
        if (message.type === "user") {
          if (pending && message.id && pending.has(message.id)) continue;
          if (idleMode && current) {
            const turn2 = turns.get(current);
            if (turn2 && message.id && !turn2.userIds.includes(message.id)) {
              turn2.userIds.push(message.id);
            }
            continue;
          }
          openTurn(message.id);
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
    function summarizeTurns2(turns) {
      const totals = emptyTotals2();
      let cost = 0;
      let requests = 0;
      let durationMs = 0;
      let count = 0;
      if (turns && typeof turns.values === "function") {
        for (const turn of turns.values()) {
          if (!turn || !turn.totals) continue;
          if (turn.totals.total <= 0 && turn.cost <= 0) continue;
          addUsage(totals, turn.totals);
          cost += finite2(turn.cost);
          requests += finite2(turn.requests);
          durationMs += Math.max(0, finite2(turn.durationMs));
          count += 1;
        }
      }
      return {
        id: "__session__",
        session: true,
        totals,
        cost,
        requests,
        durationMs,
        cacheHitRate: cacheHitRate2(totals),
        messageIds: [],
        turns: count
      };
    }
    function sameTotals2(a, b) {
      return METRICS2.every((key) => Math.round(finite2(a && a[key])) === Math.round(finite2(b && b[key])));
    }
    function formatInt(value, locale) {
      return new Intl.NumberFormat(locale || "en-US", { maximumFractionDigits: 0 }).format(
        Math.round(finite2(value))
      );
    }
    function formatCost(value, locale) {
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
      if (code === "USD") return formatCost(amount, locale);
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
    function formatDuration(milliseconds) {
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
      TOKEN_KEYS,
      addSessionTokens: addSessionTokens2,
      addUsage,
      approachValue: approachValue2,
      buildTurns: buildTurns2,
      cacheHitRate: cacheHitRate2,
      clampNumber: clampNumber2,
      emptyTotals: emptyTotals2,
      finite: finite2,
      formatCost,
      formatDuration,
      formatInt,
      formatMoney: formatMoney2,
      formatPercent,
      normalizeCurrency: normalizeCurrency2,
      normalizePopoverSide: normalizePopoverSide2,
      normalizeRefreshMode: normalizeRefreshMode2,
      sameTotals: sameTotals2,
      smoothingAlpha: smoothingAlpha2,
      summarizeTurns: summarizeTurns2,
      tokenComposition,
      tokenUsage,
      visibleMessages
    };
  }
});

// src/placement.cjs
var require_placement = __commonJS({
  "src/placement.cjs"(exports2, module2) {
    "use strict";
    function clamp(value, min, max) {
      if (!(max > min)) return min;
      return Math.min(max, Math.max(min, value));
    }
    function placeTooltip(input) {
      const anchor = input && input.anchor || {};
      const pop = input && input.pop || {};
      const bounds = input && input.bounds || {};
      const gap = Number.isFinite(input && input.gap) ? input.gap : 8;
      const pad = Number.isFinite(input && input.pad) ? input.pad : 8;
      const side = input && String(input.side).toLowerCase() === "right" ? "right" : "left";
      const anchorTop = Number.isFinite(anchor.top) ? anchor.top : 0;
      const anchorBottom = Number.isFinite(anchor.bottom) ? anchor.bottom : anchorTop;
      const anchorLeft = Number.isFinite(anchor.left) ? anchor.left : 0;
      const anchorRight = Number.isFinite(anchor.right) ? anchor.right : anchorLeft;
      const infoRight = input && input.info && Number.isFinite(input.info.right) && input.info.right > input.info.left ? input.info.right : anchorRight;
      const popWidth = Math.max(0, Number(pop.width) || 0);
      const popHeight = Math.max(0, Number(pop.height) || 0);
      const top = Number.isFinite(bounds.top) ? bounds.top : 0;
      const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top;
      const left = Number.isFinite(bounds.left) ? bounds.left : 0;
      const right = Number.isFinite(bounds.right) ? bounds.right : left;
      const roomLeft = anchorLeft - gap - popWidth - (left + pad);
      const roomRight = right - pad - (anchorRight + gap) - popWidth;
      const roomBelow = bottom - pad - (anchorBottom + gap) - popHeight;
      const roomAbove = anchorTop - gap - popHeight - (top + pad);
      const sideRoom = side === "left" ? roomLeft : roomRight;
      let placement;
      if (sideRoom >= 0) placement = side;
      else if (roomBelow >= 0) placement = "bottom";
      else if (roomAbove >= 0) placement = "top";
      else {
        const rooms = [
          [side, sideRoom],
          ["bottom", roomBelow],
          ["top", roomAbove]
        ];
        placement = rooms.reduce((best, item) => item[1] > best[1] ? item : best)[0];
      }
      let resolvedLeft;
      let resolvedTop;
      if (placement === "left") {
        resolvedLeft = clamp(anchorLeft - gap - popWidth, left + pad, right - pad - popWidth);
        resolvedTop = clamp(anchorTop, top + pad, bottom - pad - popHeight);
      } else if (placement === "right") {
        resolvedLeft = clamp(anchorRight + gap, left + pad, right - pad - popWidth);
        resolvedTop = clamp(anchorTop, top + pad, bottom - pad - popHeight);
      } else {
        resolvedLeft = clamp(infoRight - popWidth, left + pad, right - pad - popWidth);
        const desiredTop = placement === "bottom" ? anchorBottom + gap : anchorTop - gap - popHeight;
        resolvedTop = clamp(desiredTop, top + pad, bottom - pad - popHeight);
      }
      return {
        left: Math.round(resolvedLeft),
        top: Math.round(resolvedTop),
        placement
      };
    }
    module2.exports = { placeTooltip };
  }
});

// src/footer.cjs
var require_footer = __commonJS({
  "src/footer.cjs"(exports2, module2) {
    "use strict";
    var { TOKEN_KEYS, formatCost, formatDuration, tokenComposition } = require_core();
    var { placeTooltip } = require_placement();
    var FOOTER_ATTR = "data-token-usage";
    var SHOW_DELAY_MS = 120;
    var HIDE_DELAY_MS = 80;
    var popoverSeq = 0;
    var CSS2 = `
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
/* Historical class name: this dock now hosts the session summary capsule. */
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
`;
    function make(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== void 0) element.textContent = text;
      return element;
    }
    function setText2(node, text) {
      if (!node) return;
      if (node.firstChild && node.firstChild.nodeType === 3 && node.childNodes.length === 1) {
        if (node.firstChild.nodeValue !== text) node.firstChild.nodeValue = text;
        return;
      }
      node.textContent = text;
    }
    function separator() {
      const node = make("span", "tu-sep", "\xB7");
      node.setAttribute("aria-hidden", "true");
      return node;
    }
    function infoIcon() {
      const namespace = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(namespace, "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      const circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("cx", "8");
      circle.setAttribute("cy", "8");
      circle.setAttribute("r", "6.3");
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", "currentColor");
      circle.setAttribute("stroke-width", "1.25");
      const dot = document.createElementNS(namespace, "circle");
      dot.setAttribute("cx", "8");
      dot.setAttribute("cy", "4.8");
      dot.setAttribute("r", "0.75");
      dot.setAttribute("fill", "currentColor");
      const stem = document.createElementNS(namespace, "path");
      stem.setAttribute("d", "M8 7.2v4.1");
      stem.setAttribute("fill", "none");
      stem.setAttribute("stroke", "currentColor");
      stem.setAttribute("stroke-width", "1.25");
      stem.setAttribute("stroke-linecap", "round");
      svg.append(circle, dot, stem);
      return svg;
    }
    function createFooter2(turn, view) {
      const copy = view.copy;
      const root = document.createElement("div");
      root.setAttribute(FOOTER_ATTR, "");
      root.setAttribute("role", "note");
      root.setAttribute("aria-live", "off");
      const values = {};
      const groups = {};
      root.append(make("span", "tu-label", turn && turn.session ? copy.session : copy.turnLabel));
      const item = (key, text, className) => {
        const group = make("span", "tu-group");
        const wrap = make("span", className ? `tu-item ${className}` : "tu-item");
        const value = make("span", "tu-val");
        wrap.append(make("span", "tu-key", text), value);
        group.append(separator(), wrap);
        root.append(group);
        values[key] = value;
        groups[key] = group;
        return wrap;
      };
      item("input", copy.input);
      item("output", copy.output);
      if (!view.compact) {
        if (view.detailed) item("reasoning", copy.reasoning);
        item("cacheRead", copy.cacheRead);
        if (view.detailed) item("cacheWrite", copy.cacheWrite);
        item("cacheHit", copy.cacheHit);
      }
      item("total", copy.total, "tu-total");
      let costEl = null;
      let costGroup = null;
      if (view.showCost) {
        costGroup = make("span", "tu-cost-group");
        costEl = make("span", "tu-cost");
        costGroup.append(separator(), costEl);
        root.append(costGroup);
      }
      const info = document.createElement("button");
      info.type = "button";
      info.className = "tu-info";
      info.setAttribute("aria-label", copy.showDetails);
      info.setAttribute("aria-expanded", "false");
      info.append(infoIcon());
      root.append(info);
      const pop = make("div", "tu-pop");
      pop.id = `tu-pop-${++popoverSeq}`;
      pop.setAttribute("role", "tooltip");
      pop.setAttribute("aria-hidden", "true");
      info.setAttribute("aria-describedby", pop.id);
      const head = make("div", "tu-pop-head");
      const title = make("div", "tu-pop-title");
      title.append(make("span", "tu-eyebrow", turn && turn.session ? copy.sessionBreakdown : copy.breakdown));
      const totalLine = make("span", "tu-pop-total");
      const totalNum = make("span", "tu-total-num");
      const totalUnit = make("span", "tu-total-unit", copy.tokens);
      totalLine.append(totalNum, totalUnit);
      title.append(totalLine);
      const costBlock = make("div", "tu-cost-block");
      const costMain = make("span", "tu-cost-main");
      const costAlt = make("span", "tu-cost-alt");
      costBlock.append(costMain, costAlt);
      head.append(title, costBlock);
      pop.append(head);
      const bar = make("div", "tu-bar");
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", copy.composition);
      const segments = {};
      for (const key of TOKEN_KEYS) {
        const segment = make("span", "tu-seg");
        segment.dataset.metric = key;
        bar.append(segment);
        segments[key] = segment;
      }
      pop.append(bar);
      const grid = make("div", "tu-grid");
      const cells = {};
      for (const key of TOKEN_KEYS) {
        const cell = make("div", "tu-cell");
        const dot = make("span", "tu-dot");
        dot.dataset.metric = key;
        const value = make("span", "tu-cell-val");
        cell.append(dot, make("span", "tu-cell-key", copy[key]), value);
        grid.append(cell);
        cells[key] = value;
      }
      const hitCell = make("div", "tu-cell");
      const hitDot = make("span", "tu-dot tu-dot-ring");
      const hitValue = make("span", "tu-cell-val");
      hitCell.append(hitDot, make("span", "tu-cell-key", copy.cacheHit), hitValue);
      grid.append(hitCell);
      pop.append(grid);
      const meta = make("div", "tu-pop-meta");
      const rate = make("div", "tu-pop-rate");
      pop.append(meta, rate);
      const portal = make("div", "tu-portal");
      portal.append(pop);
      document.body.append(portal);
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
        dispose: null
      };
      updateFooter2(entry, turn, view);
      return entry;
    }
    function updateFooter2(entry, turn, view) {
      if (!entry || !turn) return;
      entry.turn = turn;
      const copy = view.copy;
      const totals = turn.totals;
      const rateLine = view.rateLine();
      const signature = [
        totals.input,
        totals.output,
        totals.reasoning,
        totals.cacheRead,
        totals.cacheWrite,
        totals.total,
        turn.cost,
        turn.requests,
        turn.turns,
        turn.partial,
        turn.durationMs,
        turn.cacheHitRate,
        view.currency,
        rateLine
      ].join("|");
      if (entry.signature === signature) return;
      entry.signature = signature;
      setText2(entry.totalNum, view.int(totals.total));
      const showCost = view.showCost && turn.cost > 0;
      if (entry.costGroup) entry.costGroup.hidden = !showCost;
      setText2(entry.costEl, showCost ? view.money(turn.cost) : "");
      if (entry.costBlock) {
        entry.costBlock.hidden = !showCost;
        if (showCost) {
          setText2(entry.costMain, view.money(turn.cost));
          const original = view.currency === "CNY" ? formatCost(turn.cost, view.locale) : "";
          entry.costAlt.hidden = !original;
          setText2(entry.costAlt, original ? `\u2248 ${original}` : "");
        }
      }
      for (const key of TOKEN_KEYS) {
        setText2(entry.cells[key], view.int(totals[key]));
      }
      const composition = tokenComposition(totals);
      entry.bar.hidden = !composition.some((part) => part.value > 0);
      for (const part of composition) {
        const segment = entry.segments[part.key];
        segment.hidden = part.share <= 0;
        segment.style.width = `${(part.share * 100).toFixed(4)}%`;
      }
      const hit = turn.cacheHitRate !== null && Number.isFinite(turn.cacheHitRate) ? turn.cacheHitRate : null;
      entry.hitCell.hidden = hit === null;
      setText2(entry.hitValue, hit === null ? "\u2014" : view.percent(hit));
      const parts = [];
      if (turn.session && turn.turns > 0) {
        const unit = turn.turns === 1 ? copy.turn : copy.turns;
        parts.push(`${view.int(turn.turns)} ${unit}`);
      }
      parts.push(`${view.int(turn.requests)} ${copy.requests}`);
      if (turn.durationMs > 0) parts.push(formatDuration(turn.durationMs));
      if (turn.session && turn.partial) parts.push(copy.loaded);
      setText2(entry.meta, parts.join(" \xB7 "));
      const rateText = view.showCost && turn.cost > 0 ? rateLine : "";
      entry.rate.hidden = !rateText;
      setText2(entry.rate, rateText);
      if (entry.reposition && entry.isOpen()) entry.reposition();
    }
    function bindTooltip2(entry, view) {
      const { root, info, pop, portal } = entry;
      let open = false;
      let pinned = false;
      let showTimer;
      let hideTimer;
      let listening = false;
      let onScroll = null;
      let onResize = null;
      let onOutside = null;
      let followTimer = null;
      const hovered = () => root.matches(":hover") || portal.matches(":hover");
      const position = () => {
        if (!open || !root.isConnected) return;
        const area2 = {
          top: 0,
          left: 0,
          right: window.innerWidth || document.documentElement.clientWidth || 0,
          bottom: window.innerHeight || document.documentElement.clientHeight || 0
        };
        if (area2.right - area2.left < 140 || area2.bottom - area2.top < 120) return;
        pop.style.maxWidth = `${Math.max(160, area2.right - area2.left - 16)}px`;
        pop.style.maxHeight = `${Math.max(140, area2.bottom - area2.top - 16)}px`;
        const anchor = root.getBoundingClientRect();
        const result = placeTooltip({
          anchor: { top: anchor.top, bottom: anchor.bottom, left: anchor.left, right: anchor.right },
          info: info.getBoundingClientRect(),
          pop: { width: pop.offsetWidth, height: pop.offsetHeight },
          bounds: area2,
          gap: 8,
          pad: 8,
          side: view.popoverSide
        });
        portal.style.left = `${Math.round(result.left - 8)}px`;
        portal.style.top = `${Math.round(result.top - 8)}px`;
        pop.dataset.placement = result.placement;
        portal.dataset.placement = result.placement;
      };
      const listen = () => {
        if (listening) return;
        listening = true;
        onScroll = () => position();
        onResize = () => position();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        if (!followTimer) {
          followTimer = setInterval(() => {
            if (open && !document.hidden) position();
          }, 160);
        }
      };
      const unlisten = () => {
        if (!listening) return;
        listening = false;
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onResize);
        onScroll = null;
        onResize = null;
        if (followTimer) {
          clearInterval(followTimer);
          followTimer = null;
        }
      };
      const attachOutside = () => {
        if (onOutside) return;
        onOutside = (event) => {
          if (root.contains(event.target) || portal.contains(event.target)) return;
          setPinned(false);
          hide(0);
        };
        document.addEventListener("pointerdown", onOutside, true);
        document.addEventListener("keydown", handleDocKey, false);
      };
      const detachOutside = () => {
        if (!onOutside) return;
        document.removeEventListener("pointerdown", onOutside, true);
        document.removeEventListener("keydown", handleDocKey, false);
        onOutside = null;
      };
      const handleDocKey = (event) => {
        if (event.key !== "Escape" || !pinned) return;
        if (event.defaultPrevented) return;
        const target = event.target;
        const editing = target.closest && target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="textbox"], [data-component="dock-prompt"], [data-kind="question"], [data-kind="elicitation"], [data-owns-escape]'
        );
        if (editing) return;
        event.stopPropagation();
        setPinned(false);
        hide(0);
      };
      const show = () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        if (!open) {
          open = true;
          updateFooter2(entry, entry.turn, view);
          root.setAttribute("data-open", "true");
          pop.setAttribute("data-open", "true");
          portal.setAttribute("data-open", "true");
          pop.setAttribute("aria-hidden", "false");
          info.setAttribute("aria-expanded", "true");
          listen();
        }
        position();
      };
      const hide = (delay) => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          if (pinned || !open) return;
          open = false;
          root.removeAttribute("data-open");
          pop.removeAttribute("data-open");
          portal.removeAttribute("data-open");
          pop.setAttribute("aria-hidden", "true");
          info.setAttribute("aria-expanded", "false");
          unlisten();
        }, delay);
      };
      function setPinned(value) {
        pinned = Boolean(value);
        root.toggleAttribute("data-pinned", pinned);
        info.setAttribute("aria-label", pinned ? view.copy.hideDetails : view.copy.showDetails);
        if (pinned) {
          show();
          attachOutside();
        } else {
          detachOutside();
          if (!hovered() && !info.matches(":focus-visible")) hide(0);
        }
      }
      const onEnter = () => {
        if (pinned) return;
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        showTimer = setTimeout(show, SHOW_DELAY_MS);
      };
      const onLeave = () => {
        clearTimeout(showTimer);
        if (!pinned && !info.matches(":focus-visible")) hide(HIDE_DELAY_MS);
      };
      const onPortalEnter = () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        if (!open) show();
        else position();
      };
      const onPortalLeave = () => {
        if (!pinned) hide(HIDE_DELAY_MS);
      };
      const onClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = !pinned;
        setPinned(next);
        if (!next) hide(0);
      };
      const onFocus = () => show();
      const onBlur = () => {
        if (!pinned && !hovered()) hide(0);
      };
      const onKeyDown = (event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        setPinned(false);
        hide(0);
      };
      const onRemove = () => {
        pinned = false;
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        unlisten();
        detachOutside();
      };
      root.addEventListener("pointerenter", onEnter);
      root.addEventListener("pointerleave", onLeave);
      portal.addEventListener("pointerenter", onPortalEnter);
      portal.addEventListener("pointerleave", onPortalLeave);
      info.addEventListener("click", onClick);
      info.addEventListener("focus", onFocus);
      info.addEventListener("blur", onBlur);
      root.addEventListener("keydown", onKeyDown);
      entry.reposition = position;
      entry.isOpen = () => open;
      entry.close = () => {
        setPinned(false);
        hide(0);
      };
      entry.dispose = () => {
        onRemove();
        root.removeEventListener("pointerenter", onEnter);
        root.removeEventListener("pointerleave", onLeave);
        portal.removeEventListener("pointerenter", onPortalEnter);
        portal.removeEventListener("pointerleave", onPortalLeave);
        info.removeEventListener("click", onClick);
        info.removeEventListener("focus", onFocus);
        info.removeEventListener("blur", onBlur);
        root.removeEventListener("keydown", onKeyDown);
        portal.remove();
      };
      return entry;
    }
    module2.exports = {
      CSS: CSS2,
      FOOTER_ATTR,
      bindTooltip: bindTooltip2,
      createFooter: createFooter2,
      updateFooter: updateFooter2
    };
  }
});

// src/gui.cjs
var { Plugin, Style } = require("@opencode/plugin/gui");
var {
  METRICS,
  addSessionTokens,
  approachValue,
  buildTurns,
  cacheHitRate,
  clampNumber,
  emptyTotals,
  finite,
  formatMoney,
  normalizeCurrency,
  normalizePopoverSide,
  normalizeRefreshMode,
  sameTotals,
  smoothingAlpha,
  summarizeTurns
} = require_core();
var {
  CSS,
  bindTooltip,
  createFooter,
  updateFooter
} = require_footer();
var STYLE_ID = "opencode-token-usage-gui-style";
var GUARD_KEY = "__OPENCODE_TOKEN_USAGE_GUI__";
var DEFAULT_REFRESH_MS = 500;
var MIN_REFRESH_MS = 16;
var MAX_REFRESH_MS = 5e3;
var DEFAULT_TWEEN_MS = 550;
var MAX_TWEEN_MS = 2e3;
var DEFAULT_SAMPLE_MS = 100;
var MIN_SAMPLE_MS = 50;
var MAX_SAMPLE_MS = 1e3;
var DEFAULT_SMOOTH_MS = 250;
var MIN_SMOOTH_MS = 50;
var MAX_SMOOTH_MS = 2e3;
var IDLE_SAMPLE_MS = 1e3;
var MUTATION_DELAY_MS = 120;
var DEFAULT_USD_TO_CNY = 6.68;
var FX_CACHE_KEY = "opencode-token-usage-gui:fx";
var FX_URL = "https://open.er-api.com/v6/latest/USD";
var FX_TTL_MS = 24 * 60 * 60 * 1e3;
var FX_TIMEOUT_MS = 8e3;
var COPY = {
  en: {
    turnLabel: "This turn",
    turn: "turn",
    session: "Session",
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
    sessionBreakdown: "Session breakdown",
    turns: "turns",
    composition: "Token composition",
    loaded: "loaded",
    showDetails: "Show token breakdown",
    hideDetails: "Hide token breakdown"
  },
  zh: {
    turnLabel: "\u672C\u8F6E",
    turn: "\u8F6E",
    session: "\u672C\u6B21\u4F1A\u8BDD",
    input: "\u8F93\u5165",
    output: "\u8F93\u51FA",
    reasoning: "\u63A8\u7406",
    cacheRead: "\u7F13\u5B58\u8BFB",
    cacheWrite: "\u7F13\u5B58\u5199",
    cacheHit: "\u7F13\u5B58\u547D\u4E2D",
    total: "\u5408\u8BA1",
    tokens: "tokens",
    requests: "\u6B21\u6A21\u578B\u8BF7\u6C42",
    rate: "\u6C47\u7387",
    rateManual: "\u624B\u52A8",
    rateAuto: "\u81EA\u52A8",
    rateFallback: "\u515C\u5E95",
    breakdown: "\u672C\u8F6E\u660E\u7EC6",
    sessionBreakdown: "\u4F1A\u8BDD\u660E\u7EC6",
    turns: "\u8F6E",
    composition: "tokens \u6784\u6210",
    loaded: "\u5DF2\u52A0\u8F7D",
    showDetails: "\u67E5\u770B\u7528\u91CF\u660E\u7EC6",
    hideDetails: "\u6536\u8D77\u7528\u91CF\u660E\u7EC6"
  }
};
function pickLocale(ctx) {
  try {
    const value = ctx.locale && typeof ctx.locale.locale === "function" ? ctx.locale.locale() : "";
    if (value) return String(value).toLowerCase().replace(/_/g, "-");
  } catch {
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().replace(/_/g, "-");
  }
  return "en";
}
function readFxCache() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const rate = Number(parsed && parsed.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return { rate, at: Number(parsed && parsed.at) || 0 };
  } catch {
    return null;
  }
}
function writeFxCache(value) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FX_CACHE_KEY, JSON.stringify(value));
    }
  } catch {
  }
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
function findComposerFace(scroll) {
  const panel = scroll && scroll.closest ? scroll.closest('[data-slot="session-chat-panel"]') : null;
  const scope = panel || document;
  let faces = Array.from(scope.querySelectorAll('[data-slot="composer-face"]')).filter(isVisible);
  if (faces.length === 0 && scope !== document) {
    faces = Array.from(document.querySelectorAll('[data-slot="composer-face"]')).filter(isVisible);
  }
  if (faces.length === 0) return null;
  return faces.reduce((best, item) => area(item) > area(best) ? item : best, faces[0]);
}
var readPendingInputIds = (session) => {
  const data = session && session.server && session.server.data;
  const api = data && data.session && data.session.pending;
  if (!api || typeof api.list !== "function") return null;
  try {
    const items = api.list(session.id);
    if (!Array.isArray(items)) return null;
    const ids = /* @__PURE__ */ new Set();
    for (const item of items) {
      if (item && item.type === "user" && item.id) ids.add(item.id);
    }
    return ids;
  } catch {
    return null;
  }
};
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
function paint(entry, view) {
  for (const key of METRICS) {
    const value = entry.values[key];
    if (value) setText(value, view.int(entry.current[key]));
  }
  const hit = cacheHitRate(entry.current);
  if (entry.values.cacheHit) {
    setText(entry.values.cacheHit, view.percent(hit));
    entry.groups.cacheHit.hidden = hit === null;
  }
  if (entry.values.cacheWrite) {
    entry.groups.cacheWrite.hidden = finite(entry.current.cacheWrite) <= 0;
  }
}
function applyTurn(entry, turn, view, animate) {
  const changed = !sameTotals(entry.target, turn.totals);
  entry.turn = turn;
  updateFooter(entry, turn, view);
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
  if (view.continuous) {
    entry.target = next;
    view.ensureAnimation();
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
    const resolvedLocale = (() => {
      try {
        return new Intl.NumberFormat(locale).resolvedOptions().locale;
      } catch {
        return "en-US";
      }
    })();
    const options = ctx.options || {};
    const compact = options.compact === true;
    const detailed = options.detailed === true;
    const showCost = options.showCost !== false;
    const refreshMode = normalizeRefreshMode(options.refreshMode);
    const continuous = refreshMode === "continuous";
    const refreshMs = clampNumber(options.refreshMs, MIN_REFRESH_MS, MAX_REFRESH_MS, DEFAULT_REFRESH_MS);
    const tweenMs = clampNumber(options.tweenMs, 0, MAX_TWEEN_MS, DEFAULT_TWEEN_MS);
    const sampleMs = clampNumber(options.sampleMs, MIN_SAMPLE_MS, MAX_SAMPLE_MS, DEFAULT_SAMPLE_MS);
    const smoothMs = clampNumber(options.smoothMs, MIN_SMOOTH_MS, MAX_SMOOTH_MS, DEFAULT_SMOOTH_MS);
    const animate = options.animate !== false && !reducedMotion() && (continuous || tweenMs > 0);
    const currency = normalizeCurrency(options.currency, locale);
    const popoverSide = normalizePopoverSide(options.popoverSide);
    const autoRate = String(options.usdToCny).toLowerCase() === "auto";
    const manualRate = finite(options.usdToCny) > 0 ? finite(options.usdToCny) : DEFAULT_USD_TO_CNY;
    const rate = { value: manualRate, at: 0, source: "manual" };
    const intFmt = new Intl.NumberFormat(resolvedLocale, { maximumFractionDigits: 0 });
    const pctFmt = new Intl.NumberFormat(resolvedLocale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    const view = {
      locale: resolvedLocale,
      copy,
      compact,
      detailed,
      showCost,
      continuous,
      currency,
      popoverSide,
      money: (usd) => formatMoney(
        finite(usd) * (currency === "CNY" ? rate.value : 1),
        currency,
        resolvedLocale
      ),
      rateLine: () => {
        if (currency !== "CNY" || !(rate.value > 0)) return "";
        let source = copy.rateManual;
        if (rate.source === "auto") {
          source = copy.rateAuto;
          if (rate.at > 0) {
            const date = new Date(rate.at);
            const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
              date.getDate()
            ).padStart(2, "0")}`;
            source += ` (${stamp})`;
          }
        } else if (rate.source === "fallback") {
          source = copy.rateFallback;
        }
        return `${copy.rate} ${rate.value.toFixed(2)} \xB7 ${source}`;
      },
      int: (value) => intFmt.format(Math.round(finite(value))),
      percent: (value) => value === null || value === void 0 || !Number.isFinite(Number(value)) ? "\u2014" : pctFmt.format(Number(value) / 100),
      ensureAnimation: () => {
        if (animate && frame === void 0) {
          lastFrame = 0;
          frame = requestAnimationFrame(tick);
        }
      }
    };
    const previous = window[GUARD_KEY];
    if (previous && typeof previous.cleanup === "function") {
      try {
        previous.cleanup();
      } catch {
      }
    }
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
    let sampleTimer;
    let frame;
    let lastFrame = 0;
    let mutationTimer;
    let observedScroll = null;
    let warned = false;
    let disposed = false;
    let cleaned = false;
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
    const ensureSummaryHost = (scroll) => {
      const face = findComposerFace(scroll);
      const morph = face && face.parentElement;
      const column = morph && morph.parentElement;
      const dock = column && column.closest('[data-component="session-composer-dock"]');
      if (face && morph && morph.matches && morph.matches('[data-slot="composer-morph"]') && column && dock) {
        let host = column.querySelector(":scope > [data-token-usage-live]");
        if (!host) {
          host = document.createElement("div");
          host.className = "tu-live-dock";
          host.setAttribute("data-token-usage-live", "");
        }
        if (column.firstElementChild !== host) column.prepend(host);
        return host;
      }
      const spacer = scroll.querySelector('[data-timeline-row="bottom-spacer"]');
      if (!spacer) return null;
      let lane = spacer.querySelector(":scope > [data-token-usage-live]");
      if (!lane) {
        lane = document.createElement("div");
        lane.className = "tu-live-lane";
        lane.setAttribute("data-token-usage-live", "");
        spacer.append(lane);
      }
      return lane;
    };
    const tick = (now) => {
      if (continuous) {
        const dt = lastFrame ? Math.max(0, now - lastFrame) : 16.67;
        lastFrame = now;
        const alpha = smoothingAlpha(dt, smoothMs);
        let active2 = false;
        for (const entry of state.values()) {
          let done = true;
          for (const key of METRICS) {
            const target = entry.target[key];
            if (Math.abs(target - entry.current[key]) < 0.5) {
              entry.current[key] = target;
            } else {
              entry.current[key] = approachValue(entry.current[key], target, alpha);
              done = false;
            }
          }
          paint(entry, view);
          if (!done) active2 = true;
        }
        frame = active2 ? requestAnimationFrame(tick) : void 0;
        if (!active2) lastFrame = 0;
        return;
      }
      let active = false;
      for (const entry of state.values()) {
        if (!entry.startedAt) continue;
        const progress = Math.min(1, (now - entry.startedAt) / tweenMs);
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
      const seen = /* @__PURE__ */ new Set();
      let sessionId = null;
      let known = null;
      let running = false;
      try {
        const session = ctx.sessions.current();
        if (!session || !session.id) return;
        sessionId = session.id;
        const data = session.server && session.server.data;
        const messagesApi = data && data.session && data.session.message;
        if (!messagesApi || typeof messagesApi.list !== "function") return;
        const messages = messagesApi.list(session.id);
        if (!Array.isArray(messages) || messages.length === 0) return;
        const info = data.session.get && data.session.get(session.id);
        const pendingInputIds = readPendingInputIds(session) || void 0;
        const turns = buildTurns(
          messages,
          info && info.revert && info.revert.messageID,
          pendingInputIds
        );
        if (turns.size === 0) return;
        const scroll = findScroll();
        if (!scroll) return;
        observe(scroll);
        const statusApi = data.session && data.session.status;
        running = false;
        if (typeof statusApi === "function") {
          try {
            running = statusApi.call(data.session, session.id) === "running";
          } catch {
          }
        }
        const summary = summarizeTurns(turns);
        const ledger = emptyTotals();
        let ledgerOk = false;
        try {
          if (info && info.tokens) {
            const family = info.parentID || typeof data.session.family !== "function" ? null : data.session.family(session.id);
            const ids = Array.from(/* @__PURE__ */ new Set([session.id, ...Array.isArray(family) ? family : []]));
            for (const id of ids) {
              const entry = data.session.get(id);
              if (entry && entry.tokens) {
                addSessionTokens(ledger, entry.tokens);
                ledgerOk = true;
              }
            }
          }
        } catch {
        }
        if (ledgerOk && ledger.total > 0) {
          summary.totals = ledger;
          summary.cacheHitRate = cacheHitRate(ledger);
        }
        if (info && Number.isFinite(Number(info.cost)) && Number(info.cost) > 0) {
          try {
            summary.cost = typeof data.session.cost === "function" ? finite(data.session.cost(session.id)) : finite(info.cost);
          } catch {
            summary.cost = finite(info.cost);
          }
        }
        try {
          summary.partial = typeof data.session.message.more === "function" ? Boolean(data.session.message.more.call(data.session.message, session.id)) : !ledgerOk;
        } catch {
          summary.partial = !ledgerOk;
        }
        const hasSummary = summary.totals.total > 0 || summary.cost > 0;
        const summaryHost = hasSummary ? ensureSummaryHost(scroll) : null;
        const byUser = /* @__PURE__ */ new Map();
        const byMessage = /* @__PURE__ */ new Map();
        known = /* @__PURE__ */ new Set();
        for (const [turnId, turn] of turns) {
          for (const userId of turn.userIds || []) byUser.set(userId, turnId);
          for (const messageId of turn.messageIds) byMessage.set(messageId, turnId);
          known.add(turnId);
          for (const id of turn.userIds || []) known.add(id);
          for (const id of turn.messageIds) known.add(id);
        }
        const rows = collectRows(scroll);
        if (rows.length === 0 && !running && !hasSummary) return;
        const chosen = /* @__PURE__ */ new Map();
        for (const row of rows) {
          const id = row.getAttribute("data-message-id");
          if (!id) continue;
          const turnId = turns.has(id) ? id : byUser.get(id) || byMessage.get(id);
          if (!turnId) continue;
          const turn = turns.get(turnId);
          if (!turn || turn.totals.total <= 0 && turn.cost <= 0) continue;
          chosen.set(turnId, row);
        }
        for (const [turnId, row] of chosen) {
          const turn = turns.get(turnId);
          if (!turn) continue;
          const key = `${session.id}:${turnId}`;
          seen.add(key);
          let entry = state.get(key);
          if (!entry) {
            entry = createFooter(turn, view);
            entry.target = { ...turn.totals };
            entry.current = { ...turn.totals };
            entry.from = { ...turn.totals };
            entry.startedAt = 0;
            entry.scrollEl = scroll;
            bindTooltip(entry, view);
            state.set(key, entry);
            paint(entry, view);
          } else {
            entry.scrollEl = scroll;
            applyTurn(entry, turn, view, animate);
          }
          const target = row ? contentTarget(row) : null;
          if (!target) continue;
          if (entry.targetEl !== target || !entry.root.isConnected || entry.root.parentElement !== target) {
            target.appendChild(entry.root);
            entry.targetEl = target;
            if (entry.isOpen()) entry.reposition();
          }
        }
        if (hasSummary && summaryHost) {
          const key = `${session.id}:__summary__`;
          seen.add(key);
          let entry = state.get(key);
          if (!entry) {
            entry = createFooter(summary, view);
            entry.sessionSummary = true;
            entry.target = { ...summary.totals };
            entry.current = { ...summary.totals };
            entry.from = { ...summary.totals };
            entry.startedAt = 0;
            entry.scrollEl = scroll;
            bindTooltip(entry, view);
            state.set(key, entry);
            paint(entry, view);
          } else {
            entry.scrollEl = scroll;
            applyTurn(entry, summary, view, animate);
          }
          if (entry.targetEl !== summaryHost || entry.root.parentElement !== summaryHost) {
            summaryHost.appendChild(entry.root);
            entry.targetEl = summaryHost;
            if (entry.isOpen()) entry.reposition();
          }
        }
      } finally {
        for (const [key, entry] of state) {
          if (seen.has(key)) continue;
          let stale = true;
          if (sessionId && entry.root.isConnected && key.startsWith(`${sessionId}:`)) {
            if (!known) {
              stale = false;
            } else {
              const owner = entry.targetEl && entry.targetEl.closest ? entry.targetEl.closest("[data-message-id]") : null;
              const id = owner && owner.getAttribute("data-message-id");
              stale = !(id && known.has(id));
            }
          }
          if (entry.sessionSummary && !known) stale = true;
          if (!stale) continue;
          state.delete(key);
          if (entry.dispose) entry.dispose();
          entry.root.remove();
        }
        for (const lane of document.querySelectorAll("[data-token-usage-live]")) {
          if (!lane.firstChild) lane.remove();
        }
      }
    };
    const refresh = () => {
      if (disposed || document.hidden) return;
      try {
        sync();
      } catch (error) {
        warn(error);
      }
    };
    const sampleInterval = () => {
      if (!continuous) return refreshMs;
      const session = ctx.sessions.current();
      const data = session && session.server && session.server.data;
      const status = data && data.session && data.session.status;
      if (typeof status !== "function" || !session.id) return sampleMs;
      try {
        return status.call(data.session, session.id) === "running" ? sampleMs : Math.max(sampleMs, IDLE_SAMPLE_MS);
      } catch {
        return sampleMs;
      }
    };
    const scheduleSample = () => {
      if (sampleTimer) clearTimeout(sampleTimer);
      sampleTimer = void 0;
      if (disposed || document.hidden) return;
      sampleTimer = setTimeout(() => {
        if (disposed) return;
        refresh();
        scheduleSample();
      }, sampleInterval());
    };
    const refreshDetails = () => {
      if (disposed) return;
      for (const entry of state.values()) {
        if (entry.turn) updateFooter(entry, entry.turn, view);
      }
    };
    const loadRate = async () => {
      if (!autoRate || currency !== "CNY" || disposed) return;
      const cached = readFxCache();
      if (cached) {
        rate.value = cached.rate;
        rate.at = cached.at;
        rate.source = "auto";
        refreshDetails();
        if (cached.at > 0 && Date.now() - cached.at < FX_TTL_MS) return;
      }
      try {
        if (typeof fetch !== "function") throw new Error("fetch is not available");
        const controller = typeof AbortController === "function" ? new AbortController() : void 0;
        const timeout = controller ? setTimeout(() => controller.abort(), FX_TIMEOUT_MS) : void 0;
        let response;
        try {
          response = await fetch(FX_URL, {
            headers: { accept: "application/json" },
            signal: controller && controller.signal
          });
        } finally {
          if (timeout) clearTimeout(timeout);
        }
        if (disposed) return;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const value = Number(json && json.rates && json.rates.CNY);
        if (!Number.isFinite(value) || value <= 0) throw new Error("invalid CNY rate");
        rate.value = value;
        rate.at = Date.now();
        rate.source = "auto";
        writeFxCache({ rate: value, at: rate.at });
        refreshDetails();
      } catch (error) {
        if (disposed) return;
        if (!cached) {
          rate.value = manualRate;
          rate.at = 0;
          rate.source = "fallback";
          refreshDetails();
        }
        console.warn(
          "[token-usage-gui] exchange-rate fetch failed; using",
          rate.value,
          error && error.message ? error.message : error
        );
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (sampleTimer) clearTimeout(sampleTimer);
        sampleTimer = void 0;
        return;
      }
      refresh();
      scheduleSample();
    };
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      disposed = true;
      clearTimeout(sampleTimer);
      if (mutationTimer) clearTimeout(mutationTimer);
      if (frame !== void 0) cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const entry of state.values()) {
        if (entry.dispose) entry.dispose();
        entry.root.remove();
      }
      state.clear();
      for (const host of document.querySelectorAll("[data-token-usage-live]")) host.remove();
      if (styleNode) styleNode.remove();
      if (window[GUARD_KEY] && window[GUARD_KEY].cleanup === cleanup) delete window[GUARD_KEY];
    };
    window[GUARD_KEY] = { cleanup };
    document.addEventListener("visibilitychange", onVisibilityChange);
    refresh();
    scheduleSample();
    void loadRate();
    return cleanup;
  }
});
