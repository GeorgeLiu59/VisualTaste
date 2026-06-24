import { Text } from '@react-three/drei'
import { WORLD_SCALE } from '../lib/taste'

const R = WORLD_SCALE * 1.45

const labels: { text: string; pos: [number, number, number] }[] = [
  { text: 'natural', pos: [-R, 0, R * 0.2] },
  { text: 'stylized', pos: [R, 0, R * 0.2] },
  { text: 'intimate', pos: [0, -R * 0.8, 0] },
  { text: 'monumental', pos: [0, R * 0.95, 0] },
  { text: 'quiet', pos: [0, -R * 0.2, -R] },
  { text: 'electric', pos: [0, -R * 0.2, R] },
]

export function AxisLabels({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <group>
      {labels.map((l) => (
        <Text
          key={l.text}
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
