import { create } from 'zustand'

/**
 * Stages of the Moodio "generate" beat.
 *   idle       — the user lens is whole and center stage; awaiting a prompt
 *   splitting  — the lens has split into 4 sub-bubbles flying to the quadrants
 *   generating — the 4 bubbles hold + shimmer (the staged "image generating" beat)
 *   revealed   — each bubble has flattened into a glass pane showing its image
 */
export type ChatStage = 'idle' | 'splitting' | 'generating' | 'revealed'

interface ChatState {
  stage: ChatStage
  /** The last submitted prompt (echoed on the panes). */
  prompt: string
  /** Current input text (bound to ChatBox). */
  draft: string
  /** performance.now() at submit — origin for the split stagger. */
  submittedAt: number | null

  setDraft: (s: string) => void
  /** Begin the beat: set the prompt, enter 'splitting', stamp the clock. */
  submit: (prompt: string) => void
  setStage: (s: ChatStage) => void
  reset: () => void
}

// The 3D tree reads stage/submittedAt inside useFrame via getState(), so these
// updates don't need to trigger React re-renders of the scene (same pattern as
// cameraStore / userMorphStore).
export const useChatStore = create<ChatState>((set) => ({
  stage: 'idle',
  prompt: '',
  draft: '',
  submittedAt: null,

  setDraft: (draft) => set({ draft }),
  submit: (prompt) => set({ stage: 'splitting', prompt, submittedAt: performance.now() }),
  setStage: (stage) => set({ stage }),
  reset: () => set({ stage: 'idle', prompt: '', submittedAt: null }),
}))
