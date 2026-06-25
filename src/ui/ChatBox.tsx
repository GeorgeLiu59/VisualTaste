import { useEffect, useRef, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import { CHAT_PLACEHOLDER } from '../data/chatData'

// Stage timing (ms from submit): bubbles split, then hold while they rotate +
// pulse ("generating", ~5s — the visible thinking beat), then reveal the images.
const GENERATING_AT = 700
const REVEAL_AT = 5700

export function ChatBox() {
  const stage = useChatStore((s) => s.stage)
  const draft = useChatStore((s) => s.draft)
  const prompt = useChatStore((s) => s.prompt)
  const setDraft = useChatStore((s) => s.setDraft)
  const submit = useChatStore((s) => s.submit)
  const setStage = useChatStore((s) => s.setStage)
  const reset = useChatStore((s) => s.reset)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const run = () => {
    const p = draft.trim() || CHAT_PLACEHOLDER
    clearTimers()
    submit(p)
    timers.current.push(setTimeout(() => setStage('generating'), GENERATING_AT))
    timers.current.push(setTimeout(() => setStage('revealed'), REVEAL_AT))
  }

  const newPrompt = () => {
    clearTimers()
    reset()
    setDraft('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      run()
    }
  }

  const busy = stage === 'splitting' || stage === 'generating'
  const status = busy ? 'synthesizing four directions…' : stage === 'revealed' ? 'four directions from your taste' : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 30, x: '-50%' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="pointer-events-auto absolute bottom-6 left-1/2 w-[min(60vw,640px)] rounded-[26px] px-5 py-3.5 glass-strong"
    >
      <AnimatePresence>
        {stage !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mb-2 flex items-center justify-between gap-3 overflow-hidden"
          >
            <span className="truncate font-serif text-[13px] italic text-white/70">&ldquo;{prompt}&rdquo;</span>
            <button
              onClick={newPrompt}
              className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-white/45 transition-colors hover:text-white/85"
            >
              new prompt
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-white/75 shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Describe a shot…"
          spellCheck={false}
          className="flex-1 bg-transparent text-[14px] tracking-tight text-white/90 outline-none placeholder:text-white/30"
        />
        <button
          onClick={run}
          aria-label="Generate"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <span className="mb-[1px] h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-white/85" />
        </button>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: busy ? [0.4, 0.85, 0.4] : 0.6 }}
            exit={{ opacity: 0 }}
            transition={busy ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
            className="mt-2 text-[10px] uppercase tracking-[0.28em] text-white/45"
          >
            {status}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
