import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAsset, type Asset } from '../data/tasteData'
import { clamp, toWorld } from '../lib/taste'
import { useTasteStore } from '../store/tasteStore'
import { useUserMorphStore } from '../store/userMorphStore'
import { usePullStore } from '../store/pullStore'
import { AssetVisual, assetSize } from './AssetVisual'
import { softDot } from './softDot'
import { curveColorFor } from './InfluenceCurve'

export interface AssetAttachmentProps {
  asset: Asset
  index: number
  total: number
  palette: string[]
  /** Radius of the containing bubble (world units). */
  containerRadius: number
  /** Visual prominence: 1 for the user's references, lower for anchors. */
  emphasis?: number
  /** Whether this tile belongs to the user lens (gets pull lunges). */
  isUser?: boolean
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const lungeEnv = (tau: number) => Math.sin(Math.PI * Math.pow(clamp(tau), 0.7))

export function AssetAttachment({
  asset,
  index,
  total,
  palette,
  containerRadius,
  emphasis = 1,
  isUser = false,
}: AssetAttachmentProps) {
  const holder = useRef<THREE.Group>(null!)
  const wake = useRef<THREE.Mesh>(null!)
  const wakeMat = useRef<THREE.MeshBasicMaterial>(null!)
  const wakeColor = useMemo(
    () => new THREE.Color(curveColorFor(asset.type, asset.palette.length ? asset.palette : palette)),
    [asset, palette],
  )

  // Phyllotaxis disc, but scattered THROUGH the bubble rather than packed on a
  // flat plane: a wider radial spread, a little deterministic jitter so it reads
  // organic (not a mechanical lattice), and a per-tile depth offset so tiles sit
  // at staggered front-to-back depths inside the glass (less cramped, floatier).
  const layout = useMemo(() => {
    const n = Math.max(total, 1)
    // deterministic per-index hash (stable across frames/renders), ~[-1,1]
    const h1 = Math.sin(index * 12.9898) * 43758.5453
    const h2 = Math.sin(index * 78.233) * 12543.987
    const j1 = (h1 - Math.floor(h1)) * 2 - 1
    const j2 = (h2 - Math.floor(h2)) * 2 - 1
    const rNorm = n === 1 ? 0 : Math.sqrt((index + 0.5) / n)
    const ang = index * GOLDEN + j1 * 0.5
    const maxR = containerRadius * 0.62
    const rJit = rNorm * (1 + j2 * 0.18)
    const x2d = Math.cos(ang) * rJit * maxR
    const y2d = Math.sin(ang) * rJit * maxR
    const depthOffset = containerRadius * (j1 * 0.12 - rNorm * 0.1)
    const bobPhase = index * 1.7
    const swayPhase = index * 0.9
    return { x2d, y2d, depthOffset, bobPhase, swayPhase }
  }, [index, total, containerRadius])

  const [unitW, unitH] = assetSize(asset)
  // shrink as the cluster grows so the (now wider-spread) tiles don't overlap
  const tileScale = containerRadius * (0.58 - Math.min(total, 6) * 0.035)

  // reused vectors (avoid per-frame allocation)
  const camX = useRef(new THREE.Vector3())
  const camY = useRef(new THREE.Vector3())
  const camZ = useRef(new THREE.Vector3())
  const out = useRef(new THREE.Vector3())
  const pullW = useRef(new THREE.Vector3())

  useFrame((state, dt) => {
    if (!holder.current) return
    const t = state.clock.elapsedTime
    const { x2d, y2d, depthOffset, bobPhase, swayPhase } = layout

    // camera-facing basis so the contents always nestle at the near side
    state.camera.matrixWorld.extractBasis(camX.current, camY.current, camZ.current)

    const hovered = useTasteStore.getState().hoveredAssetId
    const isHovered = hovered === asset.id
    // Only dim siblings within the SAME lens as the hovered reference.
    const dimmed = hovered != null && !isHovered && getAsset(hovered).owner === asset.owner

    const lift = x2d + Math.sin(t * 0.5 + swayPhase) * containerRadius * 0.015
    const rise = y2d + Math.cos(t * 0.45 + bobPhase) * containerRadius * 0.015
    const depth =
      containerRadius * (1.16 + (isHovered ? 0.13 : 0)) +
      depthOffset +
      Math.sin(t * 0.4 + bobPhase) * containerRadius * 0.02

    // ---- pull lunge: while this ref is indicating, it dives toward its true
    // taste-space pull direction (projected onto the camera plane), dragging a
    // pigment wake. Direction = which way it dives; strength = how far + bright.
    let lungeScale = 1
    let wakeOpacity = 0
    let wakeLen = 0
    let sx = 0
    let sy = 0
    if (isUser) {
      const pull = usePullStore.getState().activePulls.find((p) => p.id === asset.id)
      if (pull) {
        const morph = useUserMorphStore.getState()
        const cW = morph.active ? morph.pos : [0, 0, 0]
        const tW = toWorld(asset.position)
        pullW.current.set(tW[0] - cW[0], tW[1] - cW[1], tW[2] - cW[2])
        if (pullW.current.lengthSq() > 1e-6) pullW.current.normalize()
        // project the world pull onto the camera basis (screen plane + depth)
        sx = pullW.current.dot(camX.current)
        sy = pullW.current.dot(camY.current)
        const sz = pullW.current.dot(camZ.current) * 0.5
        // floor: if the pull is nearly head-on (tiny in-plane), bias tangentially
        if (Math.hypot(sx, sy) < 0.12) {
          sx += 0.12
        }
        const env = lungeEnv(pull.tau) * (pull.releasing ? -1 : 1)
        const aMax = containerRadius * (0.2 + 0.35 * pull.weight)
        const A = aMax * env
        out.current
          .set(0, 0, 0)
          .addScaledVector(camX.current, lift + sx * A)
          .addScaledVector(camY.current, rise + sy * A)
          .addScaledVector(camZ.current, depth + sz * A)
        holder.current.position.copy(out.current)
        lungeScale = 1 + 0.18 * Math.abs(env) * pull.weight
        wakeOpacity = 0.55 * pull.weight * Math.abs(env)
        wakeLen = (0.7 + 1.6 * pull.weight) * Math.abs(env)
      } else {
        out.current
          .set(0, 0, 0)
          .addScaledVector(camX.current, lift)
          .addScaledVector(camY.current, rise)
          .addScaledVector(camZ.current, depth)
        holder.current.position.copy(out.current)
      }
    } else {
      out.current
        .set(0, 0, 0)
        .addScaledVector(camX.current, lift)
        .addScaledVector(camY.current, rise)
        .addScaledVector(camZ.current, depth)
      holder.current.position.copy(out.current)
    }

    const targetScale = (isHovered ? 1.32 : dimmed ? 0.82 : 1) * lungeScale * tileScale
    const s = holder.current.scale.x
    const ns = s + (targetScale - s) * Math.min(1, dt * 8)
    holder.current.scale.setScalar(ns)

    // drive the pigment wake (a child of the holder, in its local frame)
    if (wake.current && wakeMat.current) {
      const vis = wakeOpacity > 0.01
      wake.current.visible = vis
      if (vis) {
        const angle = Math.atan2(sy, sx) + Math.PI // trail behind the lunge
        wake.current.rotation.z = angle
        wake.current.scale.set(wakeLen, wakeLen * 0.42, 1)
        wake.current.position.set((Math.cos(angle) * wakeLen) / 2, (Math.sin(angle) * wakeLen) / 2, -0.04)
        wakeMat.current.color.copy(wakeColor)
        wakeMat.current.opacity = wakeOpacity
      }
    }
  })

  return (
    <group ref={holder}>
      {isUser && (
        <mesh ref={wake} renderOrder={9} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={wakeMat}
            map={softDot}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}
      <AssetVisual asset={asset} sizeW={unitW} sizeH={unitH} opacity={0.78 + emphasis * 0.22} />
    </group>
  )
}
