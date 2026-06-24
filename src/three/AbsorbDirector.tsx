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
//   hold     0 .. HOLD_MS         acknowledge; body pinned; glass pre-reaches
//                                 toward the driver (cause before effect)
//   commit   @HOLD_MS             latch: (remove) filter set, capture endpoints
//                                 + the stretch axis aimed at the driver
//   migrate  HOLD_MS .. +MIGRATE  eased move while the drop stretches round→
//                                 elongated→round along the axis
//   settle   .. +SETTLE           release
// ---------------------------------------------------------------------------
const HOLD_MS = 420
const MIGRATE_MS = 2400
const SETTLE_MS = 350
const COMMIT_AT = HOLD_MS
const TOTAL_MS = COMMIT_AT + MIGRATE_MS + SETTLE_MS

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

    // Defaults (idle): resting focus, default fx, no camera override.
    desired.current.set(STATIC_FOCUS[0], STATIC_FOCUS[1], STATIC_FOCUS[2])
    let targetExposure = 1.15
    let targetBloom = 0.95

    if (active) {
      const elapsed = performance.now() - absorbStartedAt!
      const heldW = heldCenterW!
      const morph = useUserMorphStore.getState()
      const driverId = absorbKind === 'remove' ? releasingAssetId : pendingAssetId

      // New beat? reset latches + compute the provisional reach axis (toward the
      // driver), so the pre-reach during hold already aims the right way.
      if (startRef.current !== absorbStartedAt) {
        startRef.current = absorbStartedAt!
        committed.current = false
        bellSkew.current = absorbKind === 'remove' ? 0.85 : 1
        if (driverId) {
          const dW = toWorld(getAsset(driverId).position)
          // ADD reaches toward the driver; REMOVE leans toward the leaving tile
          // (it's still part of the shape) and will flip to recoil at commit.
          a.current.set(dW[0] - heldW[0], dW[1] - heldW[1], dW[2] - heldW[2])
          if (a.current.lengthSq() < 1e-6) a.current.set(0, 1, 0)
          a.current.normalize()
          stretchAxis.current = [a.current.x, a.current.y, a.current.z]
        }
        morph.setImpactColor(driverId ? getAsset(driverId).palette[0] ?? null : null)
      }

      if (elapsed < COMMIT_AT) {
        // ---- HOLD: body parked; the drop pre-reaches toward the driver ----
        if (absorbPhase !== 'hold') st.setAbsorbPhase('hold')
        morph.setMorph(true, heldW, 0)
        const reachP = clamp(elapsed / HOLD_MS)
        // ramp the pre-reach in (cause before effect); damped so it eases
        const reachAmt = 0.42 * STRETCH_MAX * easeInOutCubic(reachP)
        morph.setStretch(stretchAxis.current, damp(morph.stretchAmt, reachAmt, 6, dt))
        morph.setDriver(driverId, damp(morph.driverLead, reachP, 5, dt))
        desired.current.set(heldW[0], heldW[1], heldW[2])
        targetExposure = 1.2
        targetBloom = 0.88
      } else {
        // ---- COMMIT (once): latch the mutation, capture endpoints + axis ----
        if (!committed.current) {
          committed.current = true
          morphStart.current.set(heldW[0], heldW[1], heldW[2])
          st.commitAbsorb() // remove: filters the set → new derived profile
          const ids = useTasteStore.getState().activeAssetIds
          const newW = toWorld(deriveUserProfile(ids).displayPosition)
          morphTarget.current.set(newW[0], newW[1], newW[2])

          // travel dir (where the centroid lands) and driver dir (the cause)
          a.current.copy(morphTarget.current).sub(morphStart.current)
          const travelLen = a.current.length()
          distScale.current = clamp(travelLen / 2.5)
          if (travelLen > 1e-4) a.current.normalize()
          else a.current.set(stretchAxis.current[0], stretchAxis.current[1], stretchAxis.current[2])

          if (driverId) {
            const dW = toWorld(getAsset(driverId).position)
            if (absorbKind === 'remove') {
              // recoil AWAY from the leaving tile
              b.current.set(heldW[0] - dW[0], heldW[1] - dW[1], heldW[2] - dW[2])
            } else {
              // reach TOWARD the new tile
              b.current.set(dW[0] - heldW[0], dW[1] - heldW[1], dW[2] - heldW[2])
            }
            if (b.current.lengthSq() > 1e-6) b.current.normalize()
            else b.current.copy(a.current)
          } else {
            b.current.copy(a.current)
          }
          // blend 60% toward the driver so the tip honestly aims at the cause
          a.current.lerp(b.current, 0.6)
          if (a.current.lengthSq() > 1e-6) a.current.normalize()
          else a.current.set(0, 1, 0)
          // antipode guard for setFromUnitVectors(up, axis) in Lens
          if (a.current.y < -0.999) a.current.x += 1e-3
          a.current.normalize()
          stretchAxis.current = [a.current.x, a.current.y, a.current.z]
        }
        // ---- MIGRATE: eased move + the round→elongated→round stretch bell ----
        const p = clamp((elapsed - COMMIT_AT) / MIGRATE_MS)
        const e = easeInOutCubic(p)
        eased.current.copy(morphStart.current).lerp(morphTarget.current, e)
        morph.setMorph(true, [eased.current.x, eased.current.y, eased.current.z], e)
        const amt = STRETCH_MAX * Math.sin(Math.PI * Math.pow(p, bellSkew.current)) * distScale.current
        morph.setStretch(stretchAxis.current, amt)
        morph.setDriver(driverId, 1 - p) // driver leads at launch, rejoins by settle
        desired.current.copy(eased.current)

        if (elapsed >= TOTAL_MS) {
          st.endAbsorb() // also clears userMorphStore (stretch/driver/pos)
          useCameraStore.getState().setGoal(null)
          startRef.current = null
        }
      }

      // Gentle camera goal: frame `desired`, slight dolly per phase. Calm.
      const dolly = absorbPhase === 'hold' ? 0.97 : 1.0
      const lambda = absorbPhase === 'hold' ? 1.2 : 0.9
      useCameraStore.getState().setGoal({
        pos: [desired.current.x + CAM_OFF[0], desired.current.y + CAM_OFF[1], desired.current.z + CAM_OFF[2] * dolly],
        look: [desired.current.x, desired.current.y, desired.current.z],
        lambda,
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
