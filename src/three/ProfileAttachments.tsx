import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Asset } from '../data/tasteData'
import { getAsset } from '../data/tasteData'
import { damp } from '../lib/taste'
import { useTasteStore } from '../store/tasteStore'
import { useUserMorphStore } from '../store/userMorphStore'
import { AssetVisual, assetSize } from './AssetVisual'

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

export interface ProfileAttachmentsProps {
  /** Lens center in world space. */
  center: [number, number, number]
  /** Lens world radius (so the cluster stays inside the silhouette). */
  radius: number
  assets: Asset[]
  /** Visual prominence (1 user, ~0.62/0.9 anchors). */
  emphasis?: number
  /** User instance follows the eased morph position during the absorb beat. */
  isUser?: boolean
}

/**
 * Reference tiles as a camera-facing cluster CONTAINED within the bubble. Tiles
 * always face the viewer (readable from any orbit angle) but sit on a disc
 * centered on the lens — NOT pushed toward the camera — so their on-screen
 * footprint stays inside the bubble silhouette and they never poke out. Tiles
 * render with depthTest off so the glass can't occlude them.
 *
 * The cluster group damps to the lens center each frame (or, for the user lens
 * during an absorb morph, sits on the eased morph position so body + tiles +
 * camera stay locked). Tracking lives here in the main component — no child ref
 * threading — so the group ref is used directly.
 */
export function ProfileAttachments({ center, radius, assets, emphasis = 1, isUser = false }: ProfileAttachmentsProps) {
  const group = useRef<THREE.Group>(null!)

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const morph = isUser ? useUserMorphStore.getState() : null
    if (morph?.active) {
      g.position.set(morph.pos[0], morph.pos[1], morph.pos[2])
      return
    }
    g.position.x = damp(g.position.x, center[0], 2.2, dt)
    g.position.y = damp(g.position.y, center[1], 2.2, dt)
    g.position.z = damp(g.position.z, center[2], 2.2, dt)
  })

  return (
    <group ref={group}>
      {assets.map((a, i) => (
        <Tile
          key={a.id}
          asset={a}
          index={i}
          total={assets.length}
          radius={radius}
          emphasis={emphasis}
        />
      ))}
    </group>
  )
}

/**
 * One billboarded tile placed on a camera-facing phyllotaxis disc centered on
 * the lens. Scaled so the disc + tile fit inside the bubble silhouette.
 */
function Tile({
  asset,
  index,
  total,
  radius,
  emphasis,
}: {
  asset: Asset
  index: number
  total: number
  radius: number
  emphasis: number
}) {
  const holder = useRef<THREE.Group>(null!)

  const layout = useMemo(() => {
    const n = Math.max(total, 1)
    const rNorm = n === 1 ? 0 : Math.sqrt((index + 0.5) / n)
    const ang = index * GOLDEN
    // disc radius fraction of the bubble — kept inside the silhouette
    const discR = radius * 0.58
    const x = Math.cos(ang) * rNorm * discR
    const y = Math.sin(ang) * rNorm * discR
    return { x, y, bob: index * 1.7, sway: index * 0.9 }
  }, [index, total, radius])

  const [unitW, unitH] = assetSize(asset)
  // tile world size: bigger now that the glass is clearer; shrink as the cluster
  // grows so they don't overlap or spill the silhouette.
  const tileScale = radius * (0.62 - Math.min(total, 6) * 0.03)

  const camX = useRef(new THREE.Vector3())
  const camY = useRef(new THREE.Vector3())
  const camZ = useRef(new THREE.Vector3())
  const out = useRef(new THREE.Vector3())

  useFrame((state, dt) => {
    const h = holder.current
    if (!h) return
    const t = state.clock.elapsedTime
    state.camera.matrixWorld.extractBasis(camX.current, camY.current, camZ.current)

    const hovered = useTasteStore.getState().hoveredAssetId
    const isHovered = hovered === asset.id
    const dimmed = hovered != null && !isHovered && getAsset(hovered).owner === asset.owner

    const lift = layout.x + Math.sin(t * 0.5 + layout.sway) * radius * 0.012
    const rise = layout.y + Math.cos(t * 0.45 + layout.bob) * radius * 0.012
    // push tiles toward the camera, in FRONT of the bright glass core, so they
    // read against the clearer near-surface rather than the luminous center.
    // Hovered tiles ease further forward to sit on top of the cluster.
    const depth = (isHovered ? 0.78 : 0.42) * radius

    out.current
      .set(0, 0, 0)
      .addScaledVector(camX.current, lift)
      .addScaledVector(camY.current, rise)
      .addScaledVector(camZ.current, depth)
    h.position.copy(out.current)

    const target = (isHovered ? 1.34 : dimmed ? 0.8 : 1) * tileScale
    h.scale.setScalar(h.scale.x + (target - h.scale.x) * Math.min(1, dt * 8))
  })

  return (
    <group ref={holder}>
      <AssetVisual asset={asset} sizeW={unitW} sizeH={unitH} opacity={0.78 + emphasis * 0.22} />
    </group>
  )
}
