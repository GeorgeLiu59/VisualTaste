import { useEffect, useMemo, useRef, useState } from 'react'
import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../lib/taste'
import { getAsset } from '../data/tasteData'
import { useChatStore, type ChatStage } from '../store/chatStore'
import { moodSubsets, type MoodSubset } from '../data/chatData'
import { Lens } from './Lens'
import { ProfileAttachments } from './ProfileAttachments'
import { softDot } from './softDot'

// ---------------------------------------------------------------------------
// Moodio "generate" beat. The user's lens cleaves into 4 mood-cluster
// sub-bubbles that fly to the quadrants (splitting). Each sub-bubble carries
// the actual references for its category (image / text / palette tiles, split
// off from the original lens) and rotates + pulses (generating — the visible
// thinking beat). Then each dissolves as it reveals its image inside a glassy,
// glowing frame (revealed). Frame-driven off chatStore — no React churn.
// ---------------------------------------------------------------------------

type V3 = [number, number, number]

// quadrant spread (world units) around the lens; grid lifted so the bottom row
// clears the chat box.
const DX = 7.0
const DY = 4.6
const GRID_Y = 1.0

// sub-bubble size while generating — big enough that its reference tiles read
// at the (pulled-back) reveal framing.
const BUBBLE_SCALE = 3.2

// result image box (large — the bubble dissolves to just a glassy frame)
const BOX_W = 10.0
const BOX_H = 6.5
const FRAME = 0.6 // frosted glass margin around the image
const RIM = 0.26 // accent rim-glow margin

/** order 0..3 → TL, TR, BL, BR (relative to the lens center). */
function quadrant(order: number, userWorld: V3): V3 {
  const x = userWorld[0] + (order % 2 === 0 ? -DX : DX)
  const y = userWorld[1] + GRID_Y + (order < 2 ? DY : -DY)
  return [x, y, userWorld[2]]
}

export interface MoodSplitProps {
  userWorld: V3
}

export function MoodSplit({ userWorld }: MoodSplitProps) {
  // A shared shimmer heartbeat: while splitting/generating we bump a seed each
  // sub-bubble reads as a one-shot rim/core pulse (on top of the spin).
  const [pulse, setPulse] = useState(0)
  const stage = useChatStore((s) => s.stage)

  useEffect(() => {
    if (stage !== 'generating' && stage !== 'splitting') return
    const t = setInterval(() => setPulse((p) => p + 1), 600)
    return () => clearInterval(t)
  }, [stage])

  return (
    <group>
      {moodSubsets.map((subset) => (
        <Entity key={subset.id} subset={subset} userWorld={userWorld} pulse={pulse} stage={stage} />
      ))}
    </group>
  )
}

