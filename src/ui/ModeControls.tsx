import { AnimatePresence, motion } from 'framer-motion'
import { useTasteStore, type Mode, type AnchorId } from '../store/tasteStore'

const MODES: Mode[] = ['build', 'compare', 'unfold', 'chat']
// The mode token stays 'chat' (clean) while the pill reads "moodio".
const LABELS: Record<Mode, string> = {
  build: 'build',
  compare: 'compare',
  unfold: 'unfold',
  chat: 'moodio',
}
const ANCHORS: { id: AnchorId; label: string }[] = [
  { id: 'nolan', label: 'Nolan' },
  { id: 'tarantino', label: 'Tarantino' },
]

export function ModeControls() {
  const mode = useTasteStore((s) => s.mode)
  const setMode = useTasteStore((s) => s.setMode)
  const compareTarget = useTasteStore((s) => s.compareTarget)
  const setCompareTarget = useTasteStore((s) => s.setCompareTarget)

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2.5">
      <div className="glass-strong flex gap-1 rounded-full p-1">
        {MODES.map((m) => {
          const active = mode === m
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="relative rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="mode-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-white/14 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
                />
              )}
              <span className={`relative ${active ? 'text-white' : 'text-white/45 hover:text-white/75'}`}>
                {LABELS[m]}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {mode === 'compare' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass flex gap-1 rounded-full p-1"
          >
            {ANCHORS.map((a) => {
              const active = compareTarget === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => setCompareTarget(a.id)}
                  className="relative rounded-full px-3.5 py-1 text-[10.5px] tracking-[0.06em] transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="anchor-pill"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      className={`absolute inset-0 rounded-full ${
                        a.id === 'nolan' ? 'bg-[#5d86c4]/35' : 'bg-[#e0652f]/35'
                      }`}
                    />
                  )}
                  <span className={`relative ${active ? 'text-white' : 'text-white/45 hover:text-white/75'}`}>
                    {a.label}
                  </span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
