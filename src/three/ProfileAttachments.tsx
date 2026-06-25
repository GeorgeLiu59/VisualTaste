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
    // disc radius fraction of the bubble — pushed out so references spread
    // across the (larger) bubble instead of crowding the center.
    const discR = radius * 0.66
    const x = Math.cos(ang) * rNorm * discR
    const y = Math.sin(ang) * rNorm * discR
    return { x, y, bob: index * 1.7, sway: index * 0.9 }
  }, [index, total, radius])

  const [unitW, unitH] = assetSize(asset)
  // tile world size: a touch smaller relative to the bubble so the wider spread
  // reads as breathing room rather than overlap; shrinks further as the cluster
  // grows. (Absolute size stays generous because the bubbles are now larger.)
  const tileScale = radius * (0.56 - Math.min(total, 6) * 0.03)

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

    // Gentle float so the cluster feels alive rather than pinned in place —
    // small amplitude + per-tile phase so they drift independently.
    const amp = radius * 0.05
    const lift = layout.x + Math.sin(t * 0.55 + layout.sway) * amp
    const rise = layout.y + Math.cos(t * 0.43 + layout.bob) * amp
    // Keep tiles near the lens CENTER — that's where the DepthOfField focus
    // plane sits, so they stay crisp (out-of-focus tiles read as dim/muddy). The
    // glass body + glow are already dialed clear, so there's no bright center to
    // avoid. Hovered tiles ease slightly forward to lift above the cluster; a
    // slow in/out bob keeps the depth from feeling frozen.
    const depth = (isHovered ? 0.35 : 0.06) * radius + Math.sin(t * 0.35 + layout.bob) * radius * 0.03

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
