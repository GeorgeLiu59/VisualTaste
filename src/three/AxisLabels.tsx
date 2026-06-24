import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { WORLD_SCALE, damp } from '../lib/taste'
import { useTasteStore } from '../store/tasteStore'
import { useUserMorphStore } from '../store/userMorphStore'

const R = WORLD_SCALE * 1.45

const labels: { text: string; pos: [number, number, number] }[] = [
  { text: 'natural', pos: [-R, 0, R * 0.2] },
  { text: 'stylized', pos: [R, 0, R * 0.2] },
  { text: 'intimate', pos: [0, -R * 0.8, 0] },
  { text: 'monumental', pos: [0, R * 0.95, 0] },
  { text: 'quiet', pos: [0, -R * 0.2, -R] },
  { text: 'electric', pos: [0, -R * 0.2, R] },
]

type TextLike = { fillOpacity: number }

export function AxisLabels({ opacity = 0.16 }: { opacity?: number }) {
  // refs to each drei <Text> so we can fade fillOpacity imperatively (no React
  // re-render): rest at `opacity`, but ghost UP during the absorb survey beat so
  // the taste-space reads as a meaningful coordinate system, then ease back as
  // the lens migrates.
  const refs = useRef<(TextLike | null)[]>([])
  const cur = useRef(opacity)

  useFrame((_, dt) => {
    const phase = useTasteStore.getState().absorbPhase
    const revealing = phase === 'hold'
    let target = opacity
    if (revealing) {
      target = 0.5
    } else if (phase === 'migrate') {
      // ease back down across the migration
      const e = useUserMorphStore.getState().e
      target = 0.5 + (opacity - 0.5) * e
    }
    cur.current = damp(cur.current, target, 3, dt)
    for (const t of refs.current) if (t) t.fillOpacity = cur.current
  })

  return (
    <group>
      {labels.map((l, i) => (
        <Text
          key={l.text}
          ref={(el) => {
            refs.current[i] = el as unknown as TextLike | null
          }}
          position={l.pos}
          fontSize={0.3}
          color="#8a93a3"
          anchorX="center"
          anchorY="middle"
          fillOpacity={opacity}
          letterSpacing={0.18}
          outlineWidth={0}
        >
          {l.text.toUpperCase()}
        </Text>
      ))}
    </group>
  )
}
