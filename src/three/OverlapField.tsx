import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../lib/taste'

export interface OverlapFieldProps {
  userCenter: [number, number, number]
  anchorCenter: [number, number, number]
  color: string
  active: boolean
  similarity: number
}

export function OverlapField({ userCenter, anchorCenter, color, active, similarity }: OverlapFieldProps) {
  const group = useRef<THREE.Group>(null!)
  const inner = useRef<THREE.Mesh>(null!)
  const outer = useRef<THREE.Mesh>(null!)
  const innerMat = useRef<THREE.MeshBasicMaterial>(null!)
  const outerMat = useRef<THREE.MeshBasicMaterial>(null!)
  const shown = useRef(0)
  const colorTarget = useMemo(() => new THREE.Color(color), [])

  useFrame((state, dt) => {
    colorTarget.set(color)
    const t = active ? Math.min(1, similarity / 100 + 0.15) : 0
    shown.current = damp(shown.current, t, 3, dt)

    const g = group.current
    if (g) {
      const mx = (userCenter[0] + anchorCenter[0]) / 2
      const my = (userCenter[1] + anchorCenter[1]) / 2
      const mz = (userCenter[2] + anchorCenter[2]) / 2
      g.position.x = damp(g.position.x, mx, 2.4, dt)
      g.position.y = damp(g.position.y, my, 2.4, dt)
      g.position.z = damp(g.position.z, mz, 2.4, dt)
      g.visible = shown.current > 0.01
    }
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.1) * 0.05
    const base = (1.1 + shown.current * 1.6) * pulse
    if (inner.current) inner.current.scale.setScalar(base)
    if (outer.current) outer.current.scale.setScalar(base * 1.9)
    if (innerMat.current) {
      innerMat.current.color.lerp(colorTarget, 0.1)
      innerMat.current.opacity = shown.current * 0.28
    }
    if (outerMat.current) {
      outerMat.current.color.lerp(colorTarget, 0.1)
      outerMat.current.opacity = shown.current * 0.1
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={inner}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          ref={innerMat}
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={outer}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          ref={outerMat}
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
