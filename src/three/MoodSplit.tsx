import { useEffect, useRef, useState } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../lib/taste'
import { useChatStore, type ChatStage } from '../store/chatStore'
import { moodSubsets, type MoodSubset } from '../data/chatData'
import { Lens } from './Lens'
import { softDot } from './softDot'

// ---------------------------------------------------------------------------
// Moodio "generate" beat. The user's lens cleaves into 4 mood-cluster
// sub-bubbles that fly to the quadrants (splitting), then rotate + pulse for a
// few seconds (generating — the visible thinking beat), then dissolve as each
// reveals its image inside a thin accent border (revealed). All frame-driven
// off chatStore — no React churn in the scene.
// ---------------------------------------------------------------------------

type V3 = [number, number, number]

// quadrant spread (world units) around the lens; grid lifted a touch so the
// bottom row clears the chat box.
const DX = 6.5
const DY = 4.1
const GRID_Y = 0.7

const BUBBLE_SCALE = 0.85

// result image box (large now that the bubble vanishes to just a thin frame)
const BOX_W = 6.8
const BOX_H = 4.4
// thin accent frame around the image (total extra width; half each side)
const BORDER = 0.14

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
    const t = setInterval(() => setPulse((p) => p + 1), 600)
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

  const split = stage !== 'idle'
  const revealed = stage === 'revealed'
  // The bubble shrinks away on reveal — the option is then just the image + a
  // thin accent border (the bubble's color, "opened up").
  const lensScale = revealed ? 0.02 : split ? BUBBLE_SCALE : 0.04

  useFrame((state, dt) => {
    const h = holder.current
    if (!h) return
    const cs = useChatStore.getState()
    // staggered release: each bubble peels off to its quadrant a beat after the
    // previous one (reads as a fanning split rather than four moving as one).
    const elapsed = cs.submittedAt != null ? performance.now() - cs.submittedAt : 0
    const released = cs.stage !== 'idle' && elapsed >= subset.order * 130
    const target = released ? quadrant(subset.order, userWorld) : userWorld
    h.position.x = damp(h.position.x, target[0], 2.4, dt)
    h.position.y = damp(h.position.y, target[1], 2.4, dt)
    h.position.z = damp(h.position.z, target[2], 2.4, dt)

    // While "generating": each sub-bubble slowly rotates and pulses (the visible
    // thinking beat). The image pane is billboarded, so holder rotation only
    // spins the glass bubble, never the revealed image.
    const working = cs.stage === 'splitting' || cs.stage === 'generating'
    if (working) {
      h.rotation.y += dt * (1.0 + subset.order * 0.12)
      const p = 1 + Math.sin(state.clock.elapsedTime * 3.2 + subset.order * 1.3) * 0.08
      h.scale.setScalar(p)
    } else {
      h.scale.setScalar(damp(h.scale.x, 1, 6, dt))
    }
  })

  return (
    <group ref={holder} position={userWorld}>
      <Lens
        position={[0, 0, 0]}
        palette={subset.palette}
        accent={subset.accent}
        scale={lensScale}
        irregular={0.035}
        geometrySeed={subset.order + 10}
        showParticles={split && !revealed}
        rippleSeed={pulse}
        rimScale={0.85}
      />
      <MoodPane
        src={subset.resultSrc}
        fallbackSrc={subset.fallbackSrc}
        accent={subset.accent}
        revealed={revealed}
      />
    </group>
  )
}

/**
 * The staged result image, billboarded so it stays readable as the camera
 * orbits. On reveal it "develops" in (opacity + a slight scale settle) inside a
 * thin accent border — the remnant of the dissolved bubble. Loads its texture
 * imperatively (contain-fit, full brightness), falling back to an existing
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
  const borderMat = useRef<THREE.MeshBasicMaterial>(null!)
  const backMat = useRef<THREE.MeshBasicMaterial>(null!)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null!)
  const sheen = useRef<THREE.Mesh>(null!)

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
    // Prefer the staged result image; fall back to an existing still if it
    // isn't there yet, so the panes never render empty.
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

  useFrame((state, dt) => {
    const target = revealed ? 1 : 0
    if (imgMat.current) imgMat.current.opacity = damp(imgMat.current.opacity, target, 5, dt)
    if (borderMat.current) borderMat.current.opacity = damp(borderMat.current.opacity, target * 0.92, 5, dt)
    if (backMat.current) backMat.current.opacity = damp(backMat.current.opacity, target * 0.7, 5, dt)
    if (glowMat.current) glowMat.current.opacity = damp(glowMat.current.opacity, target * 0.28, 5, dt)
    if (grp.current) {
      const s = damp(grp.current.scale.x, revealed ? 1 : 1.06, 5, dt)
      grp.current.scale.setScalar(s)
    }
    // glass sheen drifting across the pane as the camera orbits
    const m = sheen.current
    if (m) {
      const cam = state.camera.position
      const ang = Math.atan2(cam.x, cam.z)
      m.position.x = Math.sin(ang) * w * 0.18
      const sm = m.material as THREE.MeshBasicMaterial
      sm.opacity = damp(sm.opacity, revealed ? 0.1 : 0, 5, dt)
    }
  })

  return (
    <Billboard>
      <group ref={grp}>
        {/* soft outer accent glow */}
        <mesh position={[0, 0, -0.04]} renderOrder={9}>
          <planeGeometry args={[BOX_W + 0.6, BOX_H + 0.6]} />
          <meshBasicMaterial
            ref={glowMat}
            color={accent}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* dark separation behind the border */}
        <mesh position={[0, 0, -0.03]} renderOrder={10}>
          <planeGeometry args={[w + BORDER + 0.06, h + BORDER + 0.06]} />
          <meshBasicMaterial ref={backMat} color="#05070b" transparent opacity={0} toneMapped={false} depthTest={false} />
        </mesh>
        {/* thin accent border (the dissolved bubble, opened into a frame) */}
        <mesh position={[0, 0, -0.02]} renderOrder={11}>
          <planeGeometry args={[w + BORDER, h + BORDER]} />
          <meshBasicMaterial ref={borderMat} color={accent} transparent opacity={0} toneMapped={false} depthTest={false} />
        </mesh>
        {tex && (
          <>
            <mesh renderOrder={12}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial ref={imgMat} map={tex} transparent opacity={0} toneMapped={false} depthTest={false} />
            </mesh>
            <mesh ref={sheen} renderOrder={13} scale={[w * 0.85, h * 0.5, 1]} position={[0, h * 0.18, 0.01]}>
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
