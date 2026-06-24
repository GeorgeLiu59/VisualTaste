import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import type { Asset } from '../data/tasteData'
import { damp } from '../lib/taste'
import { AssetVisual, assetSize } from './AssetVisual'
import { InfluenceCurve, curveColorFor } from './InfluenceCurve'

type V3 = [number, number, number]
const ORIGIN: V3 = [0, 0, 0]

export interface UnfoldViewProps {
  center: [number, number, number]
  assets: Asset[]
  palette: string[]
  active: boolean
}

export function UnfoldView({ center, assets, palette, active }: UnfoldViewProps) {
  const group = useRef<THREE.Group>(null!)
  const inner = useRef<THREE.Group>(null!)
  const open = useRef(0)

  // place strongest assets closest to center
  const placed = useMemo(() => {
    const sorted = assets
      .map((a, i) => ({ a, i }))
      .sort((x, y) => y.a.strength - x.a.strength)
    const total = sorted.length
    return sorted.map(({ a }, rank) => {
      const angle = (rank / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2
      const radius = 2.0 + (1 - a.strength) * 0.9
      const pos: V3 = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.35]
      return { asset: a, pos }
    })
  }, [assets])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    g.position.x = damp(g.position.x, center[0], 2.4, dt)
    g.position.y = damp(g.position.y, center[1], 2.4, dt)
    g.position.z = damp(g.position.z, center[2], 2.4, dt)

    open.current = damp(open.current, active ? 1 : 0, active ? 3 : 4, dt)
    g.visible = open.current > 0.01
    if (inner.current) {
      inner.current.scale.setScalar(0.001 + open.current)
      inner.current.rotation.z = (1 - open.current) * 0.4
    }
  })

  const ringPalette = palette.slice(0, 3)

  return (
    <group ref={group} visible={false}>
      <group ref={inner}>
        {/* flattened glass disc */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.45, 1.45, 0.16, 96]} />
          <MeshTransmissionMaterial
            samples={4}
            resolution={256}
            thickness={0.6}
            roughness={0.2}
            chromaticAberration={0.06}
            distortion={0.2}
            distortionScale={0.3}
            temporalDistortion={0.1}
            ior={1.2}
            transmission={1}
            color={palette[4] ?? '#e7ecf3'}
            attenuationColor={palette[1] ?? '#6d7882'}
            attenuationDistance={1.2}
            transparent
          />
        </mesh>

        {/* soft halo behind the disc */}
        <mesh position={[0, 0, -0.2]}>
          <circleGeometry args={[2.6, 64]} />
          <meshBasicMaterial
            color={palette[2] ?? '#9aa6b3'}
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* translucent palette rings */}
        {ringPalette.map((c, i) => (
          <mesh key={c + i} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.72 + i * 0.3, 0.02, 16, 160]} />
            <meshBasicMaterial
              color={c}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* fanned assets + contribution curves */}
        {placed.map(({ asset, pos }) => {
          const [w, h] = assetSize(asset)
          const sc = 0.85 + asset.strength * 0.5
          return (
            <group key={asset.id}>
              <group position={pos} scale={sc}>
                <AssetVisual asset={asset} sizeW={w} sizeH={h} />
              </group>
              <InfluenceCurve
                start={pos}
                end={ORIGIN}
                color={curveColorFor(asset.type, asset.palette.length ? asset.palette : palette)}
                strength={asset.strength}
              />
            </group>
          )
        })}
      </group>
    </group>
  )
}
