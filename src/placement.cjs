"use strict"

/**
 * Pure placement math for the details card.
 *
 * The card prefers the configured side (default: the free gutter to the left of
 * the footer), then the space below it, then the space above, and is clamped so
 * it never leaves the visible timeline area. It never switches to the opposite
 * side, so the configured direction stays predictable. Sitting beside the footer
 * keeps the card off the turn's step rows on a wide window. Keeping this DOM-free
 * makes the edge cases testable in Node.
 */

function clamp(value, min, max) {
  if (!(max > min)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * @param {object} input
 * @param {{top:number,bottom:number,left:number,right:number}} input.anchor footer rect
 * @param {{width:number,height:number}} input.pop card size
 * @param {{top:number,bottom:number,left:number,right:number}} input.bounds visible area
 * @param {number} [input.gap] space between footer and card
 * @param {number} [input.pad] minimum distance to the visible edges
 * @param {"left"|"right"} [input.side] preferred side, defaults to left
 * @returns {{left:number, top:number, placement:"left"|"right"|"bottom"|"top"}}
 */
function placeTooltip(input) {
  const anchor = (input && input.anchor) || {}
  const pop = (input && input.pop) || {}
  const bounds = (input && input.bounds) || {}
  const gap = Number.isFinite(input && input.gap) ? input.gap : 8
  const pad = Number.isFinite(input && input.pad) ? input.pad : 8
  const side = input && String(input.side).toLowerCase() === "right" ? "right" : "left"

  const anchorTop = Number.isFinite(anchor.top) ? anchor.top : 0
  const anchorBottom = Number.isFinite(anchor.bottom) ? anchor.bottom : anchorTop
  const anchorLeft = Number.isFinite(anchor.left) ? anchor.left : 0
  const anchorRight = Number.isFinite(anchor.right) ? anchor.right : anchorLeft
  const popWidth = Math.max(0, Number(pop.width) || 0)
  const popHeight = Math.max(0, Number(pop.height) || 0)

  const top = Number.isFinite(bounds.top) ? bounds.top : 0
  const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top
  const left = Number.isFinite(bounds.left) ? bounds.left : 0
  const right = Number.isFinite(bounds.right) ? bounds.right : left

  const roomLeft = anchorLeft - gap - popWidth - (left + pad)
  const roomRight = right - pad - (anchorRight + gap) - popWidth
  const roomBelow = bottom - pad - (anchorBottom + gap) - popHeight
  const roomAbove = anchorTop - gap - popHeight - (top + pad)

  const sideRoom = side === "left" ? roomLeft : roomRight

  let placement
  if (sideRoom >= 0) placement = side
  else if (roomBelow >= 0) placement = "bottom"
  else if (roomAbove >= 0) placement = "top"
  else {
    const rooms = [
      [side, sideRoom],
      ["bottom", roomBelow],
      ["top", roomAbove],
    ]
    placement = rooms.reduce((best, item) => (item[1] > best[1] ? item : best))[0]
  }

  let resolvedLeft
  let resolvedTop
  if (placement === "left") {
    resolvedLeft = clamp(anchorLeft - gap - popWidth, left + pad, right - pad - popWidth)
    resolvedTop = clamp(anchorTop, top + pad, bottom - pad - popHeight)
  } else if (placement === "right") {
    resolvedLeft = clamp(anchorRight + gap, left + pad, right - pad - popWidth)
    resolvedTop = clamp(anchorTop, top + pad, bottom - pad - popHeight)
  } else {
    resolvedLeft = clamp(anchorLeft, left + pad, right - pad - popWidth)
    const desiredTop = placement === "bottom" ? anchorBottom + gap : anchorTop - gap - popHeight
    resolvedTop = clamp(desiredTop, top + pad, bottom - pad - popHeight)
  }

  return {
    left: Math.round(resolvedLeft),
    top: Math.round(resolvedTop),
    placement,
  }
}

module.exports = { placeTooltip }
