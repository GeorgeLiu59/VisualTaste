import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasteStore } from '../store/tasteStore'
import { computeSimilarity, deriveUserProfile } from '../lib/taste'
import { nolanProfile, tarantinoProfile } from '../data/tasteData'

export function SimilarityBadge() {
  const mode = useTasteStore((s) => s.mode)
  const compareTarget = useTasteStore((s) => s.compareTarget)
  const activeAssetIds = useTasteStore((s) => s.activeAssetIds)

  const user = useMemo(() => deriveUserProfile(activeAssetIds), [activeAssetIds])
  const anchor = compareTarget === 'nolan' ? nolanProfile : tarantinoProfile
  const sim = computeSimilarity(user, anchor)

  return (
    <AnimatePresence>
      {mode === 'compare' && (
        <motion.div
          key="sim"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none flex flex-col items-center"
        >
          <motion.span
            key={sim}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-[44px] leading-none text-white/90 tabular-nums"
          >
            {sim}
          </motion.span>
          <span className="mt-2 text-[9.5px] uppercase tracking-[0.34em] text-white/40">
            affinity · {anchor.label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
