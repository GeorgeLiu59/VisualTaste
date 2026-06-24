import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTasteStore } from '../store/tasteStore'
import { useCameraStore } from '../store/cameraStore'
import { useUserMorphStore } from '../store/userMorphStore'
import { usePullStore, type ActivePull } from '../store/pullStore'
import { clamp, damp, deriveUserProfile, toWorld } from '../lib/taste'
import { getAsset } from '../data/tasteData'

type V3 = [number, number, number]

// ---------------------------------------------------------------------------
// "Pull chorus" beat timing (ms), off a single frame clock (absorbStartedAt).
//   rack     0 .. RACK_MS            acknowledge; bubble held at old centroid
//   indicate RACK_MS .. COMMIT_AT    each ref lunges in turn (dynamic length)
//   commit   @COMMIT_AT              latch: (remove) filter set, capture endpoints
//   migrate  COMMIT_AT .. +MIGRATE   slow eased move to the new resultant
//   settle   .. +SETTLE              release
// COMMIT_AT is DYNAMIC: it depends on how many refs indicate (see below).
// ---------------------------------------------------------------------------
const RACK_MS = 350
const PER_ASSET_MS = 560 // one ref's lunge window
const MIGRATE_MS = 2400
const SETTLE_MS = 350

/** Resting DOF focus point (matches the original static target). */
const STATIC_FOCUS: V3 = [0.5, 0.95, 0.2]
/** camera offset (pos - look) reused from the build framing in CameraRig. */
const CAM_OFF: V3 = [0.2, 0.95, 18.3]

const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
/** Lunge envelope: fast out, slow return, no overshoot. Peaks ~40% in. */
const lungeEnv = (tau: number) => Math.sin(Math.PI * Math.pow(clamp(tau), 0.7))

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
  // reused scratch
  const center = useRef(new THREE.Vector3())
  const pull = useRef(new THREE.Vector3())
  const leanAcc = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    const st = useTasteStore.getState()
    const { absorbPhase, absorbStartedAt, indicateOrder, indicateStride, heldCenterW } = st
    const active = absorbPhase !== 'idle' && absorbStartedAt != null && heldCenterW != null

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

      const N = Math.max(indicateOrder.length, 1)
      const heldW = heldCenterW!
      center.current.set(heldW[0], heldW[1], heldW[2])
      // dynamic chorus length: last lunge starts at (N-1)*stride, lasts PER_ASSET
      const indicateDur = (N - 1) * indicateStride + PER_ASSET_MS
      const COMMIT_AT = RACK_MS + indicateDur
      const TOTAL_MS = COMMIT_AT + MIGRATE_MS + SETTLE_MS

      if (elapsed < COMMIT_AT) {
        // ---- RACK + INDICATE: bubble held; references lunge one at a time ----
        if (elapsed < RACK_MS) {
          if (absorbPhase !== 'rack') st.setAbsorbPhase('rack')
        } else if (absorbPhase !== 'indicate') {
          st.setAbsorbPhase('indicate')
        }

        // hold the body at the old centroid (e=0: no tint cross-fade yet)
        useUserMorphStore.getState().setMorph(true, heldW, 0)

        // compute which refs are live this frame + accumulate the body lean
        const tIndicate = elapsed - RACK_MS
        const pulls: ActivePull[] = []
        leanAcc.current.set(0, 0, 0)
        let leanColor: string | null = null
        let dominant = -1
        for (let k = 0; k < N; k++) {
          const id = indicateOrder[k]
          const tau = (tIndicate - k * indicateStride) / PER_ASSET_MS
          if (tau < 0 || tau > 1) continue
          const asset = getAsset(id)
          const weight = clamp((asset.strength - 0.3) / 0.7)
          const releasing = st.releasingAssetId === id
          pulls.push({ id, tau, weight, releasing })
          // body lean toward this puller (real world offset, not projected)
          const A = lungeEnv(tau) * (releasing ? -0.5 : 1)
          const tW = toWorld(asset.position)
          pull.current.set(tW[0] - heldW[0], tW[1] - heldW[1], tW[2] - heldW[2])
          if (pull.current.lengthSq() > 1e-6) pull.current.normalize()
          const kLean = (0.05 + 0.12 * weight) * A
          leanAcc.current.addScaledVector(pull.current, kLean)
          if (A > dominant) {
            dominant = A
            leanColor = asset.palette[0] ?? null
          }
        }
        usePullStore.getState().setActivePulls(pulls)
        useUserMorphStore
          .getState()
          .setLean([leanAcc.current.x, leanAcc.current.y, leanAcc.current.z], leanColor)

        // camera stays calmly on the held lens (the lean is a body micro-motion)
        desired.current.copy(center.current)
        targetExposure = 1.22
        targetBloom = 0.85
      } else {
        // ---- COMMIT (once): latch the mutation, capture eased endpoints ----
        if (!committed.current) {
          committed.current = true
          morphStart.current.set(heldW[0], heldW[1], heldW[2])
          st.commitAbsorb() // remove: filters the set → new derived profile
          const newW = toWorld(
            deriveUserProfile(useTasteStore.getState().activeAssetIds).displayPosition,
          )
          morphTarget.current.set(newW[0], newW[1], newW[2])
          // chorus over: clear lunges + lean before the body starts moving
          usePullStore.getState().setActivePulls([])
          useUserMorphStore.getState().setLean([0, 0, 0], null)
        }
        // ---- MIGRATE: one eased clock drives the shared user position ----
        const p = clamp((elapsed - COMMIT_AT) / MIGRATE_MS)
        const e = easeInOutCubic(p)
        eased.current.copy(morphStart.current).lerp(morphTarget.current, e)
        useUserMorphStore
          .getState()
          .setMorph(true, [eased.current.x, eased.current.y, eased.current.z], e)
        desired.current.copy(eased.current) // focus tracks the migrating lens

        if (elapsed >= TOTAL_MS) {
          usePullStore.getState().setActivePulls([])
          st.endAbsorb() // also clears userMorphStore
          useCameraStore.getState().setGoal(null)
          startRef.current = null
        }
      }

      // Gentle camera goal: frame `desired` at the reused build offset, with a
      // small dolly per phase. CameraRig damps toward this (no aggressive cuts).
      const dolly = absorbPhase === 'indicate' ? 1.04 : absorbPhase === 'rack' ? 0.96 : 1.0
      const lambda = absorbPhase === 'indicate' ? 0.9 : absorbPhase === 'rack' ? 1.3 : 1.0
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
