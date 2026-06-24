import { useMemo } from 'react'
import {
  getAsset,
  nolanProfile,
  tarantinoProfile,
  type Asset,
} from '../data/tasteData'
import {
  clamp,
  computeSimilarity,
  deriveUserProfile,
  distance3D,
  toWorld,
} from '../lib/taste'
import { useTasteStore } from '../store/tasteStore'
import { useUserMorphStore } from '../store/userMorphStore'
import { InfluenceCurve, curveColorFor } from './InfluenceCurve'
import { OverlapField } from './OverlapField'

type V3 = [number, number, number]

const NOLAN_COLOR = '#6f9fd6'
const TARA_COLOR = '#f0703a'

interface Thread {
  end: V3
  color: string
  strength: number
}

/**
 * The "comparison across the whole taste-space" reveal, shown during the absorb
 * survey beat. A fan of affinity threads springs from the pending reference (at
 * its true taste-space coordinate) to the two anchors and the two nearest
 * existing references, brightness/width keyed to similarity. Both anchor
 * overlap halos swell by similarity (the one it resembles most blooms). As the
 * lens commits + migrates, the threads retract toward the migrating lens and
 * fade out. Everything unmounts when no absorb is pending, so it costs nothing
 * when idle.
 *
 * Anchors don't move during an absorb (compare mode isn't active), so anchor
 * world positions are derived internally and the precompute keys only on the
 * pending asset.
 */
export function ConstellationReveal() {
  const pendingAssetId = useTasteStore((s) => s.pendingAssetId)

  const data = useMemo(() => {
    if (!pendingAssetId) return null
    const pending = getAsset(pendingAssetId)
    const pendingW = toWorld(pending.position)
    const nolanW = toWorld(nolanProfile.position)
    const taraW = toWorld(tarantinoProfile.position)

    // single-asset profile → reuse the real similarity metric
    const solo = deriveUserProfile([pendingAssetId])
    const simNolan = computeSimilarity(solo, nolanProfile)
    const simTara = computeSimilarity(solo, tarantinoProfile)

    // nearest existing active references (exclude the pending id itself)
    const active = useTasteStore.getState().activeAssetIds.filter((id) => id !== pendingAssetId)
    const nearest = active
      .map((id) => getAsset(id))
      .map((a: Asset) => ({ a, d: distance3D(pending.position, a.position) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 2)

    const threads: Thread[] = [
      { end: nolanW, color: NOLAN_COLOR, strength: simNolan / 100 },
      { end: taraW, color: TARA_COLOR, strength: simTara / 100 },
      ...nearest.map(({ a, d }) => ({
        end: toWorld(a.position),
        color: curveColorFor(a.type, a.palette.length ? a.palette : solo.palette),
        strength: clamp(1 - d / 2.2),
      })),
    ]
    return { pendingW, nolanW, taraW, simNolan, simTara, threads }
  }, [pendingAssetId])

  if (!data) return null

  return (
    <group>
      {/* affinity threads springing from the pending reference */}
      {data.threads.map((t, i) => (
        <InfluenceCurve
          key={i}
          start={data.pendingW}
          end={t.end}
          color={t.color}
          strength={t.strength}
          flow={0.4 + t.strength * 1.2}
          compute={() => {
            // during migrate, reel the far endpoint in toward the migrating lens
            const m = useUserMorphStore.getState()
            const phase = useTasteStore.getState().absorbPhase
            if (phase === 'migrate' && m.active) {
              const e = m.e
              const end: V3 = [
                t.end[0] + (m.pos[0] - t.end[0]) * e,
                t.end[1] + (m.pos[1] - t.end[1]) * e,
                t.end[2] + (m.pos[2] - t.end[2]) * e,
              ]
              return [data.pendingW, end]
            }
            return [data.pendingW, t.end]
          }}
          dynamicStrength={() => {
            const phase = useTasteStore.getState().absorbPhase
            if (phase === 'hold') return t.strength
            // migrate: fade out on the eased morph clock
            const m = useUserMorphStore.getState()
            return t.strength * (1 - (m.active ? m.e : 1))
          }}
        />
      ))}

      {/* both anchor overlap halos — the one it resembles most swells.
          active only during the held survey beat. */}
      <SurveyHalo
        userCenter={data.pendingW}
        anchorCenter={data.taraW}
        color={TARA_COLOR}
        similarity={data.simTara}
      />
      <SurveyHalo
        userCenter={data.pendingW}
        anchorCenter={data.nolanW}
        color={NOLAN_COLOR}
        similarity={data.simNolan}
      />
    </group>
  )
}

/** OverlapField wrapper that is active only during the held beat. */
function SurveyHalo(props: { userCenter: V3; anchorCenter: V3; color: string; similarity: number }) {
  const active = useTasteStore((s) => s.absorbPhase === 'hold')
  return <OverlapField {...props} active={active} />
}
