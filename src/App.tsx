import { Scene } from './three/Scene'
import { Overlay } from './ui/Overlay'

export default function App() {
  return (
    <div className="stage-fade relative h-full w-full overflow-hidden">
      <div className="bg-aurora" />
      <Scene />
      <div className="bg-vignette" />
      <Overlay />
    </div>
  )
}
