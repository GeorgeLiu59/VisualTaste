import { AnimatePresence, motion } from 'framer-motion'
import { useTasteStore } from '../store/tasteStore'

export function MicroLabel() {
  const microLabel = useTasteStore((s) => s.microLabel)

  return (
    <div className="pointer-events-none absolute left-1/2 top-[34%] -translate-x-1/2">
      <AnimatePresence mode="wait">
        {microLabel && (
          <motion.div
            key={microLabel}
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-[26px] italic tracking-tight text-white/85"
          >
            {microLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
