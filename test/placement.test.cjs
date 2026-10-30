"use strict"

const test = require("node:test")
const assert = require("node:assert/strict")

const { placeTooltip } = require("../src/placement.cjs")

const bounds = { top: 0, bottom: 800, left: 0, right: 1600 }

test("the card defaults to the left gutter of the footer", () => {
  const result = placeTooltip({
    anchor: { top: 500, bottom: 530, left: 500, right: 720 },
    pop: { width: 348, height: 220 },
    bounds,
  })

  assert.equal(result.placement, "left")
  assert.equal(result.left, 144)
  assert.equal(result.top, 500)
})

test("popoverSide right keeps the card in the right gutter when it fits", () => {
  const result = placeTooltip({
    anchor: { top: 500, bottom: 530, left: 500, right: 720 },
    pop: { width: 348, height: 220 },
    bounds,
    side: "right",
  })

  assert.equal(result.placement, "right")
  assert.equal(result.left, 728)
  assert.equal(result.top, 500)
})

test("a left-placed card falls below instead of switching to the right", () => {
  const result = placeTooltip({
    anchor: { top: 400, bottom: 430, left: 100, right: 500 },
    pop: { width: 348, height: 220 },
    bounds,
  })

  assert.equal(result.placement, "bottom")
  assert.equal(result.top, 438)
  assert.equal(result.left, 100)
})

test("a right-placed card falls below instead of switching to the left", () => {
  const result = placeTooltip({
    anchor: { top: 400, bottom: 430, left: 1200, right: 1500 },
    pop: { width: 348, height: 220 },
    bounds,
    side: "right",
  })

  assert.equal(result.placement, "bottom")
  assert.equal(result.top, 438)
  assert.equal(result.left, 1200)
})

test("the card falls above when the chosen side and the space below do not fit", () => {
  const result = placeTooltip({
    anchor: { top: 500, bottom: 530, left: 120, right: 400 },
    pop: { width: 348, height: 220 },
    bounds: { top: 0, bottom: 600, left: 0, right: 600 },
  })

  assert.equal(result.placement, "top")
  assert.equal(result.top, 272)
  assert.equal(result.left, 120)
})

test("a left-placed card is clamped vertically near the bottom", () => {
  const result = placeTooltip({
    anchor: { top: 700, bottom: 730, left: 500, right: 720 },
    pop: { width: 348, height: 220 },
    bounds: { top: 0, bottom: 800, left: 0, right: 2000 },
  })

  assert.equal(result.placement, "left")
  assert.equal(result.left, 144)
  assert.equal(result.top, 572)
})

test("malformed input still degrades to the safe edge instead of NaN", () => {
  const result = placeTooltip({})

  assert.equal(result.left, 8)
  assert.equal(result.top, 8)
  assert.equal(result.placement, "left")
})

test("when nothing fits, the card stays inside the nearest edges", () => {
  const result = placeTooltip({
    anchor: { top: 90, bottom: 120, left: 40, right: 260 },
    pop: { width: 300, height: 260 },
    bounds: { top: 0, bottom: 200, left: 0, right: 300 },
  })

  assert.equal(result.placement, "top")
  assert.equal(result.left, 8)
  assert.equal(result.top, 8)
})
