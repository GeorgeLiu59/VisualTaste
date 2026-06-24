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
      // include the body lean so the tile cluster tips with the glass
      const ln = morph.lean
      g.position.set(morph.pos[0] + ln[0], morph.pos[1] + ln[1], morph.pos[2] + ln[2])
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
          isUser={isUser}
        />
      ))}
    </group>
  )
}
