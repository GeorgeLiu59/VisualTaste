import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  Noise,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

import {
  getAsset,
  nolanProfile,
  tarantinoProfile,
  nolanAssets,
  tarantinoAssets,
  type Vec3,
} from '../data/tasteData'
import {
  clampAwayFromAnchors,
  computePalette,
  computeSimilarity,
  deriveUserProfile,
  isTarantinoLike,
  toWorld,
} from '../lib/taste'
import { useTasteStore } from '../store/tasteStore'
import { Lens } from './Lens'
import { ProfileAttachments } from './ProfileAttachments'
import { OverlapField } from './OverlapField'
import { UnfoldView } from './UnfoldView'
import { AxisLabels } from './AxisLabels'
import { CameraRig } from './CameraRig'
import { AbsorbDirector } from './AbsorbDirector'
import { ConstellationReveal } from './ConstellationReveal'

const lerpTaste = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
})

const OVERLAP_COLOR: Record<'nolan' | 'tarantino', string> = {
  nolan: '#6f9fd6',
  tarantino: '#f0703a',
}

function SceneContent() {
  const activeAssetIds = useTasteStore((s) => s.activeAssetIds)
  const mode = useTasteStore((s) => s.mode)
  const compareTarget = useTasteStore((s) => s.compareTarget)
  const hoveredAssetId = useTasteStore((s) => s.hoveredAssetId)
  const draggingAssetId = useTasteStore((s) => s.draggingAssetId)
  const rippleSeed = useTasteStore((s) => s.rippleSeed)

  const user = useMemo(() => deriveUserProfile(activeAssetIds), [activeAssetIds])
  const activeAssets = useMemo(() => activeAssetIds.map(getAsset), [activeAssetIds])

  // hover bend: pull the user lens slightly toward the hovered reference.
  // Bend from (and re-clamp to) the display position so the lens never slides
  // into an anchor — it approaches, never merges.
  const hoveredAsset = hoveredAssetId ? getAsset(hoveredAssetId) : null
  const bentTaste = hoveredAsset
    ? clampAwayFromAnchors(lerpTaste(user.displayPosition, hoveredAsset.position, 0.2))
    : user.displayPosition
  const userWorld = toWorld(bentTaste)

  // compare: glide the selected anchor partway toward the user (display pos)
  const nolanTaste =
    mode === 'compare' && compareTarget === 'nolan'
      ? lerpTaste(nolanProfile.position, user.displayPosition, 0.5)
      : nolanProfile.position
  const tarantinoTaste =
    mode === 'compare' && compareTarget === 'tarantino'
      ? lerpTaste(tarantinoProfile.position, user.displayPosition, 0.5)
      : tarantinoProfile.position
  const nolanWorld = toWorld(nolanTaste)
  const tarantinoWorld = toWorld(tarantinoTaste)

  const count = activeAssets.length
  const isUnfold = mode === 'unfold'
  const userScale = isUnfold ? 0.2 : count === 0 ? 0.82 : 0.95 + Math.min(count, 6) * 0.07

  const leansNolan = user.position.y > 0.2 && user.position.x < 0.05
  const userStretch: [number, number, number] =
    user.shape === 'split' ? [1.06, 1.0, 1.06] : leansNolan ? [0.97, 1.1, 0.97] : [1, 1, 1]

  // Anchor lenses share a consistent shape language: gently-rounded ellipsoids
  // that only *hint* at personality (Nolan a touch portrait, Tarantino a touch
  // landscape) with a closely-matched, subtle surface irregularity — rather
  // than the old tall-skinny-vs-lumpy-blob contrast.
  const NOLAN_SCALE = 1.3
  const TARANTINO_SCALE = 1.26
  const NOLAN_STRETCH: [number, number, number] = [0.97, 1.1, 0.97]
  const TARANTINO_STRETCH: [number, number, number] = [1.08, 0.95, 1.08]
  const minStretch = (s: [number, number, number]) => Math.min(s[0], s[1], s[2])
  const userContainer = userScale * minStretch(userStretch) * 0.92
  const nolanContainer = NOLAN_SCALE * minStretch(NOLAN_STRETCH) * 0.92
  const tarantinoContainer = TARANTINO_SCALE * minStretch(TARANTINO_STRETCH) * 0.92

  const showLobe = user.shape === 'split' && !isUnfold
  const lobeDir = new THREE.Vector3(
    tarantinoWorld[0] - userWorld[0],
    tarantinoWorld[1] - userWorld[1],
    tarantinoWorld[2] - userWorld[2],
  )
    .normalize()
    .multiplyScalar(1.25)
  const lobeOffset: [number, number, number] = [lobeDir.x, lobeDir.y, lobeDir.z]

  const warmAssets = activeAssets.filter(isTarantinoLike)
  const warmPalette = warmAssets.length ? computePalette(warmAssets) : tarantinoProfile.palette

  const userAccent =
    count === 0
      ? '#e7eef8'
      : user.shape === 'split'
        ? '#c9b3ff'
        : warmAssets.length > 0
          ? '#ff9a6b'
          : '#9cc0ef'

  const userBrightness = (draggingAssetId ? 0.55 : 0) + (hoveredAssetId ? 0.15 : 0)
  const anchorForOverlap = compareTarget === 'nolan' ? nolanWorld : tarantinoWorld
  const compareSimilarity = computeSimilarity(
    user,
    compareTarget === 'nolan' ? nolanProfile : tarantinoProfile,
  )

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 6]} intensity={0.9} color="#dfe8ff" />
      <pointLight position={[-6, 2, -4]} intensity={30} color="#3c6cff" distance={30} />
      <pointLight position={[7, -3, 6]} intensity={26} color="#ff6a3c" distance={30} />

      <AxisLabels opacity={0.14} />

      {/* Nolan */}
      <Lens
        position={nolanWorld}
        palette={nolanProfile.palette}
        accent="#8fb4e6"
        scale={NOLAN_SCALE}
        stretch={NOLAN_STRETCH}
        irregular={0.04}
        geometrySeed={2}
      />
      <ProfileAttachments
        center={nolanWorld}
        assets={nolanAssets}
        palette={nolanProfile.palette}
        containerRadius={nolanContainer}
        emphasis={mode === 'compare' && compareTarget === 'nolan' ? 0.9 : 0.62}
      />

      {/* Tarantino */}
      <Lens
        position={tarantinoWorld}
        palette={tarantinoProfile.palette}
        accent="#ff7a45"
        scale={TARANTINO_SCALE}
        stretch={TARANTINO_STRETCH}
        irregular={0.06}
        geometrySeed={5}
        rimScale={0.4}
      />
      <ProfileAttachments
        center={tarantinoWorld}
        assets={tarantinoAssets}
        palette={tarantinoProfile.palette}
        containerRadius={tarantinoContainer}
        emphasis={mode === 'compare' && compareTarget === 'tarantino' ? 0.9 : 0.62}
      />

      {/* You */}
      <Lens
        position={userWorld}
        palette={user.palette}
        accent={userAccent}
        scale={userScale}
        stretch={userStretch}
        irregular={user.shape === 'split' ? 0.06 : 0.03}
        geometrySeed={1}
        rippleSeed={rippleSeed}
        showLobe={showLobe}
        lobeOffset={lobeOffset}
        lobePalette={warmPalette}
        lobeAccent="#ff7a45"
        brightness={userBrightness}
        showParticles={count > 0 && !isUnfold}
        tilePresence={count > 0 && !isUnfold ? 1 : 0}
        isUser
      />
      {!isUnfold && (
        <ProfileAttachments
          center={userWorld}
          assets={activeAssets}
          palette={user.palette}
          containerRadius={userContainer}
          isUser
        />
      )}

      <UnfoldView center={userWorld} assets={activeAssets} palette={user.palette} active={isUnfold} />

      <OverlapField
        userCenter={userWorld}
        anchorCenter={anchorForOverlap}
        color={OVERLAP_COLOR[compareTarget]}
        active={mode === 'compare'}
        similarity={compareSimilarity}
      />

      <ConstellationReveal />

      <CameraRig />
    </>
  )
}

