import { Billboard, Image, Text } from '@react-three/drei'
import type { Asset } from '../data/tasteData'

export interface AssetVisualProps {
  asset: Asset
  sizeW: number
  sizeH: number
  opacity?: number
}

/** Camera-facing visual for an asset: image tile, text chip, or palette swatch. */
export function AssetVisual({ asset, sizeW, sizeH, opacity = 1 }: AssetVisualProps) {
  return (
    <Billboard renderOrder={10}>
      {asset.type === 'image' && asset.src && (
        <>
          <mesh position={[0, 0, -0.02]} renderOrder={10}>
            <planeGeometry args={[sizeW + 0.1, sizeH + 0.1]} />
            <meshBasicMaterial
              color="#05070b"
              transparent
              opacity={0.65 * opacity}
              toneMapped={false}
              depthTest={false}
            />
          </mesh>
          <Image
            url={asset.src}
            scale={[sizeW, sizeH] as unknown as number}
            radius={0.1}
            transparent
            opacity={opacity}
            toneMapped={false}
            renderOrder={11}
            material-depthTest={false}
          />
        </>
      )}

      {asset.type === 'text' && (
        <>
          <mesh renderOrder={10}>
            <planeGeometry args={[sizeW, sizeH]} />
            <meshBasicMaterial
              color="#171425"
              transparent
              opacity={0.72 * opacity}
              toneMapped={false}
              depthTest={false}
            />
          </mesh>
          <Text
            fontSize={0.15}
            maxWidth={sizeW - 0.2}
            anchorX="center"
            anchorY="middle"
            color="#d9d2ff"
            fillOpacity={opacity}
            outlineWidth={0}
            textAlign="center"
            renderOrder={11}
            material-depthTest={false}
          >
            {asset.label}
          </Text>
        </>
      )}

      {asset.type === 'palette' && (
        <group>
          <mesh position={[0, 0, -0.01]} renderOrder={10}>
            <planeGeometry args={[sizeW + 0.06, sizeH + 0.06]} />
            <meshBasicMaterial
              color="#0a0c10"
              transparent
              opacity={0.68 * opacity}
              toneMapped={false}
              depthTest={false}
            />
          </mesh>
          {asset.palette.slice(0, 5).map((c, i) => {
            const n = Math.min(asset.palette.length, 5)
            const w = sizeW / n
            const x = -sizeW / 2 + w / 2 + i * w
            return (
              <mesh key={c + i} position={[x, 0, 0]} renderOrder={11}>
                <planeGeometry args={[w * 0.92, sizeH * 0.8]} />
                <meshBasicMaterial color={c} transparent opacity={opacity} toneMapped={false} depthTest={false} />
              </mesh>
            )
          })}
        </group>
      )}
    </Billboard>
  )
}

export function assetSize(asset: Asset): [number, number] {
  const w = asset.type === 'image' ? 1.05 + asset.strength * 0.55 : asset.type === 'text' ? 1.5 : 1.3
  const h = asset.type === 'image' ? w * 0.64 : 0.42
  return [w, h]
}
