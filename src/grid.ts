import { stickers } from './stickers'

type Point = { x: number; y: number }
export type View = { w: number; h: number; px: number; py: number; s: number }
export type Cell = { key: string; src: string; alt: string; x: number; y: number; size: number }
export type Hit = { col: number; row: number; src: string; alt: string }

export const CELL = 240
export const SIZE = 160
export const OX = 160
export const OY = 160
const COLS = Math.max(1, Math.ceil(Math.sqrt(stickers.length)))
const ROWS = Math.max(1, Math.ceil(stickers.length / COLS))
export const N = stickers.length

const mod = (a: number, n: number): number => ((a % n) + n) % n

// the grid tiles the sticker list infinitely in both axes; this maps any cell to its sticker
function stickerAt(col: number, row: number) {
  return stickers[mod(mod(row, ROWS) * COLS + mod(col, COLS), N)]
}

export function nextPan(origin: Point, start: Point, current: Point): Point {
  return { x: origin.x + (current.x - start.x), y: origin.y + (current.y - start.y) }
}

// world point (wx, wy) -> screen (wx*s + px, wy*s + py)
const toScreenX = (col: number, view: View) => (col * CELL + OX) * view.s + view.px
const toScreenY = (row: number, view: View) => (row * CELL + OY) * view.s + view.py

// only cells whose scaled rect intersects the viewport render
export function visibleCells(view: View): Cell[] {
  if (N === 0) return []
  const s = view.s
  const minCol = Math.floor((-view.px / s - SIZE - OX) / CELL)
  const maxCol = Math.ceil(((view.w - view.px) / s - OX) / CELL)
  const minRow = Math.floor((-view.py / s - SIZE - OY) / CELL)
  const maxRow = Math.ceil(((view.h - view.py) / s - OY) / CELL)
  const cells: Cell[] = []
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const sticker = stickerAt(col, row)
      cells.push({
        key: `${col},${row}`,
        src: sticker.src,
        alt: sticker.alt,
        x: toScreenX(col, view),
        y: toScreenY(row, view),
        size: SIZE * s,
      })
    }
  }
  return cells
}

// screen point -> the sticker under it, or null if the click landed in the gap between cells
export function cellAt(view: View, clientX: number, clientY: number): Hit | null {
  if (N === 0) return null
  const col = Math.floor(((clientX - view.px) / view.s - OX) / CELL)
  const row = Math.floor(((clientY - view.py) / view.s - OY) / CELL)
  const left = toScreenX(col, view)
  const top = toScreenY(row, view)
  const size = SIZE * view.s
  if (clientX < left || clientX >= left + size || clientY < top || clientY >= top + size)
    return null
  const sticker = stickerAt(col, row)
  return { col, row, src: sticker.src, alt: sticker.alt }
}
