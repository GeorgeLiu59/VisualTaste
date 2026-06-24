import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Asset } from '../data/tasteData'
import { damp } from '../lib/taste'
import { AssetAttachment } from './AssetAttachment'

export interface ProfileAttachmentsProps {
  center: [number, number, number]
  assets: Asset[]
  palette: string[]
  /** Radius of the bubble the references are suspended inside. */
  containerRadius: number
  lambda?: number
  emphasis?: number
}

export function ProfileAttachments({
  center,
  assets,
  palette,
  containerRadius,
  lambda = 2.2,
  emphasis = 1,
}: ProfileAttachmentsProps) {
  const group = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    g.position.x = damp(g.position.x, center[0], lambda, dt)
    g.position.y = damp(g.position.y, center[1], lambda, dt)
    g.position.z = damp(g.position.z, center[2], lambda, dt)
  })
  return (
    <group ref={group} position={center}>
      {assets.map((a, i) => (
        <AssetAttachment
          key={a.id}
          asset={a}
          index={i}
          total={assets.length}
          palette={palette}
          containerRadius={containerRadius}
          emphasis={emphasis}
        />
      ))}
    </group>
  )
}
