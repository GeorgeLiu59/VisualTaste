import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { getAsset, type Asset } from '../data/tasteData'
import { clamp } from '../lib/taste'
import { useTasteStore } from '../store/tasteStore'

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

// ---------------------------------------------------------------------------
// Curved panel geometry — a small rectangular patch of a sphere of radius R,
// centred on local +Z, with LINEAR uvs so a texture maps undistorted. `arc` is
// the vertical angular height; `aspect` = w/h widens it horizontally.
// ---------------------------------------------------------------------------
const geoCache = new Map<string, THREE.BufferGeometry>()
export function makeCurvedPanel(R: number, aspect: number, arc: number, seg = 12): THREE.BufferGeometry {
  const key = `${R.toFixed(3)}|${aspect.toFixed(2)}|${arc.toFixed(3)}|${seg}`
  const cached = geoCache.get(key)
  if (cached) return cached
  const aV = arc
  const aU = arc * aspect
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const d = new THREE.Vector3()
  for (let j = 0; j <= seg; j++) {
    const v = j / seg
    const ay = (v - 0.5) * aV
    for (let i = 0; i <= seg; i++) {
      const u = i / seg
      const ax = (u - 0.5) * aU
      d.set(0, 0, 1).applyAxisAngle(X_AXIS, ay).applyAxisAngle(Y_AXIS, ax)
      pos.push(d.x * R, d.y * R, d.z * R)
      nor.push(d.x, d.y, d.z)
      uv.push(u, 1 - v)
    }
  }
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i
      const b = a + 1
      const c = a + seg + 1
      const e = c + 1
      idx.push(a, c, b, b, c, e)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return (geoCache.set(key, g), g)
}

/** Orientation that points local +Z along `dir`, with up kept toward world-up. */
function orientTo(dir: THREE.Vector3): THREE.Quaternion {
  const q = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, dir)
  const tangentUp = Y_AXIS.clone().sub(dir.clone().multiplyScalar(Y_AXIS.dot(dir)))
  if (tangentUp.lengthSq() > 1e-5) {
    tangentUp.normalize()
    const curUp = Y_AXIS.clone().applyQuaternion(q)
    q.premultiply(new THREE.Quaternion().setFromUnitVectors(curUp, tangentUp))
  }
  return q
}

// ---------------------------------------------------------------------------
// Shared async texture cache (no Suspense — dark backing shows first, image
// fades in; dedupes across the 3 compare lenses that share a src).
// ---------------------------------------------------------------------------
const texCache = new Map<string, THREE.Texture>()
function useCachedTexture(src: string | undefined, maxAniso: number): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(() => (src ? texCache.get(src) ?? null : null))
  useEffect(() => {
    if (!src) return
    const have = texCache.get(src)
    if (have) {
      setTex(have)
      return
    }
    let alive = true
    new THREE.TextureLoader().load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = maxAniso
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.generateMipmaps = true
      texCache.set(src, t)
      if (alive) setTex(t)
    })
    return () => {
      alive = false
    }
  }, [src, maxAniso])
  return tex
}

const R_FACE = 1.05
const R_BACK = 1.035
const R_MAT = 1.03

export interface CurvedPanelProps {
  asset: Asset
  /** Outward unit direction on the sphere (local to the lens inner group). */
  dir: [number, number, number]
  /** Vertical angular height of the panel. */
  arc: number
  /** Per-lens accent (the owning lens's color). */
  accent: string
  /** Visual prominence (1 user, ~0.62/0.9 anchors). */
  emphasis?: number
}

/**
 * One reference rendered as a curved panel conforming to the glass surface,
 * parented inside the lens `inner` group so it rotates/stretches WITH the glass
 * (no camera-billboard swim, no silhouette clip, no zoom-occlusion). The near
 * hemisphere reads crisp; panels fade out + cull as they rotate to the back.
 */
