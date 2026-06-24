import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Asset } from '../data/tasteData'
import { damp } from '../lib/taste'
import { useUserMorphStore } from '../store/userMorphStore'
import { AssetAttachment } from './AssetAttachment'

export interface ProfileAttachmentsProps {
  center: [number, number, number]
  assets: Asset[]
  palette: string[]
  /** Radius of the bubble the references are suspended inside. */
  containerRadius: number
  lambda?: number
  emphasis?: number
  /** User instance: follow the eased morph position so tiles track the lens body. */
  isUser?: boolean
}

export function ProfileAttachments({
  center,
  assets,
  palette,
  containerRadius,
  lambda = 2.2,
  emphasis = 1,
  isUser = false,
}: ProfileAttachmentsProps) {
  const group = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    // During an absorb morph the user cluster snaps to the same eased world
    // position the lens body uses, so references never lag behind the glass.
    const morph = isUser ? useUserMorphStore.getState() : null
    if (morph?.active) {
      // viscous haul: the tile cluster TRAILS the body (which sits exactly on
      // morph.pos) at a lower lambda, so tiles lag behind the leading edge
      // mid-flight and catch up as the body eases into settle.
      g.position.x = damp(g.position.x, morph.pos[0], 3.8, dt)
      g.position.y = damp(g.position.y, morph.pos[1], 3.8, dt)
      g.position.z = damp(g.position.z, morph.pos[2], 3.8, dt)
      return
    }
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
