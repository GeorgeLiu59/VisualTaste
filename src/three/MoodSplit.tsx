import { useEffect, useMemo, useRef, useState } from 'react'
import { Billboard, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../lib/taste'
import { getAsset } from '../data/tasteData'
import { useChatStore, type ChatStage } from '../store/chatStore'
import { moodSubsets, type MoodSubset } from '../data/chatData'
import { Lens, makeGlowMaterial, rimFrag } from './Lens'
import { ProfileAttachments } from './ProfileAttachments'
import { softDot } from './softDot'

// ---------------------------------------------------------------------------
// Moodio "generate" beat. The user's lens slowly cleaves into 4 mood-cluster
// sub-bubbles that drift to the quadrants (splitting). Each carries the actual
// references for its category (image / text / palette tiles, split off from the
// original lens) and rotates + pulses (generating). Then each dissolves as it
// reveals its image inside a rectangular glass frame that matches the bubble
// material (revealed). Frame-driven off chatStore — no React churn.
// ---------------------------------------------------------------------------

type V3 = [number, number, number]

// quadrant spread (world units) around the lens; grid lifted so the bottom row
// clears the chat box.
const DX = 7.0
const DY = 4.6
const GRID_Y = 1.0

// sub-bubble size while generating (kept modest — they settle smaller after the
// split, per the gentle, aesthetic read).
const BUBBLE_SCALE = 2.4

// result image box (large — the bubble dissolves into a glass frame)
const BOX_W = 10.0
const BOX_H = 6.5
const FRAME_M = 0.5 // glass frame margin around the image (each side)

/** order 0..3 → TL, TR, BL, BR (relative to the lens center). */
function quadrant(order: number, userWorld: V3): V3 {
  const x = userWorld[0] + (order % 2 === 0 ? -DX : DX)
  const y = userWorld[1] + GRID_Y + (order < 2 ? DY : -DY)
  return [x, y, userWorld[2]]
}

export interface MoodSplitProps {
  userWorld: V3
}

export function MoodSplit({ userWorld }: MoodSplitProps) {
  // A shared shimmer heartbeat: while splitting/generating we bump a seed each
  // sub-bubble reads as a one-shot rim/core pulse (on top of the spin).
  const [pulse, setPulse] = useState(0)
  const stage = useChatStore((s) => s.stage)

  useEffect(() => {
    if (stage !== 'generating' && stage !== 'splitting') return
    const t = setInterval(() => setPulse((p) => p + 1), 650)
    return () => clearInterval(t)
  }, [stage])

  return (
    <group>
      {moodSubsets.map((subset) => (
        <Entity key={subset.id} subset={subset} userWorld={userWorld} pulse={pulse} stage={stage} />
      ))}
    </group>
  )
}

function Entity({
  subset,
  userWorld,
  pulse,
  stage,
}: {
  subset: MoodSubset
  userWorld: V3
  pulse: number
  stage: ChatStage
}) {
  const holder = useRef<THREE.Group>(null!)
  const spinner = useRef<THREE.Group>(null!)
  const memberAssets = useMemo(() => subset.members.map(getAsset), [subset])

  const split = stage !== 'idle'
  const revealed = stage === 'revealed'
  const lensScale = split ? BUBBLE_SCALE : 0.04

  useFrame((state, dt) => {
    const cs = useChatStore.getState()
    // slow, staggered release: each bubble drifts off to its quadrant a clear
    // beat after the previous one (a gentle fan, not a snap).
    const elapsed = cs.submittedAt != null ? performance.now() - cs.submittedAt : 0
    const released = cs.stage !== 'idle' && elapsed >= subset.order * 280
    const target = released ? quadrant(subset.order, userWorld) : userWorld
    const h = holder.current
    if (h) {
      // low lambda → a slow, eased drift to the quadrant
      h.position.x = damp(h.position.x, target[0], 1.3, dt)
      h.position.y = damp(h.position.y, target[1], 1.3, dt)
      h.position.z = damp(h.position.z, target[2], 1.3, dt)
    }

    // Only the glass bubble spins + pulses (its reference tiles stay billboarded
    // and readable — they live in `holder`, not the spinning `spinner`).
    const sp = spinner.current
    if (sp) {
      const working = cs.stage === 'splitting' || cs.stage === 'generating'
      if (working) {
        sp.rotation.y += dt * (0.7 + subset.order * 0.08)
        sp.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2.6 + subset.order * 1.3) * 0.06)
      } else {
        sp.rotation.y = damp(sp.rotation.y, 0, 4, dt)
        sp.scale.setScalar(damp(sp.scale.x, 1, 6, dt))
      }
    }
  })

  return (
    <group ref={holder} position={userWorld}>
      {/* the glass bubble (spins + pulses); unmounts on reveal as the frame takes over */}
      {!revealed && (
        <group ref={spinner}>
          <Lens
            position={[0, 0, 0]}
            palette={subset.palette}
            accent={subset.accent}
            scale={lensScale}
            irregular={0.035}
            geometrySeed={subset.order + 10}
            showParticles={split}
            rippleSeed={pulse}
            rimScale={0.85}
            tilePresence={split ? 1 : 0}
          />
        </group>
      )}

      {/* the category's actual references, split off into this bubble */}
      {split && !revealed && (
        <ProfileAttachments center={[0, 0, 0]} radius={BUBBLE_SCALE * 0.82} assets={memberAssets} emphasis={1} />
      )}

      <MoodPane src={subset.resultSrc} fallbackSrc={subset.fallbackSrc} accent={subset.accent} revealed={revealed} />
    </group>
  )
}