export function CurvedPanel({ asset, dir, arc, accent, emphasis = 1 }: CurvedPanelProps) {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const root = useRef<THREE.Group>(null!)
  const content = useRef<THREE.Group>(null!)
  const tex = useCachedTexture(asset.type === 'image' ? asset.src : undefined, maxAniso)

  const dirV = useMemo(() => new THREE.Vector3(dir[0], dir[1], dir[2]).normalize(), [dir])
  const quat = useMemo(() => orientTo(dirV), [dirV])

  // aspect per type (clamp text so it isn't absurdly wide)
  const aspect = asset.type === 'image' ? 1.55 : asset.type === 'text' ? 2.4 : 2.8
  const faceGeo = useMemo(() => makeCurvedPanel(R_FACE, aspect, arc), [aspect, arc])
  const backGeo = useMemo(() => makeCurvedPanel(R_BACK, aspect * 1.04, arc * 1.06), [aspect, arc])
  const matGeo = useMemo(() => makeCurvedPanel(R_MAT, aspect * 1.12, arc * 1.16), [aspect, arc])

  // material refs we fade per-frame
  const backMat = useRef<THREE.MeshBasicMaterial>(null!)
  const faceMat = useRef<THREE.MeshBasicMaterial>(null!)
  const matMat = useRef<THREE.MeshBasicMaterial>(null!)
  const textRef = useRef<{ fillOpacity: number } | null>(null)
  const swatchMats = useRef<THREE.MeshBasicMaterial[]>([])

  const faceFade = useRef(0) // eased image fade-in
  const worldNormal = useRef(new THREE.Vector3())
  const panelPos = useRef(new THREE.Vector3())
  const viewDir = useRef(new THREE.Vector3())
  const tmpQuat = useRef(new THREE.Quaternion())
  const tmpScale = useRef(new THREE.Vector3())
  const tmpPos = useRef(new THREE.Vector3())

  useFrame((state, dt) => {
    const g = root.current
    if (!g || !g.parent) return

    // WORLD transform of the lens `inner` group (our parent) — for facing/cull
    g.parent.matrixWorld.decompose(tmpPos.current, tmpQuat.current, tmpScale.current)

    // facing: outward normal (dir rotated into world) vs the view direction
    worldNormal.current.copy(dirV).applyQuaternion(tmpQuat.current).normalize()
    panelPos.current.copy(worldNormal.current).multiplyScalar(R_FACE * tmpScale.current.x).add(tmpPos.current)
    viewDir.current.copy(state.camera.position).sub(panelPos.current).normalize()
    const facing = worldNormal.current.dot(viewDir.current)
    // smoothstep(0.12, 0.55, facing): near hemisphere crisp, limb fades, back→0
    const tt = clamp((facing - 0.12) / (0.55 - 0.12))
    const fade = tt * tt * (3 - 2 * tt)
    g.visible = fade > 0.01
    if (!g.visible) return

    // hover / same-owner dim
    const hovered = useTasteStore.getState().hoveredAssetId
    const isHovered = hovered === asset.id
    const dimmed = hovered != null && !isHovered && getAsset(hovered).owner === asset.owner

    // image fade-in once loaded
    const wantFace = asset.type === 'image' ? (tex ? 1 : 0) : 1
    faceFade.current += (wantFace - faceFade.current) * Math.min(1, dt * 4)

    const base = (0.78 + emphasis * 0.22) * (dimmed ? 0.42 : 1) * (isHovered ? 1.15 : 1)
    const o = base * fade
    if (backMat.current) backMat.current.opacity = 0.66 * fade
    // image face only (the text branch reuses faceMat as an invisible hover
    // target — keep it at 0 so it never paints over the SDF text)
    if (faceMat.current) faceMat.current.opacity = asset.type === 'image' ? o * faceFade.current : 0
    if (matMat.current) matMat.current.opacity = (isHovered ? 0.5 : 0.26) * fade
    if (textRef.current) textRef.current.fillOpacity = o
    for (const m of swatchMats.current) m.opacity = o

    // hover lift (uniform scale grows the panel along a larger sphere → reads
    // as lifting toward the viewer) + counter-scale the absorb prolate stretch
    const inv = (v: number) => clamp(1 / (Math.abs(v) < 1e-4 ? 1 : v), 0.72, 1.4)
    const hoverS = isHovered ? 1.16 : dimmed ? 0.92 : 1
    g.scale.setScalar(g.scale.x + (hoverS - g.scale.x) * Math.min(1, dt * 8))
    if (content.current) {
      // undo the inner group's LOCAL non-uniform prolate stretch (the absorb
      // liquid-drop) so images aren't mangled — using local scale, not world
      // (world scale also carries the lens's overall size, which should apply).
      const ls = (g.parent as THREE.Group).scale
      content.current.scale.set(inv(ls.x), inv(ls.y), inv(ls.z))
    }
  })

  const setHover = useTasteStore.getState().setHover

  return (
    <group ref={root} quaternion={quat}>
      <group ref={content}>
        {/* accent matte (peeks around the edge in the owning lens's color) */}
        <mesh geometry={matGeo} renderOrder={2}>
          <meshBasicMaterial
            ref={matMat}
            color={accent}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* dark backing — frames the content against the luminous core glow */}
        <mesh geometry={backGeo} renderOrder={3}>
          <meshBasicMaterial
            ref={backMat}
            color="#05070b"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {asset.type === 'image' && (
          <mesh
            geometry={faceGeo}
            renderOrder={4}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHover(asset.id)
            }}
            onPointerOut={() => setHover(null)}
          >
            <meshBasicMaterial
              ref={faceMat}
              map={tex ?? undefined}
              color={tex ? '#ffffff' : '#0a0e16'}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}

        {asset.type === 'text' && (
          <>
            {/* invisible curved face for the raycast/hover target */}
            <mesh
              geometry={faceGeo}
              renderOrder={4}
              onPointerOver={(e) => {
                e.stopPropagation()
                setHover(asset.id)
              }}
              onPointerOut={() => setHover(null)}
            >
              <meshBasicMaterial ref={faceMat} transparent opacity={0} depthWrite={false} />
            </mesh>
            <Text
              position={[0, 0, R_FACE + 0.012]}
              fontSize={0.085}
              maxWidth={R_FACE * arc * aspect * 0.82}
              anchorX="center"
              anchorY="middle"
              textAlign="center"
              color="#e9e4ff"
              outlineWidth={0}
              toneMapped={false}
              renderOrder={5}
              ref={(el) => {
                textRef.current = el as unknown as { fillOpacity: number } | null
              }}
              material-depthWrite={false}
            >
              {asset.label}
            </Text>
          </>
        )}

        {asset.type === 'palette' &&
          asset.palette.slice(0, 5).map((c, i) => {
            const n = Math.min(asset.palette.length, 5)
            const swatchAspect = (aspect / n) * 0.92
            const swatchArc = arc * 0.86
            // local yaw within the already-oriented panel frame (root carries quat)
            const yaw = (i - (n - 1) / 2) * ((arc * aspect) / n)
            const sq = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw)
            return (
              <mesh
                key={c + i}
                geometry={makeCurvedPanel(R_FACE + 0.004, swatchAspect, swatchArc)}
                quaternion={sq}
                renderOrder={4}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  setHover(asset.id)
                }}
                onPointerOut={() => setHover(null)}
              >
                <meshBasicMaterial
                  ref={(m) => {
                    if (m) swatchMats.current[i] = m
                  }}
                  color={c}
                  transparent
                  opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            )
          })}
      </group>
    </group>
  )
}
