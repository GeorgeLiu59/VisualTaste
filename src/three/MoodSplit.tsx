import { useEffect, useMemo, useRef, useState } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../lib/taste'
import { getAsset, type Asset } from '../data/tasteData'
import { useChatStore, type ChatStage } from '../store/chatStore'
import { moodSubsets, type MoodSubset } from '../data/chatData'
import { Lens } from './Lens'
import { AssetVisual, assetSize } from './AssetVisual'
import { softDot } from './softDot'

// ---------------------------------------------------------------------------
// Moodio "generate" beat. The user's lens slowly cleaves into 4 mood-cluster
// sub-bubbles that drift to the quadrants (splitting). Each is a roomy glass
// bubble holding the actual references for its category (image / text / palette
// tiles, split off from the original lens), gently floating + rotating
// (generating). Then each dissolves and reveals its image, presented clean —
// just the image, no frame (revealed). Frame-driven off chatStore.
// ---------------------------------------------------------------------------

type V3 = [number, number, number]

// quadrant spread (world units) around the lens; grid lifted so the bottom row
// clears the chat box.
const DX = 7.0
const DY = 4.6
const GRID_Y = 1.0

// sub-bubble size while generating — roomy so its references spread out.
const BUBBLE_SCALE = 3.4

// result image box (large)
const BOX_W = 10.0
const BOX_H = 6.5

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
      h.position.x = damp(h.position.x, target[0], 1.3, dt)
      h.position.y = damp(h.position.y, target[1], 1.3, dt)
      h.position.z = damp(h.position.z, target[2], 1.3, dt)
    }

    // Only the glass bubble spins + pulses (its reference tiles float + stay
    // billboarded/readable — they live in `holder`, not the spinning `spinner`).
    const sp = spinner.current
    if (sp) {
      const working = cs.stage === 'splitting' || cs.stage === 'generating'
      if (working) {
        sp.rotation.y += dt * (0.6 + subset.order * 0.07)
        sp.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2.6 + subset.order * 1.3) * 0.06)
      } else {
        sp.rotation.y = damp(sp.rotation.y, 0, 4, dt)
        sp.scale.setScalar(damp(sp.scale.x, 1, 6, dt))
      }
    }
  })

  return (
    <group ref={holder} position={userWorld}>
      {/* the glass bubble (spins + pulses); unmounts on reveal */}
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

      {/* the category's references, spread out + gently floating inside the bubble */}
      {split && !revealed && memberAssets.map((a, i) => (
        <FloatingTile key={a.id} asset={a} index={i} total={memberAssets.length} radius={BUBBLE_SCALE} />
      ))}

      <MoodPane src={subset.resultSrc} fallbackSrc={subset.fallbackSrc} revealed={revealed} />
    </group>
  )
}

/**
 * One reference tile floating inside a sub-bubble: laid out on a roomy
 * camera-facing ring (so the references don't crowd), billboarded for
 * legibility, drifting gently so the cluster feels alive rather than static.
 */
function FloatingTile({ asset, index, total, radius }: { asset: Asset; index: number; total: number; radius: number }) {
  const ref = useRef<THREE.Group>(null!)
  const [w, h] = assetSize(asset)
  const tileScale = radius * 0.32

  const layout = useMemo(() => {
    // even ring placement; single tile sits centered
    const ang = total <= 1 ? 0 : (index / total) * Math.PI * 2 - Math.PI / 2
    const spreadR = total <= 1 ? 0 : radius * 0.6
    return { bx: Math.cos(ang) * spreadR, by: Math.sin(ang) * spreadR, ph: index * 1.7, ph2: index * 2.3 + 1 }
  }, [index, total, radius])

  const camX = useRef(new THREE.Vector3())
  const camY = useRef(new THREE.Vector3())
  const camZ = useRef(new THREE.Vector3())
  const out = useRef(new THREE.Vector3())
  const cur = useRef(0.0001)

  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime
    state.camera.matrixWorld.extractBasis(camX.current, camY.current, camZ.current)
    // gentle drift so the references aren't static
    const lift = layout.bx + Math.sin(t * 0.5 + layout.ph) * radius * 0.06
    const rise = layout.by + Math.cos(t * 0.42 + layout.ph2) * radius * 0.06
    const depth = radius * 0.12
    out.current
      .set(0, 0, 0)
      .addScaledVector(camX.current, lift)
      .addScaledVector(camY.current, rise)
      .addScaledVector(camZ.current, depth)
    g.position.copy(out.current)
    // grow in
    cur.current = damp(cur.current, tileScale, 7, dt)
    g.scale.setScalar(cur.current)
  })

  return (
    <group ref={ref} scale={0.0001}>
      <AssetVisual asset={asset} sizeW={w} sizeH={h} opacity={0.96} />
    </group>
  )
}

/**
 * The staged result image, presented clean — just the contain-fit image with a
 * soft glass sheen drifting across it (no frame/border). It "develops" in on
 * reveal (opacity + a slight scale settle). Loads its texture imperatively,
 * falling back to an existing still until the staged result image exists.
 */
function MoodPane({ src, fallbackSrc, revealed }: { src: string; fallbackSrc: string; revealed: boolean }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const grp = useRef<THREE.Group>(null!)
  const imgMat = useRef<THREE.MeshBasicMaterial>(null!)
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
    const t = revealed ? 1 : 0
    if (imgMat.current) imgMat.current.opacity = damp(imgMat.current.opacity, t, 5, dt)
    if (grp.current) {
      const s = damp(grp.current.scale.x, revealed ? 1 : 1.06, 5, dt)
      grp.current.scale.setScalar(s)
    }
    if (sheen.current) {
      const cam = state.camera.position
      const ang = Math.atan2(cam.x, cam.z)
      sheen.current.position.x = Math.sin(ang) * w * 0.18
      const sm = sheen.current.material as THREE.MeshBasicMaterial
      sm.opacity = damp(sm.opacity, t * 0.09, 5, dt)
    }
  })

  return (
    <Billboard>
      <group ref={grp}>
        {tex && (
          <>
            <mesh renderOrder={11}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial ref={imgMat} map={tex} transparent opacity={0} toneMapped={false} depthTest={false} />
            </mesh>
            <mesh ref={sheen} renderOrder={12} scale={[w * 0.85, h * 0.5, 1]} position={[0, h * 0.18, 0.01]}>
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
