import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { damp } from '../lib/taste'

// ---------------------------------------------------------------------------
// Shared assets (created once)
// ---------------------------------------------------------------------------

const softDot = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  return tex
})()

function makeLensGeometry(irregularity: number, seed: number) {
  const geo = new THREE.SphereGeometry(1, 110, 110)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = v.clone().normalize()
    const noise =
      Math.sin(n.x * 2.3 + seed) * 0.5 +
      Math.sin(n.y * 3.1 + seed * 1.7) * 0.3 +
      Math.sin(n.z * 2.7 + seed * 2.9) * 0.45 +
      Math.sin((n.x + n.z) * 4.5 + seed) * 0.2
    const d = 1 + noise * irregularity
    v.copy(n).multiplyScalar(d)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

function brightest(palette: string[]): string {
  let best = palette[0] ?? '#ffffff'
  let bestL = -1
  for (const c of palette) {
    const col = new THREE.Color(c)
    const l = col.r * 0.299 + col.g * 0.587 + col.b * 0.114
    if (l > bestL) {
      bestL = l
      best = c
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Fresnel rim shell (additive edge glow) + inner core glow
// ---------------------------------------------------------------------------

const glowVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const rimFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - clamp(dot(vN, vView), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor * f * uIntensity, f * 0.95);
  }
`

// center-bright (volumetric-ish core)
const coreFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float c = pow(clamp(dot(vN, vView), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor * c * uIntensity, c * 0.5);
  }
`

function makeGlowMaterial(color: string, frag: string, power: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: 1.0 },
    },
    vertexShader: glowVert,
    fragmentShader: frag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  })
}

// ---------------------------------------------------------------------------
// Inner colored particles ("liquid color diffusion")
// ---------------------------------------------------------------------------

function InnerParticles({ palette, radius = 0.5, count = 38 }: { palette: string[]; radius?: number; count?: number }) {
  const ref = useRef<THREE.Points>(null!)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 1.15
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    return g
  }, [count, radius])

  useEffect(() => {
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute
    const cols = palette.length ? palette : ['#ffffff']
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      c.set(cols[i % cols.length])
      colorAttr.setXYZ(i, c.r, c.g, c.b)
    }
    colorAttr.needsUpdate = true
  }, [palette, geometry, count])

  useFrame((state, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.12
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.15
    }
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.085}
        map={softDot}
        vertexColors
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

// ---------------------------------------------------------------------------
// Lens
// ---------------------------------------------------------------------------

export interface LensProps {
  position: [number, number, number]
  palette: string[]
  accent?: string
  scale?: number
  stretch?: [number, number, number]
  irregular?: number
  brightness?: number
  rippleSeed?: number
  showLobe?: boolean
  lobeOffset?: [number, number, number]
  lobePalette?: string[]
  lobeAccent?: string
  lambda?: number
  geometrySeed?: number
  showParticles?: boolean
  opacity?: number
}

