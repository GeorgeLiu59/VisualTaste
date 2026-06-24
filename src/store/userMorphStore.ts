import { create } from 'zustand'

type V3 = [number, number, number]

/**
 * The single authoritative "displayed" user-lens world position during an
 * absorb beat, plus the liquid-drop stretch that rides on top of it.
 *
 * The AbsorbDirector writes these each frame; the consumers — Lens (user),
 * ProfileAttachments (user), CameraRig.baseFraming — READ them (via getState,
 * in their own useFrame) so the body, tiles, and camera stay in lockstep.
 * Outside a beat, `active` is false and consumers fall back to their normal
 * damp toward the derived position.
 *
 * Stretch channel: during the migrate the glass elongates like a liquid drop
 * along `stretchAxis` (a world unit vector) by `stretchAmt` (0 = round). The
 * `driverId` reference (the one that caused the beat) rides the leading tip by
 * `driverLead` (0..1), and `impactColor` (its accent) bleeds into the tint so
 * the recolor reads as originating from the driver.
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
  /** World unit axis the drop elongates along (default up). */
  stretchAxis: V3
  /** Elongation amount (0 = round; ~0.34 peak). */
  stretchAmt: number
  /** The reference driving this beat (rides the leading tip). */
  driverId: string | null
  /** 0..1 how far the driver tile leads ahead of the cluster. */
  driverLead: number
  /** The driver's accent, bled into the glass tint during the beat. */
  impactColor: string | null
  setMorph: (active: boolean, pos: V3, e: number) => void
  setStretch: (axis: V3, amt: number) => void
  setDriver: (id: string | null, lead: number) => void
  setImpactColor: (color: string | null) => void
  clear: () => void
}

export const useUserMorphStore = create<UserMorphState>((set) => ({
  active: false,
  pos: [0, 0, 0],
  e: 0,
  stretchAxis: [0, 1, 0],
  stretchAmt: 0,
  driverId: null,
  driverLead: 0,
  impactColor: null,
  setMorph: (active, pos, e) => set({ active, pos, e }),
  setStretch: (stretchAxis, stretchAmt) => set({ stretchAxis, stretchAmt }),
  setDriver: (driverId, driverLead) => set({ driverId, driverLead }),
  setImpactColor: (impactColor) => set({ impactColor }),
  clear: () =>
    set({
      active: false,
      e: 0,
      stretchAmt: 0,
      stretchAxis: [0, 1, 0],
      driverId: null,
      driverLead: 0,
      impactColor: null,
    }),
}))
