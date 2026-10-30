"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")

const { placeTooltip } = require("../src/placement.cjs")

const bounds = { top: 0, bottom: 800, left: 0, right: 1600 }

test("the card prefers the free gutter to the right of the footer", () => {
  const result = placeTooltip({
    anchor: { top: 500, bottom: 530, left: 120, right: 720 },
    pop: { width: 348, height: 220 },
    bounds,
  })

  assert.equal(result.placement, "right")
  assert.equal(result.left, 728)
  assert.equal(result.top, 500)
})

test("the card falls below when the right gutter is too narrow", () => {
  const result = placeTooltip({
    anchor: { top: 40, bottom: 70, left: 120, right: 720 },
    pop: { width: 348, height: 220 },
    bounds: { top: 0, bottom: 800, left: 0, right: 800 },
  })

  assert.equal(result.placement, "bottom")
  assert.equal(result.top, 78)
  assert.equal(result.left, 120)
})

test("the card falls above when the right gutter and the space below do not fit", () => {
  const result = placeTooltip({
    anchor: { top: 500, bottom: 530, left: 120, right: 400 },
    pop: { width: 348, height: 220 },
    bounds: { top: 0, bottom: 600, left: 0, right: 600 },
  })

  assert.equal(result.placement, "top")
  assert.equal(result.top, 272)
  assert.equal(result.left, 120)
})

test("a right-placed card is clamped vertically near the bottom", () => {
  const result = placeTooltip({
    anchor: { top: 700, bottom: 730, left: 120, right: 720 },
    pop: { width: 348, height: 220 },
    bounds: { top: 0, bottom: 800, left: 0, right: 2000 },
  })

  assert.equal(result.placement, "right")
  assert.equal(result.left, 728)
  assert.equal(result.top, 572)
})

test("a narrow viewport keeps the card inside the right edge", () => {
  const result = placeTooltip({
    anchor: { top: 300, bottom: 330, left: 300, right: 380 },
    pop: { width: 348, height: 220 },
    bounds: { top: 0, bottom: 800, left: 0, right: 420 },
  })

  assert.ok(result.left + 348 <= 420 - 8)
  assert.ok(result.left >= 8)
})

test("malformed input still degrades to the safe edge instead of NaN", () => {
  const result = placeTooltip({})

  assert.equal(result.left, 8)
  assert.equal(result.top, 8)
  assert.equal(result.placement, "right")
})
