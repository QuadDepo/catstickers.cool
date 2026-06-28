import { expect, test } from 'vitest'
import { cellAt, nextPan } from './grid'

test('nextPan applies pointer delta to origin', () => {
  expect(nextPan({ x: 10, y: 10 }, { x: 100, y: 100 }, { x: 150, y: 120 })).toEqual({
    x: 60,
    y: 30,
  })
})

test('cellAt hits a sticker but misses the gap between cells', () => {
  const view = { w: 1000, h: 1000, px: 0, py: 0, s: 1 }
  // cell (0,0) spans screen [160, 320); [320, 400) is the gap before the next cell
  expect(cellAt(view, 200, 200)).toMatchObject({ col: 0, row: 0 })
  expect(cellAt(view, 360, 360)).toBeNull()
})
