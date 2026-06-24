import { create } from 'zustand'
import { getAsset } from '../data/tasteData'
import { computeLensShape, microLabelFor } from '../lib/taste'

export type Mode = 'build' | 'compare' | 'unfold'
export type AnchorId = 'nolan' | 'tarantino'

interface TasteState {
  activeAssetIds: string[]
  hoveredAssetId: string | null
  draggingAssetId: string | null
  mode: Mode
  compareTarget: AnchorId
  microLabel: string | null
  /** Increments on every absorb to trigger a one-shot lens ripple. */
  rippleSeed: number
  /** Whether the cinematic walkthrough is running. */
  walkthroughActive: boolean
  /** Final tagline visibility (controlled by the walkthrough). */
  showFinale: boolean

  addAsset: (id: string) => void
  removeAsset: (id: string) => void
  toggleAsset: (id: string) => void
  setHover: (id: string | null) => void
  setDragging: (id: string | null) => void
  setMode: (mode: Mode) => void
  setCompareTarget: (t: AnchorId) => void
  setMicroLabel: (label: string | null) => void
  setWalkthroughActive: (v: boolean) => void
  setShowFinale: (v: boolean) => void
  reset: () => void
}

let labelTimer: ReturnType<typeof setTimeout> | null = null

export const useTasteStore = create<TasteState>((set, get) => {
  const flashLabel = (label: string | null) => {
    if (labelTimer) clearTimeout(labelTimer)
    set({ microLabel: label })
    if (label) {
      labelTimer = setTimeout(() => set({ microLabel: null }), 2600)
    }
  }

  return {
    activeAssetIds: [],
    hoveredAssetId: null,
    draggingAssetId: null,
    mode: 'build',
    compareTarget: 'nolan',
    microLabel: null,
    rippleSeed: 0,
    walkthroughActive: false,
    showFinale: false,

    addAsset: (id) => {
      const { activeAssetIds } = get()
      if (activeAssetIds.includes(id)) return
      const before = computeLensShape(activeAssetIds.map(getAsset))
      const next = [...activeAssetIds, id]
      const after = computeLensShape(next.map(getAsset))
      const causedSplit = before !== 'split' && after === 'split'
      set((s) => ({ activeAssetIds: next, rippleSeed: s.rippleSeed + 1 }))
      flashLabel(microLabelFor(id, causedSplit))
    },

    removeAsset: (id) =>
      set((s) => ({ activeAssetIds: s.activeAssetIds.filter((a) => a !== id) })),

    toggleAsset: (id) => {
      const { activeAssetIds, addAsset, removeAsset } = get()
      if (activeAssetIds.includes(id)) removeAsset(id)
      else addAsset(id)
    },

    setHover: (id) => set({ hoveredAssetId: id }),
    setDragging: (id) => set({ draggingAssetId: id }),
    setMode: (mode) => set({ mode }),
    setCompareTarget: (t) => set({ compareTarget: t }),
    setMicroLabel: (label) => flashLabel(label),
    setWalkthroughActive: (v) => set({ walkthroughActive: v }),
    setShowFinale: (v) => set({ showFinale: v }),

    reset: () =>
      set({
        activeAssetIds: [],
        hoveredAssetId: null,
        draggingAssetId: null,
        mode: 'build',
        compareTarget: 'nolan',
        microLabel: null,
        showFinale: false,
      }),
  }
})
