import { AnimatePresence, motion } from 'framer-motion'
import { useTasteStore } from '../store/tasteStore'

export function FinalLine() {
  const showFinale = useTasteStore((s) => s.showFinale)

  return (
    <AnimatePresence>
      {showFinale && (
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance px-8 text-center font-serif text-[40px] italic leading-tight tracking-tight text-white/95 md:text-[56px]"
          >
            Taste, shaped by references.
          </motion.h2>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
