import { useEffect, useRef, useState } from 'react'
import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Asset } from '../data/tasteData'
import { softDot } from './softDot'

export interface AssetVisualProps {
  asset: Asset
  sizeW: number
  sizeH: number
  opacity?: number
}

/**
 * Full image tile (no cropping). Loads the texture imperatively and CONTAINS it
 * within the allotted box at the image's own aspect ratio — so the whole image
 * is visible rather than cover-cropped. Drawn through a plain meshBasicMaterial
 * (toneMapped off) so it shows at true, full brightness — the original image.
 */
function ImageTile({ src, boxW, boxH, opacity }: { src: string; boxW: number; boxH: number; opacity: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const sheen = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    let active = true
    new THREE.TextureLoader().load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.generateMipmaps = true
      if (active) setTex(t)
      else t.dispose()
    })
    return () => {
      active = false
    }
  }, [src])

  // contain-fit: preserve the image aspect, fit inside the box (letterboxed)
  let w = boxW
  let h = boxH
  const img = tex?.image as { width: number; height: number } | undefined
  if (img && img.width && img.height) {
    const a = img.width / img.height
    const boxA = boxW / boxH
    if (a > boxA) {
      w = boxW
      h = boxW / a
    } else {
      h = boxH
      w = boxH * a
    }
  }

  // Soft specular "glass sheen" that slides across the tile as the camera
  // orbits — the cue that the image sits under a curved glass surface. Purely
  // additive (only brightens), so the image never darkens or blurs.
  useFrame((state) => {
    const m = sheen.current
    if (!m) return
    const cam = state.camera.position
    const ang = Math.atan2(cam.x, cam.z)
    const t = state.clock.elapsedTime
    m.position.x = Math.sin(ang) * w * 0.18
    m.position.y = h * 0.2 + Math.sin(t * 0.25) * h * 0.04
  })

  return (
    <group>
      {/* dark backing sized to the fitted image (small frame) */}
      <mesh position={[0, 0, -0.02]} renderOrder={10}>
        <planeGeometry args={[w + 0.07, h + 0.07]} />
        <meshBasicMaterial color="#05070b" transparent opacity={0.6 * opacity} toneMapped={false} depthTest={false} />
      </mesh>
      {/* the image only renders once the texture is loaded, so the material is
          compiled WITH its map (avoids the all-white meshBasicMaterial bug) */}
      {tex && (
        <>
          <mesh renderOrder={11}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={tex} transparent opacity={opacity} toneMapped={false} depthTest={false} />
          </mesh>
          {/* glass sheen — soft elliptical highlight drifting across the surface */}
          <mesh ref={sheen} renderOrder={12} scale={[w * 0.85, h * 0.5, 1]} position={[0, h * 0.2, 0.012]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={softDot}
              color="#e6f0ff"
              transparent
              opacity={0.14 * opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Camera-facing visual for an asset: image tile, text chip, or palette swatch. */
export function AssetVisual({ asset, sizeW, sizeH, opacity = 1 }: AssetVisualProps) {
  return (
    <Billboard renderOrder={10}>
      {asset.type === 'image' && asset.src && (
        <ImageTile src={asset.src} boxW={sizeW} boxH={sizeH} opacity={opacity} />
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
