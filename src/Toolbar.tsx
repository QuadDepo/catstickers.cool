import { Cat, LocateFixed, Shuffle } from 'lucide-react'
import { stickers } from './stickers'

type ToolbarProps = {
  onRecenter: () => void
  onRandom: () => void
}

export function Toolbar({ onRecenter, onRandom }: ToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-stone-200 bg-white/90 p-2 shadow-lg backdrop-blur">
      <span className="badge">
        <Cat size={14} /> {stickers.length} cats
      </span>
      <div className="h-8 w-px bg-stone-200" />
      <button type="button" className="btn btn-icon" onClick={onRecenter} aria-label="Recenter">
        <LocateFixed size={18} />
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        onClick={onRandom}
        aria-label="Random"
      >
        <Shuffle size={18} />
      </button>
    </div>
  )
}
