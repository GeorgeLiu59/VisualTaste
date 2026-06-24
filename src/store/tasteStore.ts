import { create } from 'zustand'
import { getAsset } from '../data/tasteData'
import { computeLensShape, microLabelFor } from '../lib/taste'

export type Mode = 'build' | 'compare' | 'unfold'
export type AnchorId = 'nolan' | 'tarantino'

/**
 * Phases of the cinematic absorb beat (driven by AbsorbDirector off a frame
 * clock). 'idle' = no absorb in flight.
 *   rack    — pending reference is presented, focus racks onto it
 *   survey  — the whole taste-space is revealed and compared (held beat)
 *   commit  — pending asset folds into activeAssetIds; morph endpoints captured
 *   migrate — the lens slowly, deliberately eases to its new state
 */
export type AbsorbPhase = 'idle' | 'rack' | 'survey' | 'commit' | 'migrate'

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

  /** Current phase of the absorb choreography. */
  absorbPhase: AbsorbPhase
  /** The reference being absorbed: shown in space but NOT yet in activeAssetIds. */
  pendingAssetId: string | null
  /** performance.now() captured when beginAbsorb fired (frame-clock origin). */
  absorbStartedAt: number | null

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

  /** Begin the cinematic absorb beat for an asset (drag/walkthrough entry). */
  beginAbsorb: (id: string) => void
  /** Set the current absorb phase (AbsorbDirector advances this). */
  setAbsorbPhase: (phase: AbsorbPhase) => void
  /** Fold the pending asset into the profile and enter the migrate phase. */
  commitAbsorb: () => void
  /** Clear all absorb state, returning to idle. */
  endAbsorb: () => void
  /** beginAbsorb + a promise that resolves when the beat fully completes. */
  beginAbsorbAndWait: (id: string) => Promise<void>
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

  // Fold an asset into the profile: append, bump the ripple, flash a label
  // (and detect whether it just fractured the taste into a split). Shared by
  // the instant addAsset path and the choreographed commitAbsorb path.
  const applyAsset = (id: string) => {
    const { activeAssetIds } = get()
    if (activeAssetIds.includes(id)) return
    const before = computeLensShape(activeAssetIds.map(getAsset))
    const next = [...activeAssetIds, id]
    const after = computeLensShape(next.map(getAsset))
    const causedSplit = before !== 'split' && after === 'split'
    set((s) => ({ activeAssetIds: next, rippleSeed: s.rippleSeed + 1 }))
    flashLabel(microLabelFor(id, causedSplit))
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
    absorbPhase: 'idle',
    pendingAssetId: null,
    absorbStartedAt: null,

    addAsset: (id) => applyAsset(id),

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

    reset: () => {
      get().endAbsorb()
      set({
        activeAssetIds: [],
        hoveredAssetId: null,
        draggingAssetId: null,
        mode: 'build',
        compareTarget: 'nolan',
        microLabel: null,
        showFinale: false,
      })
    },

    beginAbsorb: (id) => {
      const { pendingAssetId, activeAssetIds } = get()
      // re-entrancy guard: ignore drops while a beat is in flight or dupes
      if (pendingAssetId != null || activeAssetIds.includes(id)) return
      set({
        pendingAssetId: id,
        absorbPhase: 'rack',
        absorbStartedAt: performance.now(),
        // a one-shot core pulse acknowledges the drop immediately
        rippleSeed: get().rippleSeed + 1,
      })
    },

    setAbsorbPhase: (phase) => set({ absorbPhase: phase }),

    commitAbsorb: () => {
      const { pendingAssetId } = get()
      if (pendingAssetId == null) return
      // fold the pending asset in (this recomputes deriveUserProfile) and enter
      // the slow migrate phase; keep pendingAssetId set so the reveal can fade
      // its threads out anchored to the right node.
      applyAsset(pendingAssetId)
      set({ absorbPhase: 'migrate' })
    },

    endAbsorb: () =>
      set({ pendingAssetId: null, absorbPhase: 'idle', absorbStartedAt: null }),

    beginAbsorbAndWait: (id) =>
      new Promise<void>((resolve) => {
        const { pendingAssetId, activeAssetIds } = get()
        // if the beat can't start (dupe / already in flight), resolve now so
        // the walkthrough doesn't stall.
        if (pendingAssetId != null || activeAssetIds.includes(id)) {
          resolve()
          return
        }
        const unsub = useTasteStore.subscribe((s) => {
          if (s.absorbPhase === 'idle' && s.pendingAssetId === null) {
            unsub()
            resolve()
          }
        })
        get().beginAbsorb(id)
      }),
  }
})
