import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTasteStore } from '../store/tasteStore'
import { useCameraStore } from '../store/cameraStore'
import { useUserMorphStore } from '../store/userMorphStore'
import { clamp, damp, deriveUserProfile, toWorld } from '../lib/taste'
import { getAsset, nolanProfile, tarantinoProfile } from '../data/tasteData'

type V3 = [number, number, number]

// ---------------------------------------------------------------------------
// Absorb beat timing (ms), driven off a single frame clock (absorbStartedAt).
//   rack    0 .. 600      present the reference, rack focus onto it
//   survey  600 .. 2000   reveal + compare the whole taste-space (held)
//   commit  @2000         fold pending into the profile, capture morph endpoints
//   migrate 2000 .. 4400  slow eased lens migration — long enough to read the
//                         lens travel, recolor, and reshape as it happens
//   settle  4400 .. 4750  fx/camera ease back, then release
// ---------------------------------------------------------------------------
const RACK_MS = 600
const SURVEY_MS = 1400
const MIGRATE_MS = 2400
const SETTLE_MS = 350
const COMMIT_AT = RACK_MS + SURVEY_MS // 2000
const MIGRATE_END = COMMIT_AT + MIGRATE_MS // 4400
const TOTAL_MS = MIGRATE_END + SETTLE_MS // 4750

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
 * Frame-driven conductor for the cinematic absorb beat. Reads the absorb phase
 * + clock from the store, advances phases, captures the eased migration
 * endpoints at commit, and writes the single authoritative user-lens position
 * to userMorphStore. Also drives the supporting cinematography: a DOF focus
 * pull, a bloom/exposure breath, and gentle camera goals. No React re-render —
 * pure useFrame, mirroring the CameraRig/cameraStore pattern.
 */
export function AbsorbDirector({ focusVec, bloomRef }: AbsorbDirectorProps) {
  const gl = useThree((s) => s.gl)

  const startRef = useRef<number | null>(null)
  const committed = useRef(false)
  const morphStart = useRef(new THREE.Vector3())
  const morphTarget = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Vector3(...STATIC_FOCUS))
  const eased = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    const st = useTasteStore.getState()
    const { absorbPhase, pendingAssetId, absorbStartedAt } = st
    const active = absorbPhase !== 'idle' && absorbStartedAt != null && pendingAssetId != null

    // Defaults (idle): resting focus, default fx, no camera override.
    desired.current.set(STATIC_FOCUS[0], STATIC_FOCUS[1], STATIC_FOCUS[2])
    let targetExposure = 1.15
    let targetBloom = 0.95

    if (active) {
      const elapsed = performance.now() - absorbStartedAt!

      // New beat? reset the per-beat latches.
      if (startRef.current !== absorbStartedAt) {
        startRef.current = absorbStartedAt!
        committed.current = false
      }

      const pending = getAsset(pendingAssetId!)
      const pendingW = toWorld(pending.position)
      const nolanW = toWorld(nolanProfile.position)
      const taraW = toWorld(tarantinoProfile.position)
      const userOldW = toWorld(deriveUserProfile(st.activeAssetIds).displayPosition)
      // In Build mode the anchors + pending node aren't rendered, so the camera
      // stays on the user lens (a simple rack + slow morph). The full
      // constellation framing only applies in Compare mode.
      const compare = st.mode === 'compare'

      if (elapsed < RACK_MS) {
        if (absorbPhase !== 'rack') st.setAbsorbPhase('rack')
        // Compare: rack focus onto the incoming reference at its true coordinate.
        // Build: just hold on the user lens.
        if (compare) desired.current.set(pendingW[0], pendingW[1], pendingW[2])
        else desired.current.set(userOldW[0], userOldW[1], userOldW[2])
        targetExposure = 1.25
        targetBloom = 0.8
      } else if (elapsed < COMMIT_AT) {
        if (absorbPhase !== 'survey') st.setAbsorbPhase('survey')
        if (compare) {
          // hold on the whole-constellation centroid (the comparison beat)
          desired.current.set(
            (userOldW[0] + pendingW[0] + nolanW[0] + taraW[0]) / 4,
            (userOldW[1] + pendingW[1] + nolanW[1] + taraW[1]) / 4,
            (userOldW[2] + pendingW[2] + nolanW[2] + taraW[2]) / 4,
          )
        } else {
          desired.current.set(userOldW[0], userOldW[1], userOldW[2])
        }
        targetExposure = 1.22
        targetBloom = 0.82
      } else {
        // ---- COMMIT (once): fold pending in, capture eased endpoints ----
        if (!committed.current) {
          committed.current = true
          morphStart.current.set(userOldW[0], userOldW[1], userOldW[2])
          st.commitAbsorb() // appends pending → new derived profile
          const newW = toWorld(deriveUserProfile(useTasteStore.getState().activeAssetIds).displayPosition)
          morphTarget.current.set(newW[0], newW[1], newW[2])
        }
        // ---- MIGRATE: one eased clock drives the shared user position ----
        const p = clamp((elapsed - COMMIT_AT) / MIGRATE_MS)
        const e = easeInOutCubic(p)
        eased.current.copy(morphStart.current).lerp(morphTarget.current, e)
        useUserMorphStore
          .getState()
          .setMorph(true, [eased.current.x, eased.current.y, eased.current.z], e)
        desired.current.copy(eased.current) // focus tracks the migrating lens
        // exposure/bloom already easing back to defaults here

        if (elapsed >= TOTAL_MS) {
          useUserMorphStore.getState().clear()
          st.endAbsorb()
          useCameraStore.getState().setGoal(null)
          startRef.current = null
        }
      }

      // Gentle camera goal: frame `desired` at the reused build offset, with a
      // small dolly per phase. CameraRig damps toward this (no aggressive cuts).
      const dolly = absorbPhase === 'survey' ? 1.06 : absorbPhase === 'rack' ? 0.94 : 1.0
      const lambda = absorbPhase === 'survey' ? 0.85 : absorbPhase === 'rack' ? 1.3 : 1.0
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
