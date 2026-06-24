import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasteStore } from '../store/tasteStore'
import { runWalkthrough } from '../lib/walkthrough'

export function WalkthroughControls() {
  const active = useTasteStore((s) => s.walkthroughActive)
  const count = useTasteStore((s) => s.activeAssetIds.length)
  const reset = useTasteStore((s) => s.reset)
  const cancelRef = useRef<(() => void) | null>(null)

  const play = () => {
    cancelRef.current?.()
    cancelRef.current = runWalkthrough()
  }
  const stop = () => {
    cancelRef.current?.()
    cancelRef.current = null
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      {active ? (
        <button
          onClick={stop}
          className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white"
        >
          Skip
        </button>
      ) : (
        <button
          onClick={play}
          className="glass-strong group flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 transition-colors hover:text-white"
        >
          <span className="grid h-4 w-4 place-items-center">
            <span className="ml-[1px] h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white/80 transition-colors group-hover:border-l-white" />
          </span>
          Play
        </button>
      )}

      <AnimatePresence>
        {!active && count > 0 && (
          <motion.button
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            onClick={reset}
            className="glass overflow-hidden whitespace-nowrap rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white/80"
          >
            Clear
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
