import { useMemo } from 'react'
import { nolanProfile, tarantinoProfile, type Asset } from '../data/tasteData'
import { clamp, distance3D } from '../lib/taste'
import { InfluenceCurve } from './InfluenceCurve'

type V3 = [number, number, number]

const NOLAN_COLOR = '#7fb0ec'
const TARA_COLOR = '#ff8a52'

interface Line {
  id: string
  /** end point world coords (the matching anchor, slightly fanned). */
  end: V3
  color: string
  /** 0..1 affinity — drives width/opacity/flow. */
  strength: number
}

export interface AffinityLinesProps {
  /** User lens world position (the shared origin of every line). */
  userWorld: V3
  assets: Asset[]
  nolanWorld: V3
  tarantinoWorld: V3
}

/**
 * In compare mode, each user reference draws a soft filament from the user lens
 * toward the director (Nolan or Tarantino) it most resembles — brighter and
 * faster-flowing the closer it sits to that director, fainter when it's a weak
 * match. Reads as "these parts of you lean cool / these lean warm" without the
 * old bubble-touching overlap aura. Lines are gently fanned at the anchor end so
 * several toward the same director stay legible rather than stacking.
 */
export function AffinityLines({ userWorld, assets, nolanWorld, tarantinoWorld }: AffinityLinesProps) {
  const lines = useMemo<Line[]>(() => {
    // group by target so we can fan multiple lines to the same director
    const out: Line[] = []
    const perTarget: Record<'nolan' | 'tarantino', number> = { nolan: 0, tarantino: 0 }
    const counts: Record<'nolan' | 'tarantino', number> = {
      nolan: assets.filter((a) => distance3D(a.position, nolanProfile.position) <= distance3D(a.position, tarantinoProfile.position)).length,
      tarantino: 0,
    }
    counts.tarantino = assets.length - counts.nolan

    for (const a of assets) {
      const dN = distance3D(a.position, nolanProfile.position)
      const dT = distance3D(a.position, tarantinoProfile.position)
      const target: 'nolan' | 'tarantino' = dN <= dT ? 'nolan' : 'tarantino'
      const d = Math.min(dN, dT)
      // closeness: ~0 at the anchor, fading out by ~2 taste-units away
      const strength = clamp(1 - d / 2.0)

      // fan the endpoint a little around the anchor so co-targeted lines spread
      const idx = perTarget[target]++
      const n = Math.max(counts[target], 1)
      const spread = (idx - (n - 1) / 2) * 0.5
      const base = target === 'nolan' ? nolanWorld : tarantinoWorld
      const end: V3 = [base[0] + spread, base[1] + spread * 0.4, base[2]]

      out.push({ id: a.id, end, color: target === 'nolan' ? NOLAN_COLOR : TARA_COLOR, strength })
    }
    return out
  }, [assets, nolanWorld, tarantinoWorld])

  // launch each line from just inside the user bubble toward its anchor so they
  // don't all emanate from the exact same point
  const start = useMemo<V3>(() => [userWorld[0], userWorld[1], userWorld[2]], [userWorld])

  return (
    <group>
      {lines.map((l) => (
        <InfluenceCurve
          key={l.id}
          start={start}
          end={l.end}
          color={l.color}
          strength={l.strength}
          flow={0.3 + l.strength * 1.1}
        />
      ))}
    </group>
  )
}
