import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTasteStore } from '../store/tasteStore'
import { useCameraStore } from '../store/cameraStore'
import { useUserMorphStore } from '../store/userMorphStore'
import { clamp, damp, deriveUserProfile, toWorld } from '../lib/taste'
import { getAsset } from '../data/tasteData'

type V3 = [number, number, number]

// ---------------------------------------------------------------------------
// "Liquid drop" beat timing (ms), off a single frame clock (absorbStartedAt).
// Staged: land → sit → stretch & move → settle.
//   settle-in 0 .. SIT_MS            new tile has landed; body sits still, no
//                                    stretch — a held beat so the add registers
//   migrate   SIT_MS .. +MIGRATE     the whole drop stretches (round→elongated→
//                                    round) and eases to the new centroid; the
//                                    tiles stay put (just trailing viscously)
//   settle    .. +SETTLE             release
// ---------------------------------------------------------------------------
const SIT_MS = 1000
const MIGRATE_MS = 2400
const SETTLE_MS = 350
const TOTAL_MS = SIT_MS + MIGRATE_MS + SETTLE_MS

/** Peak elongation (λ ≈ 1.34 along axis); kept tasteful so refraction reads. */
const STRETCH_MAX = 0.34

/** Resting DOF focus point (matches the original static target). */
const STATIC_FOCUS: V3 = [0.5, 0.95, 0.2]
/** camera offset (pos - look) reused from the build framing in CameraRig. */
const CAM_OFF: V3 = [0.2, 0.95, 18.3]

const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

export interface AbsorbDirectorProps {
  /** Shared DOF focus point — mutated in place; DepthOfField reads it each frame. */
  focusVec: THREE.Vector3
  /** Bloom effect ref, for the transient intensity dip. */
  bloomRef: { current: { intensity: number } | null }
}

/**
 * Frame-driven conductor for the "liquid drop" absorb beat. Holds the body at
 * the old centroid while the glass pre-reaches toward the driving reference,
 * then eases to the new centroid while stretching like a drop along the driver
 * axis. Writes the single authoritative position + stretch channel to
 * userMorphStore. Also drives DOF focus, a bloom/exposure breath, and gentle
 * camera goals. No React re-render — pure useFrame.
 */
