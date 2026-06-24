import { create } from 'zustand'

export interface CameraGoal {
  pos: [number, number, number]
  look: [number, number, number]
  /** Higher = snappier approach. */
  lambda?: number
}

interface CameraState {
  goal: CameraGoal | null
  setGoal: (g: CameraGoal | null) => void
}

// Camera goals are consumed inside useFrame via getState(), so updates here
// do not need to trigger React re-renders of the 3D tree.
export const useCameraStore = create<CameraState>((set) => ({
  goal: null,
  setGoal: (goal) => set({ goal }),
}))
