import { useTasteStore } from '../store/tasteStore'
import { useCameraStore } from '../store/cameraStore'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

/**
 * Runs the cinematic 9-scene walkthrough from DESIGN.md section 17.
 * Returns a cancel function.
 */
export function runWalkthrough(): () => void {
  let cancelled = false
  const t = () => useTasteStore.getState()
  const cam = () => useCameraStore.getState()

  const finish = () => {
    t().setShowFinale(false)
    t().setWalkthroughActive(false)
    cam().setGoal(null)
  }

  ;(async () => {
    t().reset()
    t().setShowFinale(false)
    t().setWalkthroughActive(true)

    // Scene 1: empty taste — wide establishing shot
    cam().setGoal({ pos: [0.5, 1.7, 14.6], look: [0.3, 0.7, 0], lambda: 1.1 })
    await delay(1700)
    if (cancelled) return

    // Scene 2: rain city (cold)
    t().addAsset('user-rain-city')
    await delay(2500)
    if (cancelled) return

    // Scene 3: concrete corridor (architectural)
    t().addAsset('user-concrete-corridor')
    await delay(2500)
    if (cancelled) return

    // Scene 4: earth (vast)
    cam().setGoal({ pos: [0.2, 1.4, 13.2], look: [0.1, 0.7, 0], lambda: 0.9 })
    t().addAsset('user-earth')
    await delay(2600)
    if (cancelled) return

    // Scene 5: neon diner (new lobe) — the key moment
    cam().setGoal({ pos: [0.5, 1.0, 12.2], look: [0.3, 0.4, 0.1], lambda: 0.9 })
    t().addAsset('user-neon-diner')
    await delay(3000)
    if (cancelled) return

    // Scene 6: retro pulse (electric)
    t().addAsset('text-retro-pulse')
    await delay(2400)
    if (cancelled) return

    // Scene 7: steel cinema (palette)
    t().addAsset('palette-steel-cinema')
    await delay(2600)
    if (cancelled) return

    // Scene 8: unfold
    cam().setGoal(null)
    t().setMode('unfold')
    await delay(3800)
    if (cancelled) return

    // Scene 9: fold back, pull out, final line
    t().setMode('build')
    cam().setGoal({ pos: [1.2, 1.5, 15.6], look: [0.4, 0.55, 0], lambda: 0.7 })
    await delay(1600)
    if (cancelled) return
    t().setShowFinale(true)
    await delay(4600)
    if (cancelled) return

    finish()
  })()

  return () => {
    cancelled = true
    finish()
  }
}
