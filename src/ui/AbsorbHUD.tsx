import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasteStore } from '../store/tasteStore'
import { computeSimilarity, deriveUserProfile, microLabelFor } from '../lib/taste'
import { getAsset, nolanProfile, tarantinoProfile } from '../data/tasteData'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

function AffinityBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[68px] text-right text-[9px] uppercase tracking-[0.28em] text-white/45">{label}</span>
      <div className="relative h-[3px] w-[140px] overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: EASE, delay }}
        />
      </div>
      <motion.span
        className="w-[22px] font-serif text-[14px] tabular-nums text-white/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: delay + 0.2 }}
      >
        {value}
      </motion.span>
    </div>
  )
}

/**
 * A restrained editorial readout shown only during the absorb "survey" beat:
 * the one-word tag for the incoming reference plus its affinity to each anchor
 * as two thin count-up bars. Extends the MicroLabel / SimilarityBadge type
 * language; the 3D constellation reveal carries the moment on its own, so this
 * is supporting punctuation, never a dashboard.
 */
export function AbsorbHUD() {
  const pendingAssetId = useTasteStore((s) => s.pendingAssetId)
  const showing = useTasteStore((s) => s.absorbPhase === 'survey')

  const info = useMemo(() => {
    if (!pendingAssetId) return null
    const solo = deriveUserProfile([pendingAssetId])
    return {
      word: microLabelFor(pendingAssetId, false),
      nolan: computeSimilarity(solo, nolanProfile),
      tara: computeSimilarity(solo, tarantinoProfile),
      label: getAsset(pendingAssetId).label,
    }
  }, [pendingAssetId])

  return (
    <div className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2">
      <AnimatePresence mode="wait">
        {showing && info && (
          <motion.div
            key={pendingAssetId}
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex flex-col items-center gap-3"
          >
            <span className="font-serif text-[22px] italic tracking-tight text-white/85">{info.word}</span>
            <div className="flex flex-col gap-1.5">
              <AffinityBar label="Nolan" value={info.nolan} color="#6f9fd6" delay={0.15} />
              <AffinityBar label="Tarantino" value={info.tara} color="#f0703a" delay={0.25} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
