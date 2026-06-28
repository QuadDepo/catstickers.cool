type StickerProps = {
  src: string
  x: number
  y: number
  alt: string
  size?: number
  dimmed?: boolean
}

export function Sticker({ src, x, y, alt, size = 160, dimmed = false }: StickerProps) {
  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      draggable={false}
      className={`pointer-events-none absolute max-w-none select-none rounded-lg transition-opacity duration-500 ${dimmed ? 'opacity-0' : 'opacity-100'}`}
      style={{ left: x, top: y, width: size, height: size, objectFit: 'contain' }}
    />
  )
}
