import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAsset, type Asset } from '../data/tasteData'
import { useTasteStore } from '../store/tasteStore'
import { AssetVisual, assetSize } from './AssetVisual'

export interface AssetAttachmentProps {
  asset: Asset
  index: number
  total: number
  palette: string[]
  /** Radius of the containing bubble (world units). */
  containerRadius: number
  /** Visual prominence: 1 for the user's references, lower for anchors. */
  emphasis?: number
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

export function AssetAttachment({
  asset,
  index,
  total,
  containerRadius,
  emphasis = 1,
}: AssetAttachmentProps) {
  const holder = useRef<THREE.Group>(null!)

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
    // stagger depth: tiles nearer the rim drift a little deeper, plus jitter,
    // so they don't all sit on one plane. Kept small so all stay in front.
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

  useFrame((state, dt) => {
    if (!holder.current) return
    const t = state.clock.elapsedTime
    const { x2d, y2d, depthOffset, bobPhase, swayPhase } = layout

    // camera-facing basis so the contents always nestle at the near side
    state.camera.matrixWorld.extractBasis(camX.current, camY.current, camZ.current)

    const hovered = useTasteStore.getState().hoveredAssetId
    const isHovered = hovered === asset.id
    // Only dim siblings within the SAME lens as the hovered reference — hovering
    // a user tray tile must not shrink the tiles inside Nolan/Tarantino.
    const dimmed = hovered != null && !isHovered && getAsset(hovered).owner === asset.owner

    const lift = x2d + Math.sin(t * 0.5 + swayPhase) * containerRadius * 0.015
    const rise = y2d + Math.cos(t * 0.45 + bobPhase) * containerRadius * 0.015
    // push toward the camera so tiles sit in front of the glass surface; 1.16
    // keeps them readable (and clear of the silhouette under the nolan-lean
    // stretch) while still letting the glass edge refract their corners. The
    // per-tile depthOffset staggers them front-to-back so they float through
    // the bubble instead of sitting cramped on one plane.
    const depth =
      containerRadius * (1.16 + (isHovered ? 0.13 : 0)) +
      depthOffset +
      Math.sin(t * 0.4 + bobPhase) * containerRadius * 0.02

    out.current
      .set(0, 0, 0)
      .addScaledVector(camX.current, lift)
      .addScaledVector(camY.current, rise)
      .addScaledVector(camZ.current, depth)
    holder.current.position.copy(out.current)

    const targetScale = (isHovered ? 1.32 : dimmed ? 0.82 : 1) * tileScale
    const s = holder.current.scale.x
    const ns = s + (targetScale - s) * Math.min(1, dt * 8)
    holder.current.scale.setScalar(ns)
  })

  return (
    <group ref={holder}>
      <AssetVisual asset={asset} sizeW={unitW} sizeH={unitH} opacity={0.78 + emphasis * 0.22} />
    </group>
  )
}