export function AbsorbDirector({ focusVec, bloomRef }: AbsorbDirectorProps) {
  const gl = useThree((s) => s.gl)

  const startRef = useRef<number | null>(null)
  const committed = useRef(false)
  const morphStart = useRef(new THREE.Vector3())
  const morphTarget = useRef(new THREE.Vector3())
  const stretchAxis = useRef<V3>([0, 1, 0])
  const distScale = useRef(1)
  const bellSkew = useRef(1)
  const desired = useRef(new THREE.Vector3(...STATIC_FOCUS))
  const eased = useRef(new THREE.Vector3())
  // reused scratch
  const a = useRef(new THREE.Vector3())
  const b = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    const st = useTasteStore.getState()
    const { absorbPhase, absorbKind, absorbStartedAt, heldCenterW, pendingAssetId, releasingAssetId } = st
    const active = absorbPhase !== 'idle' && absorbStartedAt != null && heldCenterW != null

    // Defaults (idle): keep the DOF focal plane ON the user lens so it stays
    // crisp as it drifts toward its taste centroid (it idles in build mode).
    // No camera override when idle (CameraRig's baseFraming follows the lens).
    if (st.mode === 'build') {
      const uw = toWorld(deriveUserProfile(st.activeAssetIds).displayPosition)
      desired.current.set(uw[0], uw[1], uw[2])
    } else {
      desired.current.set(STATIC_FOCUS[0], STATIC_FOCUS[1], STATIC_FOCUS[2])
    }
    let targetExposure = 1.15
    let targetBloom = 0.95

    if (active) {
      const elapsed = performance.now() - absorbStartedAt!
      const heldW = heldCenterW!
      const morph = useUserMorphStore.getState()
      const driverId = absorbKind === 'remove' ? releasingAssetId : pendingAssetId

      // New beat? compute endpoints + the body stretch axis up front (the asset
      // set already reflects the change for 'add'; for 'remove' we compute the
      // hypothetical post-removal centroid without mutating yet).
      if (startRef.current !== absorbStartedAt) {
        startRef.current = absorbStartedAt!
        committed.current = false
        bellSkew.current = absorbKind === 'remove' ? 0.85 : 1
        morphStart.current.set(heldW[0], heldW[1], heldW[2])

        // post-change centroid (the body's destination)
        let endIds = st.activeAssetIds
        if (absorbKind === 'remove' && releasingAssetId) {
          endIds = endIds.filter((id) => id !== releasingAssetId)
        }
        const newW = toWorld(deriveUserProfile(endIds).displayPosition)
        morphTarget.current.set(newW[0], newW[1], newW[2])

        // travelDir = where the centroid lands; driverDir = the cause's bearing
        a.current.copy(morphTarget.current).sub(morphStart.current)
        const travelLen = a.current.length()
        distScale.current = clamp(travelLen / 2.5)
        if (travelLen > 1e-4) a.current.normalize()
        else a.current.set(0, 1, 0)

        if (driverId) {
          const dW = toWorld(getAsset(driverId).position)
          // add: head toward the new tile; remove: recoil away from the leaver
          if (absorbKind === 'remove') {
            b.current.set(heldW[0] - dW[0], heldW[1] - dW[1], heldW[2] - dW[2])
          } else {
            b.current.set(dW[0] - heldW[0], dW[1] - heldW[1], dW[2] - heldW[2])
          }
          if (b.current.lengthSq() > 1e-6) b.current.normalize()
          else b.current.copy(a.current)
        } else {
          b.current.copy(a.current)
        }
        // stretch axis: blend 60% toward the driver so the elongation honestly
        // aims at the cause even when other refs dilute the travel direction.
        a.current.lerp(b.current, 0.6)
        if (a.current.lengthSq() > 1e-6) a.current.normalize()
        else a.current.set(0, 1, 0)
        if (a.current.y < -0.999) a.current.x += 1e-3 // antipode guard
        a.current.normalize()
        stretchAxis.current = [a.current.x, a.current.y, a.current.z]

        morph.setImpactColor(driverId ? getAsset(driverId).palette[0] ?? null : null)
      }

      if (elapsed < SIT_MS) {
        // ---- SETTLE-IN: the new tile has landed; the bubble sits still. No
        // stretch — a held beat so the addition registers. ----
        if (absorbPhase !== 'hold') st.setAbsorbPhase('hold')
        morph.setMorph(true, heldW, 0)
        morph.setStretch(stretchAxis.current, damp(morph.stretchAmt, 0, 5, dt))
        desired.current.set(heldW[0], heldW[1], heldW[2])
      } else {
        // ---- MIGRATE: the whole drop stretches (round→elongated→round) and
        // eases to the new centroid; tiles stay put, trailing viscously. ----
        if (!committed.current) {
          committed.current = true
          if (absorbKind === 'remove' && releasingAssetId) st.commitAbsorb()
        }
        const p = clamp((elapsed - SIT_MS) / MIGRATE_MS)
        const e = easeInOutCubic(p)
        eased.current.copy(morphStart.current).lerp(morphTarget.current, e)
        morph.setMorph(true, [eased.current.x, eased.current.y, eased.current.z], e)
        const amt = STRETCH_MAX * Math.sin(Math.PI * Math.pow(p, bellSkew.current)) * distScale.current
        morph.setStretch(stretchAxis.current, amt)
        desired.current.copy(eased.current)

        if (elapsed >= TOTAL_MS) {
          st.endAbsorb() // also clears userMorphStore (stretch/pos)
          useCameraStore.getState().setGoal(null)
          startRef.current = null
        }
      }

      // Gentle camera goal framing the lens; calm throughout.
      useCameraStore.getState().setGoal({
        pos: [desired.current.x + CAM_OFF[0], desired.current.y + CAM_OFF[1], desired.current.z + CAM_OFF[2]],
        look: [desired.current.x, desired.current.y, desired.current.z],
        lambda: 1.1,
      })
    }

    // Damp the shared focus point toward the desired focus (racks smoothly).
    focusVec.x = damp(focusVec.x, desired.current.x, 3.5, dt)
    focusVec.y = damp(focusVec.y, desired.current.y, 3.5, dt)
    focusVec.z = damp(focusVec.z, desired.current.z, 3.5, dt)

    // Exposure + bloom breath (defaults when idle, so the resting look is unchanged).
    gl.toneMappingExposure = damp(gl.toneMappingExposure, targetExposure, 2.5, dt)
    const bloom = bloomRef.current
    if (bloom) bloom.intensity = damp(bloom.intensity, targetBloom, 2.5, dt)
  })

  return null
}
