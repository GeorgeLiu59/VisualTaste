import { useMemo } from 'react'
import type { Asset } from '../data/tasteData'
import { lerp } from '../lib/taste'
import { CurvedPanel } from './CurvedPanel'

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

const norm3 = (x: number, y: number, z: number): [number, number, number] => {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

/** Spherical-Fibonacci outward direction, equator-biased (off the poles). */
function fibDir(i: number, n: number): [number, number, number] {
  if (n === 1) return norm3(0.15, 0.1, 1)
  const y = (1 - (2 * (i + 0.5)) / n) * 0.62
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const phi = i * GOLDEN
  return norm3(Math.cos(phi) * r, y, Math.sin(phi) * r)
}

export interface ProfileAttachmentsProps {
  assets: Asset[]
  /** Owning lens accent (per-lens color). */
  accent: string
  /** Visual prominence (1 user, ~0.62/0.9 anchors). */
  emphasis?: number
}

/**
 * Lays a profile's references out as curved panels distributed over its glass
 * surface (spherical Fibonacci). Rendered as a CHILD of the lens `inner` group,
 * so the panels rotate + stretch with the glass — no manual position sync, no
 * camera-billboard swim. Fewer references → larger panels.
 */
export function ProfileAttachments({ assets, accent, emphasis = 1 }: ProfileAttachmentsProps) {
  const layout = useMemo(() => {
    const n = assets.length
    const arc = lerp(0.62, 0.34, (Math.min(n, 8) - 1) / 7)
    return assets.map((a, i) => ({ asset: a, dir: fibDir(i, n), arc }))
  }, [assets])

  return (
    <group>
      {layout.map(({ asset, dir, arc }) => (
        <CurvedPanel key={asset.id} asset={asset} dir={dir} arc={arc} accent={accent} emphasis={emphasis} />
      ))}
    </group>
  )
}
