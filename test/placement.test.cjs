"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")

const { placeTooltip } = require("../src/placement.cjs")

const bounds = { top: 0, bottom: 800, left: 0, right: 1600 }

test("the card prefers to sit above the footer", () => {
  const result = placeTooltip({
    anchor: { top: 500, bottom: 530, left: 120 },
    pop: { width: 348, height: 220 },
    bounds,
  })

  assert.equal(result.placement, "top")
  assert.equal(result.top, 272)
  assert.equal(result.left, 120)
})

test("the card flips below when the timeline has no room above", () => {
  const result = placeTooltip({
    anchor: { top: 40, bottom: 70, left: 120 },
    pop: { width: 348, height: 220 },
    bounds,
  })

  assert.equal(result.placement, "bottom")
  assert.equal(result.top, 78)
})

test("a card wider than the viewport is clamped to the safe left edge", () => {
  const result = placeTooltip({
    anchor: { top: 400, bottom: 430, left: 50 },
    pop: { width: 900, height: 200 },
    bounds: { top: 0, bottom: 800, left: 0, right: 600 },
  })

  assert.equal(result.left, 8)
})

test("the card is clamped inside the right edge", () => {
  const result = placeTooltip({
    anchor: { top: 500, bottom: 530, left: 1500 },
    pop: { width: 348, height: 220 },
    bounds,
  })

  assert.equal(result.left, 1244)
})

test("when neither side fits, the card stays visible and picks the roomier side", () => {
  const result = placeTooltip({
    anchor: { top: 90, bottom: 120, left: 40 },
    pop: { width: 300, height: 260 },
    bounds: { top: 0, bottom: 200, left: 0, right: 800 },
  })

  assert.equal(result.placement, "top")
  assert.equal(result.top, 8)
  assert.equal(result.left, 40)
})

test("malformed input degrades to the safe edge instead of NaN", () => {
  const result = placeTooltip({})

  assert.equal(result.left, 8)
  assert.equal(result.top, 8)
  assert.equal(result.placement, "top")
})
