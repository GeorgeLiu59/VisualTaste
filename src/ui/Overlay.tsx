import { Title } from './Title'
import { ModeControls } from './ModeControls'
import { SimilarityBadge } from './SimilarityBadge'
import { MicroLabel } from './MicroLabel'
import { AbsorbHUD } from './AbsorbHUD'
import { FinalLine } from './FinalLine'
import { WalkthroughControls } from './WalkthroughControls'
import { ReferenceTray } from './ReferenceTray'
import { ChatBox } from './ChatBox'
import { Hint } from './Hint'
import { useTasteStore } from '../store/tasteStore'

export function Overlay() {
  const isChat = useTasteStore((s) => s.mode === 'chat')
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <div className="absolute left-7 top-6">
        <Title />
      </div>
      <div className="absolute right-7 top-6">
        <ModeControls />
      </div>
      <div className="absolute left-1/2 top-[92px] -translate-x-1/2">
        <SimilarityBadge />
      </div>

      <MicroLabel />
      <AbsorbHUD />
      <FinalLine />
      {!isChat && <Hint />}

      <div className="absolute bottom-6 left-7">
        <WalkthroughControls />
      </div>

      {/* Moodio chat mode swaps the reference tray for the prompt box */}
      {isChat ? <ChatBox /> : <ReferenceTray />}
    </div>
  )
}
