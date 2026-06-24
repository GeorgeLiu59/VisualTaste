import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import type { AssetType } from '../data/tasteData'

type V3 = [number, number, number]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const curveColorFor = (type: AssetType, palette: string[]): string => {
  if (type === 'text') return '#b9a8ff'
  if (type === 'palette') return palette[1] ?? '#ffd29a'
  return '#e6edf6'
}

function midpoint(a: V3, b: V3): V3 {
  const m: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  // bow the curve gently outward from the origin
  const len = Math.hypot(m[0], m[1], m[2]) || 1
  const bow = 0.35
  return [m[0] + (m[0] / len) * bow, m[1] + (m[1] / len) * bow + 0.12, m[2] + (m[2] / len) * bow]
}

export interface InfluenceCurveProps {
  start?: V3
  end?: V3
  /** Dynamic mode: return [start, end] each frame (local space). */
  compute?: () => [V3, V3]
  /** Dynamic strength: return 0..1 each frame (overrides `strength`) — lets a
   *  caller fade/retract the curve per-frame without React re-renders. */
  dynamicStrength?: () => number
  color: string
  strength: number
  hovered?: boolean
  flow?: number
}

export function InfluenceCurve({
  start = [0, 0, 0],
  end = [0, 0, 0],
  compute,
  dynamicStrength,
  color,
  strength,
  hovered = false,
  flow = 0.6,
}: InfluenceCurveProps) {
  const ref = useRef<any>(null)

  useFrame((_, dt) => {
    const line = ref.current
    if (!line) return
    if (compute) {
      const [s, e] = compute()
      line.setPoints(s, e, midpoint(s, e))
    }
    const str = dynamicStrength ? dynamicStrength() : strength
    const mat = line.material as THREE.Material & {
      dashOffset?: number
      linewidth?: number
      opacity: number
    }
    if (mat.dashOffset !== undefined) mat.dashOffset -= dt * flow
    const targetWidth = (0.7 + str * 1.5) * (hovered ? 2.1 : 1)
    if (mat.linewidth !== undefined) mat.linewidth += (targetWidth - mat.linewidth) * 0.1
    const targetOpacity = hovered ? 0.92 : (0.22 + str * 0.4) * clamp01(str * 4)
    mat.opacity += (targetOpacity - mat.opacity) * 0.12
  })

  return (
    <QuadraticBezierLine
      ref={ref}
      start={start}
      end={end}
      mid={midpoint(start, end)}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.4}
      dashed
      dashScale={6}
      gapSize={6}
      depthWrite={false}
      toneMapped={false}
    />
  )
}
