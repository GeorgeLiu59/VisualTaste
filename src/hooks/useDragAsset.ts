import { useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { useTasteStore } from '../store/tasteStore'

export interface DragState {
  id: string
  x: number
  y: number
  active: boolean
}

/** Height (px) of the bottom band treated as the tray (not a drop target). */
const TRAY_ZONE = 188

/**
 * Drag a reference up into the scene to absorb it; tap to toggle it in/out.
 * Returns a gesture binder and the live drag state for rendering a clone.
 */
export function useDragAsset() {
  const [drag, setDrag] = useState<DragState | null>(null)
  const beginAbsorb = useTasteStore((s) => s.beginAbsorb)
  const toggleAsset = useTasteStore((s) => s.toggleAsset)
  const setDragging = useTasteStore((s) => s.setDragging)

  const bind = useDrag(
    ({ args, first, last, xy: [x, y], tap }) => {
      const id = args[0] as string
      const isActive = args[1] as boolean

      if (first) setDragging(id)

      if (last) {
        setDragging(null)
        setDrag(null)
        if (tap) {
          toggleAsset(id)
          return
        }
        const droppedInScene = y < window.innerHeight - TRAY_ZONE
        if (droppedInScene && !isActive) beginAbsorb(id)
        return
      }

      setDrag({ id, x, y, active: isActive })
    },
    { filterTaps: true, pointer: { touch: true } },
  )

  return { bind, drag }
}
