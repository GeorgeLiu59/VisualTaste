import { useTasteStore } from '../store/tasteStore'
import { useCameraStore } from '../store/cameraStore'

/**
 * Runs the cinematic walkthrough from DESIGN.md section 17.
 *
 * Each reference now plays the full cinematic absorb beat (rack → survey reveal
 * → slow eased migration), driven by AbsorbDirector. The walkthrough simply
 * awaits each beat. The AbsorbDirector owns the camera during a beat and
 * releases it (setGoal(null)) on completion, so the walkthrough only sets
 * establishing framings *between* beats (opening, unfold, finale) — it no longer
 * sets per-scene goals that would fight the absorb cinematography.
 *
 * Returns a cancel function.
 */
export function runWalkthrough(): () => void {
  let cancelled = false
  // track the in-flight timer so cancel() can clear it (no dangling wake-up)
  let activeTimer: ReturnType<typeof setTimeout> | undefined
  const delay = (ms: number) =>
    new Promise<void>((res) => {
      activeTimer = setTimeout(() => {
        activeTimer = undefined
        res()
      }, ms)
    })
  const t = () => useTasteStore.getState()
  const cam = () => useCameraStore.getState()

  const finish = () => {
    t().setShowFinale(false)
    t().setWalkthroughActive(false)
    t().endAbsorb()
    cam().setGoal(null)
  }

  // absorb a reference and wait for its full beat; bail early if cancelled
  const absorb = async (id: string, breathMs = 650) => {
    if (cancelled) return
    await t().beginAbsorbAndWait(id)
    if (cancelled) return
    await delay(breathMs)
  }

  ;(async () => {
    t().reset()
    t().setShowFinale(false)
    t().setWalkthroughActive(true)

    // Scene 1: empty taste — wide establishing shot (held a beat before the
    // first reference; the AbsorbDirector takes the camera from here on).
    cam().setGoal({ pos: [0.5, 1.7, 14.6], look: [0.3, 0.7, 0], lambda: 1.1 })
    await delay(1900)
    if (cancelled) return

    // Scenes 2-4: the Nolan-leaning cool references.
    await absorb('user-rain-city') // cold
    await absorb('user-concrete-corridor') // architectural
    await absorb('user-earth') // vast

    // Scene 5: neon diner — the key moment, taste gains a warm, electric side.
    await absorb('user-neon-diner', 850)

    // Scenes 6-7: reinforce the warm side, then a palette.
    await absorb('text-retro-pulse') // electric
    await absorb('palette-steel-cinema') // palette
    if (cancelled) return

    // Scene 8a: Compare — bring in the anchors and weigh the taste against each.
    t().setMode('compare')
    t().setCompareTarget('nolan')
    await delay(3200)
    if (cancelled) return
    t().setCompareTarget('tarantino')
    await delay(3200)
    if (cancelled) return

    // Scene 8b: unfold the profile into its ingredients.
    t().setMode('unfold')
    await delay(3800)
    if (cancelled) return

    // Scene 9: fold back, pull out, final line.
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
    if (activeTimer) clearTimeout(activeTimer)
    finish()
  }
}
