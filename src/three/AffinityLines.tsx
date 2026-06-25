import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import { nolanProfile, tarantinoProfile, type Asset } from '../data/tasteData'
import { clamp, distance3D } from '../lib/taste'

type V3 = [number, number, number]

const NOLAN_COLOR = '#8fbcf2'
const TARA_COLOR = '#ff9a63'

interface LineSpec {
  id: string
  end: V3
  mid: V3
  color: string
  /** 0..1 affinity — drives width/opacity. */
  strength: number
}

export interface AffinityLinesProps {
  /** User lens world position (the shared origin of every string). */
  userWorld: V3
  assets: Asset[]
  nolanWorld: V3
  tarantinoWorld: V3
}

/**
 * In compare mode each user reference radiates a thin, solid glowing string from
 * the user lens to the director (Nolan or Tarantino) it most resembles —
 * brighter/thicker the closer it sits to that director, fainter for a weak
 * match. Continuous (not dashed) so the relationship reads at a glance; bloom
 * gives the glow. Strings are gently fanned at the anchor end + bowed so several
 * toward the same director stay legible rather than stacking.
 */
export function AffinityLines({ userWorld, assets, nolanWorld, tarantinoWorld }: AffinityLinesProps) {
  const lines = useMemo<LineSpec[]>(() => {
    const out: LineSpec[] = []
    const nolanCount = assets.filter(
      (a) => distance3D(a.position, nolanProfile.position) <= distance3D(a.position, tarantinoProfile.position),
    ).length
    const counts: Record<'nolan' | 'tarantino', number> = {
      nolan: nolanCount,
      tarantino: assets.length - nolanCount,
    }
    const seen: Record<'nolan' | 'tarantino', number> = { nolan: 0, tarantino: 0 }

    for (const a of assets) {
      const dN = distance3D(a.position, nolanProfile.position)
      const dT = distance3D(a.position, tarantinoProfile.position)
      const target: 'nolan' | 'tarantino' = dN <= dT ? 'nolan' : 'tarantino'
      const d = Math.min(dN, dT)
      const strength = clamp(1 - d / 2.0)

      // fan endpoints around the anchor so co-targeted strings spread out
      const idx = seen[target]++
      const n = Math.max(counts[target], 1)
      const spread = (idx - (n - 1) / 2) * 0.55
      const base = target === 'nolan' ? nolanWorld : tarantinoWorld
      const end: V3 = [base[0] + spread, base[1] + spread * 0.4, base[2]]

      // gentle bow outward so the strings arc rather than cross in a hard X
      const mid: V3 = [
        (userWorld[0] + end[0]) / 2 + spread * 0.5,
        (userWorld[1] + end[1]) / 2 + 0.5,
        (userWorld[2] + end[2]) / 2,
      ]
      out.push({ id: a.id, end, mid, color: target === 'nolan' ? NOLAN_COLOR : TARA_COLOR, strength })
    }
    return out
  }, [assets, userWorld, nolanWorld, tarantinoWorld])

  return (
    <group>
      {lines.map((l) => (
        <AffinityString key={l.id} start={userWorld} end={l.end} mid={l.mid} color={l.color} strength={l.strength} />
      ))}
    </group>
  )
}

type LineMat = THREE.Material & { linewidth?: number; opacity: number; blending: THREE.Blending; needsUpdate: boolean }

/**
 * One ethereal string: a hair-thin bright core + a soft wide faint halo, both
 * additively blended so they read as glowing light rather than drawn ink, with
 * a slow shimmer so they breathe. Bloom carries the radiance.
 */
function AffinityString({ start, end, mid, color, strength }: { start: V3; end: V3; mid: V3; color: string; strength: number }) {
  const core = useRef<any>(null)
  const halo = useRef<any>(null)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  const setup = useRef(false)

  useFrame((state) => {
    const c = core.current
    const h = halo.current
    if (!c || !h) return
    const cm = c.material as LineMat
    const hm = h.material as LineMat
    // additive once so overlapping strings glow brighter (light, not paint)
    if (!setup.current) {
      cm.blending = THREE.AdditiveBlending
      hm.blending = THREE.AdditiveBlending
      cm.needsUpdate = true
      hm.needsUpdate = true
      setup.current = true
    }
    // a slow breath so the strings feel alive (radiating), not static
    const shimmer = 0.8 + 0.2 * Math.sin(state.clock.elapsedTime * 1.3 + phase)
    if (cm.linewidth !== undefined) cm.linewidth = 0.5 + strength * 0.8
    if (hm.linewidth !== undefined) hm.linewidth = 2.2 + strength * 3.4
    cm.opacity = (0.16 + strength * 0.5) * shimmer
    hm.opacity = (0.04 + strength * 0.12) * shimmer
  })

  return (
    <group>
      {/* soft wide halo */}
      <QuadraticBezierLine
        ref={halo}
        start={start}
        end={end}
        mid={mid}
        color={color}
        lineWidth={3}
        transparent
        opacity={0.08}
        depthWrite={false}
        toneMapped={false}
      />
      {/* hair-thin bright core */}
      <QuadraticBezierLine
        ref={core}
        start={start}
        end={end}
        mid={mid}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.4}
        depthWrite={false}
        toneMapped={false}
      />
    </group>
  )
}
