import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasteStore } from '../store/tasteStore'

export function Hint() {
  const count = useTasteStore((s) => s.activeAssetIds.length)
  const walk = useTasteStore((s) => s.walkthroughActive)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setExpired(true), 8000)
    return () => clearTimeout(t)
  }, [])

  const show = count === 0 && !walk && !expired

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 8, x: '-50%' }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 1.4 }}
          className="pointer-events-none absolute bottom-[112px] left-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.34em] text-white/40">
            drag a reference in &nbsp;·&nbsp; or press play
          </span>
          <motion.span
            animate={{ y: [0, 5, 0], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-0 w-0 border-x-[4px] border-t-[6px] border-x-transparent border-t-white/50"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
