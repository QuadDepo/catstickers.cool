export type StickerData = {
  id: string
  src: string
  alt: string
  size?: number
}

// auto-discover: drop images into src/assets/stickers/ and they appear, no manual list
const stickerModules = import.meta.glob<string>('./assets/stickers/*.{png,jpg,jpeg,webp,svg,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const SIZE = 160

function toId(path: string, index: number): string {
  const file = path.split('/').pop()
  return file?.replace(/\.[^.]+$/, '') || `sticker-${index}`
}

export const stickers: StickerData[] = Object.keys(stickerModules).map((path, index) => {
  const id = toId(path, index)
  return { id, src: stickerModules[path], alt: `${id} sticker`, size: SIZE }
})
