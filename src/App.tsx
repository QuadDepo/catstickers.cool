import { useRef } from 'react'
import { Canvas, type CanvasHandle } from './Canvas'
import { Toolbar } from './Toolbar'

export function App() {
  const canvasRef = useRef<CanvasHandle>(null)
  return (
    <>
      <Canvas ref={canvasRef} />
      <Toolbar
        onRecenter={() => canvasRef.current?.recenter()}
        onRandom={() => canvasRef.current?.random()}
      />
    </>
  )
}