function Entity({
  subset,
  userWorld,
  pulse,
  stage,
}: {
  subset: MoodSubset
  userWorld: V3
  pulse: number
  stage: ChatStage
}) {
  const holder = useRef<THREE.Group>(null!)
  const spinner = useRef<THREE.Group>(null!)
  const memberAssets = useMemo(() => subset.members.map(getAsset), [subset])

  const split = stage !== 'idle'
  const revealed = stage === 'revealed'
  // The bubble shrinks + fades away on reveal — the option is then the image in
  // a glassy frame.
  const lensScale = revealed ? 0.02 : split ? BUBBLE_SCALE : 0.04

  useFrame((state, dt) => {
    const cs = useChatStore.getState()
    // staggered release: each bubble peels off to its quadrant a beat after the
    // previous one (reads as a fanning split rather than four moving as one).
    const elapsed = cs.submittedAt != null ? performance.now() - cs.submittedAt : 0
    const released = cs.stage !== 'idle' && elapsed >= subset.order * 130
    const target = released ? quadrant(subset.order, userWorld) : userWorld
    const h = holder.current
    if (h) {
      h.position.x = damp(h.position.x, target[0], 2.4, dt)
      h.position.y = damp(h.position.y, target[1], 2.4, dt)
      h.position.z = damp(h.position.z, target[2], 2.4, dt)
    }

    // While "generating": only the glass bubble spins + pulses (its reference
    // tiles + labels stay billboarded and readable — they live in `holder`, not
    // the spinning `spinner`).
    const sp = spinner.current
    if (sp) {
      const working = cs.stage === 'splitting' || cs.stage === 'generating'
      if (working) {
        sp.rotation.y += dt * (1.0 + subset.order * 0.12)
        sp.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3.2 + subset.order * 1.3) * 0.08)
      } else {
        sp.rotation.y = damp(sp.rotation.y, 0, 4, dt)
        sp.scale.setScalar(damp(sp.scale.x, 1, 6, dt))
      }
    }
  })

  return (
    <group ref={holder} position={userWorld}>
      <group ref={spinner}>
        <Lens
          position={[0, 0, 0]}
          palette={subset.palette}
          accent={subset.accent}
          scale={lensScale}
          irregular={0.035}
          geometrySeed={subset.order + 10}
          showParticles={split && !revealed}
          opacity={revealed ? 0 : 1}
          rippleSeed={pulse}
          rimScale={0.85}
          tilePresence={split && !revealed ? 1 : 0}
        />
      </group>

      {/* the category's actual references, split off into this bubble */}
      {split && !revealed && (
        <ProfileAttachments center={[0, 0, 0]} radius={BUBBLE_SCALE * 0.9} assets={memberAssets} emphasis={1} />
      )}

      <MoodPane
        src={subset.resultSrc}
        fallbackSrc={subset.fallbackSrc}
        accent={subset.accent}
        revealed={revealed}
      />

      {/* category title (the references themselves are shown by the tiles) */}
      {split && (
        <Billboard>
          <Text
            position={[0, BOX_H / 2 + 0.75, 0]}
            fontSize={0.5}
            color="#eef4ff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0}
            fillOpacity={0.96}
            material-depthTest={false}
            renderOrder={20}
          >
            {subset.label}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

/**
 * The staged result image, billboarded so it stays readable as the camera
 * orbits. On reveal it "develops" in inside a glassy frame: a soft accent halo,
 * a frosted translucent margin with a drifting reflection, and a glowing accent
 * rim — echoing the glass bubbles rather than a flat solid border. Loads its
 * texture imperatively (contain-fit, full brightness), falling back to an
 * existing still until the staged result image exists.
 */
function MoodPane({
  src,
  fallbackSrc,
  accent,
  revealed,
}: {
  src: string
  fallbackSrc: string
  accent: string
  revealed: boolean
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const grp = useRef<THREE.Group>(null!)
  const imgMat = useRef<THREE.MeshBasicMaterial>(null!)
  const rimMat = useRef<THREE.MeshBasicMaterial>(null!)
  const frostMat = useRef<THREE.MeshBasicMaterial>(null!)
  const haloMat = useRef<THREE.MeshBasicMaterial>(null!)
  const sheen = useRef<THREE.Mesh>(null!)
  const frameGlint = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    let active = true
    const apply = (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.generateMipmaps = true
      if (active) setTex(t)
      else t.dispose()
    }
    const loader = new THREE.TextureLoader()
    // Prefer the staged result image; fall back to an existing still if it isn't
    // there yet, so the panes never render empty.
    loader.load(src, apply, undefined, () => loader.load(fallbackSrc, apply))
    return () => {
      active = false
    }
  }, [src, fallbackSrc])

  // contain-fit the image inside the box at its own aspect
  let w = BOX_W
  let h = BOX_H
  const img = tex?.image as { width: number; height: number } | undefined
  if (img && img.width && img.height) {
    const a = img.width / img.height
    const boxA = BOX_W / BOX_H
    if (a > boxA) {
      w = BOX_W
      h = BOX_W / a
    } else {
      h = BOX_H
      w = BOX_H * a
    }
  }

  useFrame((state, dt) => {
    const t = revealed ? 1 : 0
    if (imgMat.current) imgMat.current.opacity = damp(imgMat.current.opacity, t, 5, dt)
    if (rimMat.current) rimMat.current.opacity = damp(rimMat.current.opacity, t * 0.6, 5, dt)
    if (frostMat.current) frostMat.current.opacity = damp(frostMat.current.opacity, t * 0.12, 5, dt)
    if (haloMat.current) haloMat.current.opacity = damp(haloMat.current.opacity, t * 0.2, 5, dt)
    if (grp.current) {
      const s = damp(grp.current.scale.x, revealed ? 1 : 1.06, 5, dt)
      grp.current.scale.setScalar(s)
    }
    // glassy reflections drift across the pane as the camera orbits
    const cam = state.camera.position
    const ang = Math.atan2(cam.x, cam.z)
    if (sheen.current) {
      sheen.current.position.x = Math.sin(ang) * w * 0.18
      const sm = sheen.current.material as THREE.MeshBasicMaterial
      sm.opacity = damp(sm.opacity, t * 0.1, 5, dt)
    }
    if (frameGlint.current) {
      frameGlint.current.position.x = Math.sin(ang) * (w * 0.5) - w * 0.18
      const gm = frameGlint.current.material as THREE.MeshBasicMaterial
      gm.opacity = damp(gm.opacity, t * 0.16, 5, dt)
    }
  })

  return (
    <Billboard>
      <group ref={grp}>
        {/* soft outer accent halo */}
        <mesh position={[0, 0, -0.05]} renderOrder={8}>
          <planeGeometry args={[BOX_W + 1.8, BOX_H + 1.8]} />
          <meshBasicMaterial
            ref={haloMat}
            color={accent}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* frosted glass margin (the body of the frame) */}
        <mesh position={[0, 0, -0.03]} renderOrder={9}>
          <planeGeometry args={[w + FRAME, h + FRAME]} />
          <meshBasicMaterial
            ref={frostMat}
            color="#d7e6f7"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* drifting glass reflection across the frame */}
        <mesh ref={frameGlint} position={[0, h * 0.28, -0.02]} renderOrder={9} scale={[(w + FRAME) * 0.55, (h + FRAME) * 0.4, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={softDot}
            color="#ffffff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* glowing accent rim (echoes the bubble's fresnel rim) */}
        <mesh position={[0, 0, -0.02]} renderOrder={10}>
          <planeGeometry args={[w + RIM, h + RIM]} />
          <meshBasicMaterial
            ref={rimMat}
            color={accent}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {tex && (
          <>
            <mesh renderOrder={11}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial ref={imgMat} map={tex} transparent opacity={0} toneMapped={false} depthTest={false} />
            </mesh>
            <mesh ref={sheen} renderOrder={12} scale={[w * 0.85, h * 0.5, 1]} position={[0, h * 0.18, 0.01]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                map={softDot}
                color="#e6f0ff"
                transparent
                opacity={0}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                depthTest={false}
                toneMapped={false}
              />
            </mesh>
          </>
        )}
      </group>
    </Billboard>
  )
}
