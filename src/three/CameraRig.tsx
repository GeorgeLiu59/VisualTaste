import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTasteStore } from '../store/tasteStore'
import { useCameraStore } from '../store/cameraStore'
import { useUserMorphStore } from '../store/userMorphStore'
import { deriveUserProfile, toWorld } from '../lib/taste'
import { nolanProfile, tarantinoProfile } from '../data/tasteData'

type V3 = [number, number, number]
const Y = new THREE.Vector3(0, 1, 0)

function baseFraming(): { pos: V3; look: V3; lambda: number } {
  const { mode, activeAssetIds } = useTasteStore.getState()
  const user = deriveUserProfile(activeAssetIds)
  // During an absorb morph, frame the SAME eased position the lens body uses so
  // the camera tracks it in lockstep (otherwise it would chase the final
  // derived position and desync from the slow-moving lens).
  const morph = useUserMorphStore.getState()
  const userW: V3 = morph.active ? morph.pos : toWorld(user.displayPosition)

  if (mode === 'unfold') {
    return { pos: [userW[0], userW[1] + 0.3, userW[2] + 9.5], look: userW, lambda: 1.8 }
  }
  if (mode === 'compare') {
    // frame all three lenses: the centroid of the user + both anchors, pulled
    // back far enough to take in Nolan (high/cool) and Tarantino (low/warm).
    const nW = toWorld(nolanProfile.position)
    const tW = toWorld(tarantinoProfile.position)
    const look: V3 = [
      (userW[0] + nW[0] + tW[0]) / 3,
      (userW[1] + nW[1] + tW[1]) / 3,
      (userW[2] + nW[2] + tW[2]) / 3,
    ]
    return { pos: [look[0] + 0.5, look[1] + 1.2, look[2] + 16], look, lambda: 1.6 }
  }
  // build: follow the user lens so it stays centred + in the DOF focal plane as
  // it drifts toward its taste centroid (was a fixed origin framing, which let
  // the lens slide off-centre and out of focus as references were added).
  return { pos: [userW[0] + 0.2, userW[1] + 0.95, userW[2] + 17.8], look: userW, lambda: 1.6 }
}

/**
 * Cinematic orbit rig: mode/walkthrough sets the "rest" framing, and the user
 * can click-drag to orbit around it (and scroll to dolly). User rotation is
 * layered on top of the damped base direction, so transitions stay smooth.
 */
export function CameraRig() {
  const gl = useThree((s) => s.gl)

  const baseDir = useRef(new THREE.Vector3(0.04, 0.1, 1).normalize())
  const baseRadius = useRef(18.5)
  const target = useRef(new THREE.Vector3(0.5, 0.95, 0.2))

  const userAz = useRef(0)
  const userPolar = useRef(0)
  const userZoom = useRef(0)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  const tmpLook = useRef(new THREE.Vector3())
  const tmpDesired = useRef(new THREE.Vector3())
  const tmpDir = useRef(new THREE.Vector3())
  const tmpRight = useRef(new THREE.Vector3())

  useEffect(() => {
    const el = gl.domElement
    el.style.cursor = 'grab'

    const down = (e: PointerEvent) => {
      dragging.current = true
      last.current = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }
      userAz.current -= dx * 0.005
      userPolar.current = THREE.MathUtils.clamp(userPolar.current - dy * 0.005, -1.05, 1.05)
    }
    const up = () => {
      dragging.current = false
      el.style.cursor = 'grab'
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      userZoom.current = THREE.MathUtils.clamp(userZoom.current + e.deltaY * 0.0009, -0.45, 1.8)
    }

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useFrame((state, dt) => {
    const goal = useCameraStore.getState().goal
    const base = baseFraming()
    const pos = goal ? goal.pos : base.pos
    const look = goal ? goal.look : base.look
    const lambda = goal?.lambda ?? base.lambda
    const k = 1 - Math.exp(-lambda * dt)

    tmpLook.current.set(look[0], look[1], look[2])
    target.current.lerp(tmpLook.current, k)

    tmpDesired.current.set(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2])
    const r = tmpDesired.current.length() || 1
    tmpDesired.current.normalize()
    baseDir.current.lerp(tmpDesired.current, k).normalize()
    baseRadius.current += (r - baseRadius.current) * k

    // gentle idle drift only when the user isn't actively orbiting
    const idle = dragging.current ? 0 : Math.sin(state.clock.elapsedTime * 0.05) * 0.035

    tmpDir.current.copy(baseDir.current)
    tmpDir.current.applyAxisAngle(Y, userAz.current + idle)
    tmpRight.current.crossVectors(Y, tmpDir.current).normalize()
    tmpDir.current.applyAxisAngle(tmpRight.current, userPolar.current).normalize()

    const radius = baseRadius.current * (1 + userZoom.current)
    state.camera.position.copy(target.current).addScaledVector(tmpDir.current, radius)
    state.camera.lookAt(target.current)
  })

  return null
}
