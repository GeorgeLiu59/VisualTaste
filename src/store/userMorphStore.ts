import { create } from 'zustand'

type V3 = [number, number, number]

/**
 * The single authoritative "displayed" user-lens world position during an
 * absorb beat. The AbsorbDirector writes an eased value here each frame, and
 * the three independent consumers — Lens (user), ProfileAttachments (user), and
 * CameraRig.baseFraming — all READ it (via getState, inside their own useFrame)
 * so they migrate as one body. Outside a beat, `active` is false and each
 * consumer falls back to its normal damp toward the derived position.
 *
 * `lean` is a small transient world offset applied to the lens body (NOT the
 * camera) during the indicate phase — the glass tips toward whichever reference
 * is currently asserting its pull, then relaxes. `leanColor` is that puller's
 * accent, bled briefly into the glass tint.
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
  /** Transient body lean offset (world units) during the indicate chorus. */
  lean: V3
  /** Accent of the currently-leaning puller, bled into the glass tint. */
  leanColor: string | null
  setMorph: (active: boolean, pos: V3, e: number) => void
  setLean: (lean: V3, color: string | null) => void
  clear: () => void
}

export const useUserMorphStore = create<UserMorphState>((set) => ({
  active: false,
  pos: [0, 0, 0],
  e: 0,
  lean: [0, 0, 0],
  leanColor: null,
  setMorph: (active, pos, e) => set({ active, pos, e }),
  setLean: (lean, color) => set({ lean, leanColor: color }),
  clear: () => set({ active: false, e: 0, lean: [0, 0, 0], leanColor: null }),
}))
