import { create } from 'zustand'
import { getAsset } from '../data/tasteData'
import { computeLensShape, deriveUserProfile, microLabelFor, toWorld } from '../lib/taste'
import { useUserMorphStore } from './userMorphStore'

export type Mode = 'build' | 'compare' | 'unfold'
export type AnchorId = 'nolan' | 'tarantino'

/**
 * Phases of the cinematic "pull chorus" beat (driven by AbsorbDirector off a
 * frame clock). 'idle' = nothing in flight.
 *   rack     — acknowledge the drop/release; bubble pinned at the OLD centroid
 *   indicate — each reference lunges toward its pull, one at a time (the chorus)
 *   migrate  — the bubble slowly, deliberately eases to its new resultant spot
 * (commit is an instantaneous latch inside the director, not a held phase.)
 */
export type AbsorbPhase = 'idle' | 'rack' | 'indicate' | 'migrate'

export type AbsorbKind = 'add' | 'remove'

type V3 = [number, number, number]

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

  /** Current phase of the pull-chorus beat. */
  absorbPhase: AbsorbPhase
  /** Whether this beat is adding or removing a reference. */
  absorbKind: AbsorbKind | null
  /** The reference being added this beat (added immediately, not deferred). */
  pendingAssetId: string | null
  /** The reference being removed this beat (kept until the migrate latch). */
  releasingAssetId: string | null
  /** performance.now() captured when the beat began (frame-clock origin). */
  absorbStartedAt: number | null
  /** Old bubble centroid (world) — held while the chorus plays. */
  heldCenterW: V3 | null
  /** Ordered ids for the indicate chorus (cause first, then by strength). */
  indicateOrder: string[]
  /** ms between successive lunges this beat (chosen from ref count). */
  indicateStride: number

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

  /** Begin the pull-chorus beat for an added reference (drag/walkthrough). */
  beginAbsorb: (id: string) => void
  /** Begin the pull-chorus beat for a reference being removed. */
  beginRelease: (id: string) => void
  /** Set the current beat phase (AbsorbDirector advances this). */
  setAbsorbPhase: (phase: AbsorbPhase) => void
  /** Latch the set mutation (remove only) and enter the migrate phase. */
  commitAbsorb: () => void
  /** Clear all beat state, returning to idle. */
  endAbsorb: () => void
  /** beginAbsorb + a promise that resolves when the beat fully completes. */
  beginAbsorbAndWait: (id: string) => Promise<void>
}

/** Per-beat lunge stride: ~3.2s of chorus spread across N refs, clamped. */
function strideFor(n: number): number {
  return Math.min(520, Math.max(300, Math.round(3200 / Math.max(n - 1, 1))))
}

/** Cause first, then the rest by descending strength (stable order per beat). */
function buildIndicateOrder(causeId: string, ids: string[]): string[] {
  const rest = ids
    .filter((a) => a !== causeId)
    .sort((a, b) => getAsset(b).strength - getAsset(a).strength)
  return [causeId, ...rest]
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
  // the instant addAsset path and the choreographed beginAbsorb path.
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

  // Drop an asset from the profile (instant filter + ripple).
  const applyRemoval = (id: string) =>
    set((s) => ({
      activeAssetIds: s.activeAssetIds.filter((a) => a !== id),
      rippleSeed: s.rippleSeed + 1,
    }))

  // Pin the lens body at a given world centroid for the rest of the beat, so it
  // holds still while the chorus plays (set synchronously to avoid a 1-frame
  // jump when the asset set has already changed).
  const holdAt = (centerW: V3) => useUserMorphStore.getState().setMorph(true, centerW, 0)

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
    absorbKind: null,
    pendingAssetId: null,
    releasingAssetId: null,
    absorbStartedAt: null,
    heldCenterW: null,
    indicateOrder: [],
    indicateStride: 360,

    addAsset: (id) => applyAsset(id),

    removeAsset: (id) =>
      set((s) => ({ activeAssetIds: s.activeAssetIds.filter((a) => a !== id) })),

    toggleAsset: (id) => {
      const { activeAssetIds, addAsset, beginRelease, removeAsset, mode } = get()
      if (activeAssetIds.includes(id)) {
        // tap-to-remove plays the chorus in build mode; instant elsewhere
        if (mode === 'build') beginRelease(id)
        else removeAsset(id)
      } else addAsset(id)
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
      const { pendingAssetId, releasingAssetId, activeAssetIds } = get()
      // re-entrancy guard: ignore while any beat is in flight, or dupes
      if (pendingAssetId != null || releasingAssetId != null || activeAssetIds.includes(id)) return
      // hold at the OLD centroid (before the append) so the body doesn't jump
      const oldCenter = toWorld(deriveUserProfile(activeAssetIds).displayPosition)
      holdAt(oldCenter)
      // append now so the new tile joins the cluster and gets its own lunge
      applyAsset(id)
      const nextIds = get().activeAssetIds
      set({
        absorbKind: 'add',
        pendingAssetId: id,
        releasingAssetId: null,
        absorbPhase: 'rack',
        absorbStartedAt: performance.now(),
        heldCenterW: oldCenter,
        indicateOrder: buildIndicateOrder(id, nextIds),
        indicateStride: strideFor(nextIds.length),
      })
    },

    beginRelease: (id) => {
      const { pendingAssetId, releasingAssetId, activeAssetIds } = get()
      if (pendingAssetId != null || releasingAssetId != null || !activeAssetIds.includes(id)) return
      // hold at the CURRENT centroid (asset still in) through the chorus
      const oldCenter = toWorld(deriveUserProfile(activeAssetIds).displayPosition)
      holdAt(oldCenter)
      set({
        absorbKind: 'remove',
        pendingAssetId: null,
        releasingAssetId: id,
        absorbPhase: 'rack',
        absorbStartedAt: performance.now(),
        heldCenterW: oldCenter,
        indicateOrder: buildIndicateOrder(id, activeAssetIds),
        indicateStride: strideFor(activeAssetIds.length),
        rippleSeed: get().rippleSeed + 1,
      })
    },

    setAbsorbPhase: (phase) => set({ absorbPhase: phase }),

    commitAbsorb: () => {
      const { absorbKind, releasingAssetId } = get()
      // For 'add' the asset was already appended in beginAbsorb — nothing to do
      // but enter migrate. For 'remove' the leaving asset is filtered out now,
      // so the new (post-removal) centroid becomes the migrate target.
      if (absorbKind === 'remove' && releasingAssetId != null) applyRemoval(releasingAssetId)
      set({ absorbPhase: 'migrate' })
    },

    endAbsorb: () => {
      useUserMorphStore.getState().clear()
      set({
        absorbPhase: 'idle',
        absorbKind: null,
        pendingAssetId: null,
        releasingAssetId: null,
        absorbStartedAt: null,
        heldCenterW: null,
        indicateOrder: [],
      })
    },

    beginAbsorbAndWait: (id) =>
      new Promise<void>((resolve) => {
        const { pendingAssetId, releasingAssetId, activeAssetIds } = get()
        // if the beat can't start (dupe / already in flight), resolve now so
        // the walkthrough doesn't stall.
        if (pendingAssetId != null || releasingAssetId != null || activeAssetIds.includes(id)) {
          resolve()
          return
        }
        const unsub = useTasteStore.subscribe((s) => {
          if (s.absorbPhase === 'idle') {
            unsub()
            resolve()
          }
        })
        get().beginAbsorb(id)
      }),
  }
})