/**
 * The staged result image, billboarded so it stays readable as the camera
 * orbits, wrapped in a rectangular glass frame that matches the bubble material:
 * a clear-coated translucent slab with the bubble's fresnel rim glow on its
 * rounded edges (so it reads as the bubble re-formed around the image), plus a
 * soft accent halo. The image "develops" in (opacity + a slight scale settle).
 * Loads its texture imperatively (contain-fit), falling back to an existing
 * still until the staged result image exists.
 */
function MoodPane({
  src,
  fallbackSrc,
  accent,
  revealed,
}: {
  src: string
  fallbackSrc: string
  accent: string
  revealed: boolean
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const grp = useRef<THREE.Group>(null!)
  const imgMat = useRef<THREE.MeshBasicMaterial>(null!)
  const glassMat = useRef<THREE.MeshPhysicalMaterial>(null!)
  const haloMat = useRef<THREE.MeshBasicMaterial>(null!)
  const sheen = useRef<THREE.Mesh>(null!)

  // the bubble's fresnel rim glow, reused on the rectangular frame's edges
  const rimMat = useMemo(() => {
    const m = makeGlowMaterial(accent, rimFrag, 2.0)
    m.uniforms.uIntensity.value = 0 // start dark; fades up on reveal
    return m
  }, [accent])

  useEffect(() => {
    let active = true
    const apply = (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.generateMipmaps = true
      if (active) setTex(t)
      else t.dispose()
    }
    const loader = new THREE.TextureLoader()
    loader.load(src, apply, undefined, () => loader.load(fallbackSrc, apply))
    return () => {
      active = false
    }
  }, [src, fallbackSrc])

  // contain-fit the image inside the box at its own aspect
  let w = BOX_W
  let h = BOX_H
  const img = tex?.image as { width: number; height: number } | undefined
  if (img && img.width && img.height) {
    const a = img.width / img.height
    const boxA = BOX_W / BOX_H
    if (a > boxA) {
      w = BOX_W
      h = BOX_W / a
    } else {
      h = BOX_H
      w = BOX_H * a
    }
  }
  const fw = w + FRAME_M * 2
  const fh = h + FRAME_M * 2

  useFrame((state, dt) => {
    const t = revealed ? 1 : 0
    if (imgMat.current) imgMat.current.opacity = damp(imgMat.current.opacity, t, 5, dt)
    if (glassMat.current) glassMat.current.opacity = damp(glassMat.current.opacity, t * 0.24, 5, dt)
    if (haloMat.current) haloMat.current.opacity = damp(haloMat.current.opacity, t * 0.18, 5, dt)
    rimMat.uniforms.uIntensity.value = damp(rimMat.uniforms.uIntensity.value, t * 1.6, 5, dt)
    if (grp.current) {
      const s = damp(grp.current.scale.x, revealed ? 1 : 1.06, 5, dt)
      grp.current.scale.setScalar(s)
    }
    // glass sheen drifts across the image as the camera orbits
    if (sheen.current) {
      const cam = state.camera.position
      const ang = Math.atan2(cam.x, cam.z)
      sheen.current.position.x = Math.sin(ang) * w * 0.18
      const sm = sheen.current.material as THREE.MeshBasicMaterial
      sm.opacity = damp(sm.opacity, t * 0.1, 5, dt)
    }
  })

  return (
    <Billboard>
      <group ref={grp}>
        {/* soft outer accent halo */}
        <mesh position={[0, 0, -0.5]} renderOrder={8}>
          <planeGeometry args={[BOX_W + 1.8, BOX_H + 1.8]} />
          <meshBasicMaterial
            ref={haloMat}
            color={accent}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* glass frame body — clear-coated translucent slab (matches the bubble) */}
        <RoundedBox args={[fw, fh, 0.5]} radius={0.34} smoothness={4} position={[0, 0, -0.15]} renderOrder={9}>
          <meshPhysicalMaterial
            ref={glassMat}
            color="#cfe0f2"
            transparent
            opacity={0}
            roughness={0.05}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.06}
            transmission={0}
            ior={1.3}
            depthWrite={false}
          />
        </RoundedBox>
        {/* fresnel rim glow on the frame's rounded edges (the bubble's rim) */}
        <RoundedBox args={[fw, fh, 0.5]} radius={0.34} smoothness={4} scale={1.018} position={[0, 0, -0.15]} renderOrder={10}>
          <primitive object={rimMat} attach="material" />
        </RoundedBox>
        {tex && (
          <>
            <mesh renderOrder={11} position={[0, 0, 0.2]}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial ref={imgMat} map={tex} transparent opacity={0} toneMapped={false} depthTest={false} />
            </mesh>
            <mesh ref={sheen} renderOrder={12} scale={[w * 0.85, h * 0.5, 1]} position={[0, h * 0.18, 0.22]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                map={softDot}
                color="#e6f0ff"
                transparent
                opacity={0}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                depthTest={false}
                toneMapped={false}
              />
            </mesh>
          </>
        )}
      </group>
    </Billboard>
  )
}
