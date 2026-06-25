import { userImageAssets, textAssets, paletteAssets } from './tasteData'

// ---------------------------------------------------------------------------
// Moodio chat mode — STAGED data.
//
// On entering chat we seed the FULL profile (every image, text, and palette
// reference) so the lens reads as a rich, mixed taste. On a prompt that profile
// cleaves into these 4 "mood cluster" directions. Each cluster is distilled
// from a mix of taste components (the first three are literally one image + one
// phrase + one palette), and flattens into a glass pane showing one staged
// "generated" image. order 0..3 → quadrants TL, TR, BL, BR.
// ---------------------------------------------------------------------------

export interface MoodSubset {
  id: string
  /** 0..3 → TL, TR, BL, BR. */
  order: number
  label: string
  /** Short descriptor shown under the label — names the taste components fed in. */
  caption: string
  /** Rim/core glow + pane accent. */
  accent: string
  /** Glass tint / inner particles (3 colors). */
  palette: string[]
  /** The taste references (mixed types) this direction is distilled from. */
  members: string[]
  /** The staged result image to drop in (see filenames below). */
  resultSrc: string
  /** Shown until the result image exists, so the demo never breaks. */
  fallbackSrc: string
}

export const moodSubsets: MoodSubset[] = [
  {
    id: 'architectural-cool',
    order: 0,
    label: 'Architectural Cool',
    caption: 'Concrete · “monumental restraint” · Steel Cinema',
    accent: '#9cc0ef',
    palette: ['#2D3033', '#777B7F', '#A6B0B8'],
    members: ['user-concrete-corridor', 'text-monumental-restraint', 'palette-steel-cinema'],
    resultSrc: '/assets/moodio-architectural-cool.jpg',
    fallbackSrc: '/assets/user-concrete-corridor.jpg',
  },
  {
    id: 'rain-noir',
    order: 1,
    label: 'Rain-Noir',
    caption: 'Rain City · “dreamy but controlled” · Quiet Earth',
    accent: '#7c93a3',
    palette: ['#071018', '#1A2B36', '#60717D'],
    members: ['user-rain-city', 'text-dreamy-controlled', 'palette-quiet-earth'],
    resultSrc: '/assets/moodio-rain-noir.jpg',
    fallbackSrc: '/assets/user-rain-city.jpg',
  },
  {
    id: 'neon-pulse',
    order: 2,
    label: 'Neon Pulse',
    caption: 'Neon Diner · “retro pulse” · Neon Theater',
    accent: '#ff5a6b',
    palette: ['#08070A', '#D3193C', '#F9B21A'],
    members: ['user-neon-diner', 'text-retro-pulse', 'palette-neon-theater'],
    resultSrc: '/assets/moodio-neon-pulse.jpg',
    fallbackSrc: '/assets/user-neon-diner.jpg',
  },
  {
    id: 'naturalistic-earth',
    order: 3,
    label: 'Naturalistic Earth',
    caption: 'Desert Highway · Earth',
    accent: '#e0b878',
    palette: ['#D8B982', '#E9D8B8', '#87A8C1'],
    members: ['user-desert-highway', 'user-earth'],
    resultSrc: '/assets/moodio-naturalistic-earth.jpg',
    fallbackSrc: '/assets/user-desert-highway.jpg',
  },
]

/**
 * Suggested prompt — deliberately vague ("...a road that showcases the
 * environment") so the open-endedness is the point: the user's taste is what
 * fills in each of the 4 directions. The staged result is the same regardless
 * of what's actually typed.
 */
export const CHAT_PLACEHOLDER = 'aesthetic shot of a road that showcases the environment'

/** Seed the FULL profile on entering chat: every image, text, and palette. */
export const CHAT_SEED_ASSET_IDS = [...userImageAssets, ...textAssets, ...paletteAssets].map((a) => a.id)