export function Scene() {
  // Shared, mutable cinematic state the AbsorbDirector drives each frame:
  // the DOF focus point (DepthOfField reads this Vector3 every frame) and the
  // Bloom effect (for the transient intensity dip). Mutated in place → no React
  // re-renders of the 3D tree.
  const focusVec = useRef(new THREE.Vector3(0.5, 0.95, 0.2)).current
  const bloomRef = useRef<{ intensity: number } | null>(null)

  return (
    <Canvas
      className="!fixed inset-0"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [0.7, 1.9, 18.5], fov: 38, near: 0.1, far: 160 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.15
      }}
    >
      <color attach="background" args={['#070809']} />
      <fogExp2 attach="fog" args={['#070809', 0.014]} />

      <SceneContent />
      <AbsorbDirector focusVec={focusVec} bloomRef={bloomRef} />

      <Environment resolution={256} background={false}>
        <group rotation={[0, 0, 0]}>
          <Lightformer
            form="rect"
            intensity={4}
            position={[0, 6, 3]}
            scale={[16, 7, 1]}
            color="#ffffff"
          />
          <Lightformer
            form="rect"
            intensity={3.2}
            position={[-8, 1, -2]}
            scale={[9, 9, 1]}
            color="#8fb0ff"
          />
          <Lightformer
            form="rect"
            intensity={3}
            position={[8, -1, 5]}
            scale={[9, 9, 1]}
            color="#ffae86"
          />
          <Lightformer
            form="ring"
            intensity={2.2}
            position={[0, -3, -7]}
            scale={[7, 7, 1]}
            color="#cdd7ff"
          />
          <Lightformer
            form="rect"
            intensity={2.4}
            position={[0, 2, 9]}
            scale={[10, 6, 1]}
            color="#dfe8ff"
          />
        </group>
      </Environment>

      <EffectComposer enableNormalPass={false}>
        <DepthOfField target={focusVec} focalLength={0.008} bokehScale={0.9} height={480} />
        <Bloom
          ref={bloomRef as never}
          mipmapBlur
          intensity={0.95}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.5}
          radius={0.72}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0006, 0.0006)}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.32} darkness={0.82} />
        <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.045} />
      </EffectComposer>
    </Canvas>
  )
}
