import { motion } from 'framer-motion'

export function Title() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none select-none"
    >
      <div className="flex items-center gap-2.5">
        <span className="h-[7px] w-[7px] rounded-full bg-white/80 shadow-[0_0_12px_2px_rgba(255,255,255,0.5)]" />
        <h1 className="font-serif text-[20px] leading-none tracking-tight text-white/90">Taste Lens</h1>
      </div>
      <p className="mt-2 pl-[17px] text-[9.5px] uppercase tracking-[0.32em] text-white/35">
        a multimodal taste profile
      </p>
    </motion.div>
  )
}