export function Lens({
  position,
  palette,
  accent,
  scale = 1,
  stretch = [1, 1, 1],
  irregular = 0.03,
  brightness = 0,
  rippleSeed = 0,
  showLobe = false,
  lobeOffset = [1.1, -0.5, 0.7],
  lobePalette,
  lobeAccent = '#ff7a45',
  lambda = 2.2,
  geometrySeed = 1,
  showParticles = true,
  opacity = 1,
}: LensProps) {
  const group = useRef<THREE.Group>(null!)
  const inner = useRef<THREE.Group>(null!)
  const mtmRef = useRef<THREE.MeshPhysicalMaterial>(null!)
  const accentColor = accent ?? brightest(palette)
  const rimMat = useMemo(() => makeGlowMaterial(accentColor, rimFrag, 2.0), [])
  const coreMat = useMemo(() => makeGlowMaterial(accentColor, coreFrag, 1.6), [])
  const geometry = useMemo(() => makeLensGeometry(irregular, geometrySeed), [irregular, geometrySeed])

  const impulse = useRef(0)
  const lastSeed = useRef(rippleSeed)
  useEffect(() => {
    if (rippleSeed !== lastSeed.current) {
      lastSeed.current = rippleSeed
      impulse.current = 1
    }
  }, [rippleSeed])

  const lobeGroup = useRef<THREE.Group>(null!)
  const lobeRim = useMemo(() => makeGlowMaterial(lobeAccent, rimFrag, 2.0), [])
  const lobeGeometry = useMemo(() => makeLensGeometry(0.1, geometrySeed + 7), [geometrySeed])
  const lobeShown = useRef(0)

  const tintTarget = useMemo(() => new THREE.Color(), [])
  const attenTarget = useMemo(() => new THREE.Color(), [])
  const accentTarget = useMemo(() => new THREE.Color(), [])
  useEffect(() => {
    tintTarget.set(palette[4] ?? palette[palette.length - 1] ?? '#e7ecf3')
    attenTarget.set(palette[2] ?? palette[1] ?? '#9aa6b3')
    accentTarget.set(accentColor)
  }, [palette, accentColor, tintTarget, attenTarget, accentTarget])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const k = 1 - Math.exp(-lambda * dt)
    g.position.x = damp(g.position.x, position[0], lambda, dt)
    g.position.y = damp(g.position.y, position[1], lambda, dt)
    g.position.z = damp(g.position.z, position[2], lambda, dt)

    impulse.current *= Math.exp(-3.5 * dt)
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.5 + geometrySeed) * 0.018
    const pulse = 1 + impulse.current * 0.14
    const s = scale * breathe * pulse
    g.scale.x = damp(g.scale.x, s * stretch[0], 6, dt)
    g.scale.y = damp(g.scale.y, s * stretch[1], 6, dt)
    g.scale.z = damp(g.scale.z, s * stretch[2], 6, dt)

    if (inner.current) {
      inner.current.rotation.y += dt * 0.05
      inner.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.13) * 0.08
    }

    if (mtmRef.current) {
      mtmRef.current.color.lerp(tintTarget, k)
      mtmRef.current.attenuationColor.lerp(attenTarget, k)
    }
    ;(rimMat.uniforms.uColor.value as THREE.Color).lerp(accentTarget, k)
    ;(coreMat.uniforms.uColor.value as THREE.Color).lerp(accentTarget, k)
    rimMat.uniforms.uIntensity.value = damp(
      rimMat.uniforms.uIntensity.value,
      (1.7 + brightness * 1.9 + impulse.current * 1.6) * opacity,
      6,
      dt,
    )
    coreMat.uniforms.uIntensity.value = damp(
      coreMat.uniforms.uIntensity.value,
      (0.16 + brightness * 0.45 + impulse.current * 0.4) * opacity,
      6,
      dt,
    )

    const targetLobe = showLobe ? 1 : 0
    lobeShown.current = damp(lobeShown.current, targetLobe, 3.5, dt)
    if (lobeGroup.current) {
      const ls = 0.0001 + lobeShown.current * 0.66
      lobeGroup.current.scale.setScalar(ls)
      lobeGroup.current.visible = lobeShown.current > 0.02
      lobeRim.uniforms.uIntensity.value = 1.9 * lobeShown.current
    }
  })

  return (
    <group ref={group} position={position}>
      <group ref={inner}>
        <mesh geometry={geometry}>
          <MeshTransmissionMaterial
            ref={mtmRef as never}
            samples={8}
            resolution={512}
            thickness={0.45}
            roughness={0.06}
            anisotropicBlur={0.2}
            chromaticAberration={0.035}
            distortion={0.12}
            distortionScale={0.24}
            temporalDistortion={0.05}
            ior={1.16}
            attenuationDistance={6.5}
            transmission={1}
            clearcoat={0.85}
            clearcoatRoughness={0.14}
            transparent
            opacity={opacity}
          />
        </mesh>
        {/* inner core glow */}
        <mesh geometry={geometry} scale={0.9}>
          <primitive object={coreMat} attach="material" />
        </mesh>
        {/* fresnel rim */}
        <mesh geometry={geometry} scale={1.035}>
          <primitive object={rimMat} attach="material" />
        </mesh>
        {showParticles && <InnerParticles palette={palette} />}
      </group>

      {/* warm split lobe */}
      <group ref={lobeGroup} position={lobeOffset} visible={false}>
        <mesh geometry={lobeGeometry}>
          <meshStandardMaterial
            color={(lobePalette ?? ['#3a0d08'])[0]}
            emissive={lobeAccent}
            emissiveIntensity={0.8}
            roughness={0.32}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh geometry={lobeGeometry} scale={1.06}>
          <primitive object={lobeRim} attach="material" />
        </mesh>
        <InnerParticles palette={lobePalette ?? ['#F05A28', '#E0A326']} radius={0.42} count={55} />
      </group>
    </group>
  )
}
