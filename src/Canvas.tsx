import { AnimatePresence, animate, motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import {
  type PointerEvent,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { CELL, cellAt, type Hit, N, nextPan, OX, OY, SIZE, type View, visibleCells } from './grid'
import { Sticker } from './Sticker'

const ZOOM_DURATION = 0.6
const FOCUS_SCALE_TARGET = 0.6
// fling momentum on drag/swipe release — exponential velocity decay over rAF
const GLIDE_TAU = 0.4 // seconds; larger = longer glide (distance ≈ release speed × TAU)
const GLIDE_STOP_SPEED = 20 // px/s
const MIN_FLING_SPEED = 120 // px/s; below this a release doesn't fling
const MAX_FLING_SPEED = 4000 // px/s; clamps sample spikes
const VELOCITY_SMOOTHING = 0.6
const FLING_STALE_MS = 80 // ms since the last move; older means a held stop, not a fling

export type CanvasHandle = {
  recenter: () => void
  random: () => void
}

// focus = pan+zoom the canvas so the clicked sticker ends up centered & enlarged in the grid itself
type FocusState = {
  cellKey: string
  src: string
  alt: string
  restPx: number
  restPy: number
  restS: number
}

function filename(src: string): string {
  return src.split('/').pop()?.split('?')[0] ?? 'sticker.png'
}

export function Canvas({ ref }: { ref?: Ref<CanvasHandle> }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  // x/y/px/py: pointer + pan origin at press. l*: last move sample (for velocity). v*: smoothed px/s
  const press = useRef<{
    x: number
    y: number
    px: number
    py: number
    lx: number
    ly: number
    lt: number
    vx: number
    vy: number
  } | null>(null)
  const animRef = useRef<ReturnType<typeof animate> | null>(null)
  const glideRaf = useRef<number | null>(null)
  const viewRef = useRef<View>({ w: 0, h: 0, px: 0, py: 0, s: 1 })
  const [view, setView] = useState<View>(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    px: 0,
    py: 0,
    s: 1,
  }))
  const [focus, setFocus] = useState<FocusState | null>(null)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const stopAnim = useCallback(() => {
    animRef.current?.stop()
    if (glideRaf.current !== null) cancelAnimationFrame(glideRaf.current)
    glideRaf.current = null
  }, [])

  // fling px/py with exponentially decaying velocity after a drag release; owns the speed gates
  const startGlide = useCallback(
    (vx: number, vy: number) => {
      stopAnim() // stop any in-flight glide first
      const speed = Math.hypot(vx, vy)
      if (speed < MIN_FLING_SPEED) return
      if (speed > MAX_FLING_SPEED) {
        const k = MAX_FLING_SPEED / speed
        vx *= k
        vy *= k
      }
      let last = performance.now()
      const step = (now: number) => {
        const dt = (now - last) / 1000
        last = now
        setView((v) => ({ ...v, px: v.px + vx * dt, py: v.py + vy * dt }))
        const decay = Math.exp(-dt / GLIDE_TAU)
        vx *= decay
        vy *= decay
        glideRaf.current =
          Math.hypot(vx, vy) > GLIDE_STOP_SPEED ? requestAnimationFrame(step) : null
      }
      glideRaf.current = requestAnimationFrame(step)
    },
    [stopAnim],
  )

  // tween pan+scale from the current view to `to`; reads viewRef so it always starts from the live position
  const animateView = useCallback(
    (to: { px: number; py: number; s: number }) => {
      stopAnim()
      const from = viewRef.current
      animRef.current = animate(0, 1, {
        duration: ZOOM_DURATION,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (t) =>
          setView((v) => ({
            ...v,
            px: from.px + (to.px - from.px) * t,
            py: from.py + (to.py - from.py) * t,
            s: from.s + (to.s - from.s) * t,
          })),
      })
    },
    [stopAnim],
  )

  const openFocus = useCallback(
    (hit: Hit) => {
      const v = viewRef.current
      const worldCx = hit.col * CELL + OX + SIZE / 2
      const worldCy = hit.row * CELL + OY + SIZE / 2
      const ts = (Math.min(v.w, v.h) * FOCUS_SCALE_TARGET) / SIZE
      setFocus({
        cellKey: `${hit.col},${hit.row}`,
        src: hit.src,
        alt: hit.alt,
        restPx: v.px,
        restPy: v.py,
        restS: v.s,
      })
      animateView({ px: v.w / 2 - worldCx * ts, py: v.h / 2 - worldCy * ts, s: ts })
    },
    [animateView],
  )

  const closeFocus = useCallback(() => {
    if (!focus) return
    animateView({ px: focus.restPx, py: focus.restPy, s: focus.restS })
    setFocus(null)
  }, [focus, animateView])

  // expose toolbar actions without lifting state — both exit focus and reset zoom
  useImperativeHandle(
    ref,
    () => ({
      recenter: () => {
        stopAnim()
        setFocus(null)
        setView((v) => ({ ...v, px: 0, py: 0, s: 1 }))
      },
      random: () => {
        stopAnim()
        setFocus(null)
        setView((v) => ({
          ...v,
          px: Math.round((Math.random() - 0.5) * 20000),
          py: Math.round((Math.random() - 0.5) * 20000),
          s: 1,
        }))
      },
    }),
    [stopAnim],
  )

  // wheel/trackpad scroll pans (disabled while focused); native non-passive listener so preventDefault can stop page scroll
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (focus) return
      e.preventDefault()
      stopAnim() // a new scroll interrupts fling momentum
      setView((v) => ({ ...v, px: v.px - e.deltaX, py: v.py - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [focus, stopAnim])

  useEffect(() => {
    const onResize = () => setView((v) => ({ ...v, w: window.innerWidth, h: window.innerHeight }))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, closeFocus])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    stopAnim() // grabbing halts any in-flight fling
    press.current = {
      x: e.clientX,
      y: e.clientY,
      px: view.px,
      py: view.py,
      lx: e.clientX,
      ly: e.clientY,
      lt: performance.now(),
      vx: 0,
      vy: 0,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current
    if (!p || focus) return
    const now = performance.now()
    const dtMs = Math.max(now - p.lt, 1) // avoid divide-by-zero; spikes are clamped at release
    p.vx = p.vx * (1 - VELOCITY_SMOOTHING) + ((e.clientX - p.lx) / dtMs) * 1000 * VELOCITY_SMOOTHING
    p.vy = p.vy * (1 - VELOCITY_SMOOTHING) + ((e.clientY - p.ly) / dtMs) * 1000 * VELOCITY_SMOOTHING
    p.lx = e.clientX
    p.ly = e.clientY
    p.lt = now
    const next = nextPan({ x: p.px, y: p.py }, { x: p.x, y: p.y }, { x: e.clientX, y: e.clientY })
    setView((v) => ({ ...v, px: next.x, py: next.y }))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current
    press.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (!p) return
    const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y)
    if (moved >= 6) {
      const fresh = performance.now() - p.lt < FLING_STALE_MS // a held stop shouldn't fling
      if (!focus && fresh) startGlide(p.vx, p.vy)
      return
    }
    if (focus) {
      // a click while focused zooms back out; the download/close buttons sit above the canvas, never here
      closeFocus()
      return
    }
    const hit = cellAt(view, e.clientX, e.clientY)
    if (hit) openFocus(hit)
  }

  const cells = visibleCells(view)

  return (
    <>
      <div
        ref={viewportRef}
        className="relative h-screen w-screen cursor-grab touch-none select-none overflow-hidden bg-[#F6F1EA] active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {cells.map((c) => (
          <Sticker
            key={c.key}
            src={c.src}
            alt={c.alt}
            x={c.x}
            y={c.y}
            size={c.size}
            dimmed={!!focus && c.key !== focus.cellKey}
          />
        ))}
        {N === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-stone-500">
            Drop images into src/assets/stickers/ to populate the canvas.
          </div>
        )}
      </div>
      <AnimatePresence>
        {focus && (
          <motion.div
            key="actions"
            className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 gap-2"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.25 } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
          >
            <a className="btn" href={focus.src} download={filename(focus.src)}>
              <Download size={16} /> Download
            </a>
            <button type="button" className="btn btn-secondary" onClick={closeFocus}>
              <X size={16} /> Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
