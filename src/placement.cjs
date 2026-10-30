"use strict"

/**
 * Pure placement math for the details card.
 *
 * The card prefers to sit above the footer, flips below when the timeline has
 * no room above, and is clamped so it never leaves the visible timeline area.
 * Keeping this DOM-free makes the edge cases testable in Node.
 */

function clamp(value, min, max) {
  if (!(max > min)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * @param {object} input
 * @param {{top:number,bottom:number,left:number}} input.anchor footer rect
 * @param {{width:number,height:number}} input.pop card size
 * @param {{top:number,bottom:number,left:number,right:number}} input.bounds visible area
 * @param {number} [input.gap] space between footer and card
 * @param {number} [input.pad] minimum distance to the visible edges
 * @returns {{left:number, top:number, placement:"top"|"bottom"}}
 */
function placeTooltip(input) {
  const anchor = (input && input.anchor) || {}
  const pop = (input && input.pop) || {}
  const bounds = (input && input.bounds) || {}
  const gap = Number.isFinite(input && input.gap) ? input.gap : 8
  const pad = Number.isFinite(input && input.pad) ? input.pad : 8

  const anchorTop = Number.isFinite(anchor.top) ? anchor.top : 0
  const anchorBottom = Number.isFinite(anchor.bottom) ? anchor.bottom : anchorTop
  const anchorLeft = Number.isFinite(anchor.left) ? anchor.left : 0
  const popWidth = Math.max(0, Number(pop.width) || 0)
  const popHeight = Math.max(0, Number(pop.height) || 0)

  const top = Number.isFinite(bounds.top) ? bounds.top : 0
  const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top
  const left = Number.isFinite(bounds.left) ? bounds.left : 0
  const right = Number.isFinite(bounds.right) ? bounds.right : left

  const roomAbove = anchorTop - gap - popHeight - (top + pad)
  const roomBelow = bottom - pad - (anchorBottom + gap) - popHeight

  let placement = "top"
  if (roomAbove >= 0) placement = "top"
  else if (roomBelow >= 0) placement = "bottom"
  else placement = roomBelow > roomAbove ? "bottom" : "top"

  const desiredTop = placement === "top" ? anchorTop - gap - popHeight : anchorBottom + gap
  const maxTop = bottom - pad - popHeight
  const resolvedTop = clamp(desiredTop, top + pad, maxTop)

  const maxLeft = right - pad - popWidth
  const resolvedLeft = clamp(anchorLeft, left + pad, maxLeft)

  return {
    left: Math.round(resolvedLeft),
    top: Math.round(resolvedTop),
    placement,
  }
}

module.exports = { placeTooltip }
