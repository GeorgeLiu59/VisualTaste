import { create } from 'zustand'

type V3 = [number, number, number]

/**
 * The single authoritative "displayed" user-lens world position during an
 * absorb morph. The AbsorbDirector writes an eased value here each frame, and
 * the three independent consumers — Lens (user), ProfileAttachments (user), and
 * CameraRig.baseFraming — all READ it (via getState, inside their own useFrame)
 * so they migrate as one body. Outside a morph, `active` is false and each
 * consumer falls back to its normal damp toward the derived profile position.
 *
 * Mirrors the cameraStore pattern: consumed imperatively in useFrame, so writes
 * here never trigger React re-renders of the 3D tree.
 */
interface UserMorphState {
  active: boolean
  /** Eased user-lens world position. */
  pos: V3
  /** 0..1 eased morph progress — drives scale/tint cross-fade so nothing pops. */
  e: number
  setMorph: (active: boolean, pos: V3, e: number) => void
  clear: () => void
}

export const useUserMorphStore = create<UserMorphState>((set) => ({
  active: false,
  pos: [0, 0, 0],
  e: 0,
  setMorph: (active, pos, e) => set({ active, pos, e }),
  clear: () => set({ active: false, e: 0 }),
}))
