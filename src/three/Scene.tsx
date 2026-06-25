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
} from '../data/tasteData'
import {
  deriveUserProfile,
  isTarantinoLike,
  toWorld,
} from '../lib/taste'
import { useTasteStore } from '../store/tasteStore'
import { useChatStore } from '../store/chatStore'
import { Lens } from './Lens'
import { ProfileAttachments } from './ProfileAttachments'
import { UnfoldView } from './UnfoldView'
import { AxisLabels } from './AxisLabels'
import { CameraRig } from './CameraRig'
import { AbsorbDirector } from './AbsorbDirector'
import { AffinityLines } from './AffinityLines'
import { MoodSplit } from './MoodSplit'

function SceneContent() {
  const activeAssetIds = useTasteStore((s) => s.activeAssetIds)
  const mode = useTasteStore((s) => s.mode)
  const compareTarget = useTasteStore((s) => s.compareTarget)
  const hoveredAssetId = useTasteStore((s) => s.hoveredAssetId)
  const draggingAssetId = useTasteStore((s) => s.draggingAssetId)
  const rippleSeed = useTasteStore((s) => s.rippleSeed)
  const chatStage = useChatStore((s) => s.stage)

  const user = useMemo(() => deriveUserProfile(activeAssetIds), [activeAssetIds])
  const activeAssets = useMemo(() => activeAssetIds.map(getAsset), [activeAssetIds])

  // The user lens rests at its derived (clamped) display position. Hovering a
  // tray reference no longer yanks the lens toward where it *would* land — that
  // preview-move read as the lens snapping around. The actual move happens only
  // on absorb (the slow morph). Hover still lights things up (brightness below).
  const userWorld = toWorld(user.displayPosition)

  // Anchors stay at their fixed taste-space positions in compare mode — no
  // glide toward the user (that "touch + aura" overlap was removed). Compare
  // simply brings Nolan & Tarantino into view; per-asset affinity lines convey
  // the relationship instead.
  const nolanWorld = toWorld(nolanProfile.position)
  const tarantinoWorld = toWorld(tarantinoProfile.position)

  const count = activeAssets.length
  const isUnfold = mode === 'unfold'
  const isChat = mode === 'chat'
  // Once the prompt is submitted the lens cleaves into the 4 quadrant panes
  // (MoodSplit), so the main user lens collapses out of the way.
  const chatSplit = isChat && chatStage !== 'idle'
  // Anchors (and the cross-space comparison visuals) belong to Compare mode.
  // Build mode is just "you".
  const showAnchors = mode === 'compare'
  const userScale = isUnfold
    ? 0.2
    : chatSplit
      ? 0.05
      : isChat
        ? 1.5
        : count === 0
          ? 0.9
          : 1.05 + Math.min(count, 6) * 0.085

  const leansNolan = user.position.y > 0.2 && user.position.x < 0.05
  const userStretch: [number, number, number] =
    user.shape === 'split' ? [1.06, 1.0, 1.06] : leansNolan ? [0.97, 1.1, 0.97] : [1, 1, 1]

  // Anchor lenses share a consistent shape language: gently-rounded ellipsoids
  // that only *hint* at personality (Nolan a touch portrait, Tarantino a touch
  // landscape) with a closely-matched, subtle surface irregularity — rather
  // than the old tall-skinny-vs-lumpy-blob contrast.
  const NOLAN_SCALE = 1.62
  const TARANTINO_SCALE = 1.56
  const NOLAN_STRETCH: [number, number, number] = [0.97, 1.1, 0.97]
  const TARANTINO_STRETCH: [number, number, number] = [1.08, 0.95, 1.08]
  // world radius of each lens (smallest semi-axis), so the reference cluster
  // stays inside the silhouette.
  const minStretch = (s: [number, number, number]) => Math.min(s[0], s[1], s[2])
  const userRadius = userScale * minStretch(userStretch)
  const nolanRadius = NOLAN_SCALE * minStretch(NOLAN_STRETCH)
  const tarantinoRadius = TARANTINO_SCALE * minStretch(TARANTINO_STRETCH)
  const warmAssets = activeAssets.filter(isTarantinoLike)

  const userAccent =
    count === 0
      ? '#e7eef8'
      : user.shape === 'split'
        ? '#c9b3ff'
        : warmAssets.length > 0
          ? '#ff9a6b'
          : '#9cc0ef'

  const userBrightness = (draggingAssetId ? 0.55 : 0) + (hoveredAssetId ? 0.15 : 0)
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 6]} intensity={0.9} color="#dfe8ff" />
      <pointLight position={[-6, 2, -4]} intensity={30} color="#3c6cff" distance={30} />
      <pointLight position={[7, -3, 6]} intensity={26} color="#ff6a3c" distance={30} />

      {/* taste-space dimension labels belong to build/compare/unfold, not Moodio */}
      {!isChat && <AxisLabels opacity={0.14} />}

      {/* Nolan & Tarantino anchors — only present in Compare mode. Build mode is
          just "you", so the user can watch their own taste form uncluttered. */}
      {showAnchors && (
        <>
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
            radius={nolanRadius}
            assets={nolanAssets}
            emphasis={compareTarget === 'nolan' ? 0.9 : 0.62}
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
            radius={tarantinoRadius}
            assets={tarantinoAssets}
            emphasis={compareTarget === 'tarantino' ? 0.9 : 0.62}
          />

          {/* per-asset affinity lines from each user reference to the director
              it most resembles (stronger = closer) */}
          <AffinityLines
            userWorld={userWorld}
            assets={activeAssets}
            nolanWorld={nolanWorld}
            tarantinoWorld={tarantinoWorld}
          />
        </>
      )}

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
        brightness={userBrightness}
        showParticles={count > 0 && !isUnfold && !chatSplit}
        tilePresence={count > 0 && !isUnfold && !chatSplit ? 1 : 0}
        opacity={chatSplit ? 0 : 1}
        isUser
      />
      {count > 0 && !isUnfold && !chatSplit && (
        <ProfileAttachments center={userWorld} radius={userRadius} assets={activeAssets} emphasis={1} isUser />
      )}

      {/* Moodio: the lens cleaves into 4 mood-cluster panes on prompt */}
      {isChat && <MoodSplit userWorld={userWorld} />}

      <UnfoldView center={userWorld} assets={activeAssets} palette={user.palette} active={isUnfold} />

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
        <DepthOfField target={focusVec} focalLength={0.012} bokehScale={0.55} height={480} />
        <Bloom
          ref={bloomRef as never}
          mipmapBlur
          intensity={0.95}
          luminanceThreshold={0.28}
          luminanceSmoothing={0.5}
          radius={0.72}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0002, 0.0002)}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.38} darkness={0.6} />
        <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.03} />
      </EffectComposer>
    </Canvas>
  )
}
