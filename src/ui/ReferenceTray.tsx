import { motion, AnimatePresence } from 'framer-motion'
import {
  getAsset,
  paletteAssets,
  textAssets,
  userImageAssets,
  type Asset,
} from '../data/tasteData'
import { useTasteStore } from '../store/tasteStore'
import { useDragAsset } from '../hooks/useDragAsset'

function ActiveDot() {
  return (
    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.6)]" />
  )
}

function ImageCard({ asset, active, bind }: { asset: Asset; active: boolean; bind: any }) {
  const setHover = useTasteStore((s) => s.setHover)
  return (
    <div
      {...bind(asset.id, active)}
      data-asset={asset.id}
      onPointerEnter={() => setHover(asset.id)}
      onPointerLeave={() => setHover(null)}
      style={{ touchAction: 'none' }}
      className={`group relative h-[66px] w-[100px] shrink-0 cursor-grab overflow-hidden rounded-[14px] transition-all duration-300 active:cursor-grabbing ${
        active
          ? 'shadow-[0_0_0_1.5px_rgba(255,255,255,0.7),0_8px_24px_rgba(0,0,0,0.5)]'
          : 'shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_8px_24px_rgba(0,0,0,0.45)]'
      }`}
    >
      <img
        src={asset.src}
        draggable={false}
        alt=""
        className={`h-full w-full object-cover transition-all duration-500 ${
          active ? 'scale-100 brightness-110' : 'scale-105 brightness-90 group-hover:brightness-105'
        }`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <span className="text-[10px] font-medium tracking-wide text-white/90">{asset.label}</span>
      </div>
      {active && <ActiveDot />}
    </div>
  )
}

function TextChip({ asset, active, bind }: { asset: Asset; active: boolean; bind: any }) {
  const setHover = useTasteStore((s) => s.setHover)
  return (
    <div
      {...bind(asset.id, active)}
      data-asset={asset.id}
      onPointerEnter={() => setHover(asset.id)}
      onPointerLeave={() => setHover(null)}
      style={{ touchAction: 'none' }}
      className={`relative flex h-[40px] shrink-0 cursor-grab items-center rounded-full px-4 text-[12px] tracking-tight transition-all duration-300 active:cursor-grabbing ${
        active
          ? 'bg-[#b9a8ff]/20 text-white shadow-[0_0_0_1.5px_rgba(185,168,255,0.7)]'
          : 'glass text-white/70 hover:text-white'
      }`}
    >
      <span className="mr-1.5 text-[#b9a8ff]">&ldquo;</span>
      {asset.label}
      {active && <ActiveDot />}
    </div>
  )
}

function PaletteStrip({ asset, active, bind }: { asset: Asset; active: boolean; bind: any }) {
  const setHover = useTasteStore((s) => s.setHover)
  return (
    <div
      {...bind(asset.id, active)}
      data-asset={asset.id}
      onPointerEnter={() => setHover(asset.id)}
      onPointerLeave={() => setHover(null)}
      style={{ touchAction: 'none' }}
      className={`group relative flex h-[40px] w-[112px] shrink-0 cursor-grab overflow-hidden rounded-full transition-all duration-300 active:cursor-grabbing ${
        active
          ? 'shadow-[0_0_0_1.5px_rgba(255,255,255,0.7)]'
          : 'shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.3)]'
      }`}
    >
      {asset.palette.slice(0, 5).map((c, i) => (
        <div key={c + i} className="h-full flex-1" style={{ backgroundColor: c }} />
      ))}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="text-[10px] font-medium tracking-wide text-white/95">{asset.label}</span>
      </div>
      {active && <ActiveDot />}
    </div>
  )
}

function Divider() {
  return <div className="mx-1 h-9 w-px shrink-0 bg-white/10" />
}

function DragClone({ id, x, y }: { id: string; x: number; y: number }) {
  const asset = getAsset(id)
  return (
    <div
      className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
      style={{ left: x, top: y }}
    >
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1.12, opacity: 1 }}>
        {asset.type === 'image' && (
          <div className="h-[78px] w-[118px] overflow-hidden rounded-[14px] shadow-[0_0_0_1px_rgba(255,255,255,0.4)]">
            <img src={asset.src} draggable={false} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        {asset.type === 'text' && (
          <div className="glass-strong flex h-[42px] items-center rounded-full px-4 text-[12px] text-white">
            {asset.label}
          </div>
        )}
        {asset.type === 'palette' && (
          <div className="flex h-[42px] w-[120px] overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.4)]">
            {asset.palette.slice(0, 5).map((c, i) => (
              <div key={c + i} className="h-full flex-1" style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export function ReferenceTray() {
  const activeAssetIds = useTasteStore((s) => s.activeAssetIds)
  const walkthroughActive = useTasteStore((s) => s.walkthroughActive)
  const { bind, drag } = useDragAsset()
  const isActive = (id: string) => activeAssetIds.includes(id)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30, x: '-50%' }}
        animate={{ opacity: walkthroughActive ? 0.35 : 1, y: 0, x: '-50%' }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        className="pointer-events-auto absolute bottom-5 left-1/2 flex max-w-[94vw] items-center gap-2.5 overflow-x-auto rounded-[26px] px-4 py-3 glass-strong"
      >
        {userImageAssets.map((a) => (
          <ImageCard key={a.id} asset={a} active={isActive(a.id)} bind={bind} />
        ))}
        <Divider />
        {textAssets.map((a) => (
          <TextChip key={a.id} asset={a} active={isActive(a.id)} bind={bind} />
        ))}
        <Divider />
        {paletteAssets.map((a) => (
          <PaletteStrip key={a.id} asset={a} active={isActive(a.id)} bind={bind} />
        ))}
      </motion.div>

      <AnimatePresence>
        {drag && <DragClone key="clone" id={drag.id} x={drag.x} y={drag.y} />}
      </AnimatePresence>
    </>
  )
}
