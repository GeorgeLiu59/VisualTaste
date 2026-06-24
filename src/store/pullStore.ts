import { create } from 'zustand'

/**
 * Which references are currently "indicating" their pull, and how far through
 * their lunge window each is. The AbsorbDirector writes this every frame during
 * the indicate phase; each AssetAttachment looks itself up by id (via getState
 * in its own useFrame) and applies its lunge + pigment wake. With overlap there
 * are usually ≤2 live at once. Empty outside the indicate phase.
 *
 * getState-in-useFrame channel (like cameraStore / userMorphStore) — writes
 * never trigger React re-renders of the 3D tree.
 */
export interface ActivePull {
  id: string
  /** 0..1 progress through this reference's lunge window. */
  tau: number
  /** 0..1 normalized strength (lunge amplitude / wake brightness). */
  weight: number
  /** true while this reference is leaving (releasing) — inverted envelope. */
  releasing: boolean
}

interface PullState {
  activePulls: ActivePull[]
  setActivePulls: (pulls: ActivePull[]) => void
}

export const usePullStore = create<PullState>((set) => ({
  activePulls: [],
  setActivePulls: (activePulls) => set({ activePulls }),
}))
