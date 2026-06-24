// Hardcoded taste data. No embeddings, no backend.
// Coordinates live in a hidden 3D "taste space":
//   X: Naturalistic (-) <-> Stylized (+)
//   Y: Intimate (-)      <-> Monumental (+)
//   Z: Restrained (-)    <-> Electric (+)

export type Vec3 = { x: number; y: number; z: number }

export type AssetType = 'image' | 'text' | 'palette'

export type ProfileId = 'user' | 'nolan' | 'tarantino'

export interface Asset {
  id: string
  type: AssetType
  label: string
  tags: string[]
  position: Vec3
  palette: string[]
  strength: number
  /** Owning profile, used for anchor asset tiles + unfold/compare glows. */
  owner: ProfileId
  /** Image source (image assets only). */
  src?: string
}

export interface Profile {
  id: ProfileId
  label: string
  position: Vec3
  palette: string[]
  /** Asset ids that compose this profile. */
  assets: string[]
}

// ---------------------------------------------------------------------------
// Anchor profiles
// ---------------------------------------------------------------------------

export const nolanProfile: Profile = {
  id: 'nolan',
  label: 'Nolan',
  position: { x: -0.28, y: 0.78, z: -0.58 },
  palette: ['#07090D', '#1C2B36', '#6D7882', '#C8A86A', '#E8E2D6'],
  assets: ['nolan-inception', 'nolan-interstellar', 'nolan-dunkirk', 'nolan-dark-knight'],
}

export const tarantinoProfile: Profile = {
  id: 'tarantino',
  label: 'Tarantino',
  position: { x: 0.62, y: -0.18, z: 0.72 },
  palette: ['#0A0807', '#B11218', '#E0A326', '#F2E4C8', '#F05A28'],
  assets: [
    'tarantino-pulp-fiction',
    'tarantino-once-upon-a-time',
    'tarantino-reservoir-dogs',
    'tarantino-inglourious-basterds',
  ],
}

export const userProfileInitial: Profile = {
  id: 'user',
  label: 'You',
  position: { x: 0.0, y: 0.0, z: 0.0 },
  palette: ['#F4F1EA', '#DDE5EE', '#BFC7D2', '#2F343B', '#FFFFFF'],
  assets: [],
}

// ---------------------------------------------------------------------------
// Nolan anchor assets (clustered around the Nolan profile center)
// ---------------------------------------------------------------------------

export const nolanAssets: Asset[] = [
  {
    id: 'nolan-inception',
    type: 'image',
    owner: 'nolan',
    src: '/assets/nolan-inception.jpg',
    label: 'Inception',
    tags: ['corridor', 'architecture', 'surreal', 'controlled', 'geometric'],
    position: { x: -0.42, y: 0.66, z: -0.5 },
    palette: ['#23262B', '#3A4754', '#6D7882', '#C8A86A', '#E8E2D6'],
    strength: 0.95,
  },
  {
    id: 'nolan-interstellar',
    type: 'image',
    owner: 'nolan',
    src: '/assets/nolan-interstellar.jpg',
    label: 'Interstellar',
    tags: ['cosmic', 'monumental', 'awe', 'scale', 'darkness'],
    position: { x: -0.12, y: 0.96, z: -0.68 },
    palette: ['#02040A', '#0B1430', '#C8862A', '#E9F0FF', '#1C2B36'],
    strength: 1.0,
  },
  {
    id: 'nolan-dunkirk',
    type: 'image',
    owner: 'nolan',
    src: '/assets/nolan-dunkirk.jpg',
    label: 'Dunkirk',
    tags: ['historical', 'coastline', 'tension', 'realism', 'scale'],
    position: { x: -0.46, y: 0.64, z: -0.7 },
    palette: ['#C9B98F', '#8A98A4', '#2A3A4A', '#A9B6C4', '#5A5246'],
    strength: 0.85,
  },
  {
    id: 'nolan-dark-knight',
    type: 'image',
    owner: 'nolan',
    src: '/assets/nolan-dark-knight.jpg',
    label: 'The Dark Knight',
    tags: ['urban', 'night', 'vertical', 'heroic', 'surveillance'],
    position: { x: -0.16, y: 0.88, z: -0.44 },
    palette: ['#07090D', '#22323F', '#C8862A', '#3A4754', '#6D7882'],
    strength: 0.9,
  },
]

// ---------------------------------------------------------------------------
// Tarantino anchor assets (clustered around the Tarantino profile center)
// ---------------------------------------------------------------------------

export const tarantinoAssets: Asset[] = [
  {
    id: 'tarantino-pulp-fiction',
    type: 'image',
    owner: 'tarantino',
    src: '/assets/tarantino-pulp-fiction.jpg',
    label: 'Pulp Fiction',
    tags: ['retro', 'dance', 'theatrical', 'human', 'iconic'],
    position: { x: 0.5, y: -0.06, z: 0.6 },
    palette: ['#0A0807', '#F2E4C8', '#D88A5A', '#B11218', '#1A1410'],
    strength: 0.95,
  },
  {
    id: 'tarantino-once-upon-a-time',
    type: 'image',
    owner: 'tarantino',
    src: '/assets/tarantino-once-upon-a-time.jpg',
    label: 'Once Upon a Time in Hollywood',
    tags: ['neon', 'la', 'nostalgia', 'cinema', 'retro'],
    position: { x: 0.74, y: -0.1, z: 0.84 },
    palette: ['#0A0807', '#D3193C', '#E0A326', '#F05A28', '#1A0E08'],
    strength: 1.0,
  },
  {
    id: 'tarantino-reservoir-dogs',
    type: 'image',
    owner: 'tarantino',
    src: '/assets/tarantino-reservoir-dogs.jpeg',
    label: 'Reservoir Dogs',
    tags: ['suits', 'attitude', 'lineup', 'minimal', 'cool'],
    position: { x: 0.5, y: -0.34, z: 0.66 },
    palette: ['#0A0807', '#E8E2D6', '#5A5C5E', '#C9A06A', '#2A2622'],
    strength: 0.85,
  },
  {
    id: 'tarantino-inglourious-basterds',
    type: 'image',
    owner: 'tarantino',
    src: '/assets/tarantino-inglourious-basterds.jpg',
    label: 'Inglourious Basterds',
    tags: ['fire', 'theater', 'violence', 'spectacle', 'revenge'],
    position: { x: 0.78, y: -0.28, z: 0.82 },
    palette: ['#F05A28', '#B11218', '#0A0807', '#E0A326', '#1A0E08'],
    strength: 0.95,
  },
]

// ---------------------------------------------------------------------------
// User-draggable assets (images + text + palette)
// ---------------------------------------------------------------------------

export const userImageAssets: Asset[] = [
  {
    id: 'user-rain-city',
    type: 'image',
    owner: 'user',
    src: '/assets/user-rain-city.jpg',
    label: 'Rain City',
    tags: ['rain', 'city', 'cold', 'noir', 'reflective'],
    position: { x: -0.32, y: 0.38, z: -0.46 },
    palette: ['#071018', '#1A2B36', '#60717D', '#B8894A', '#D7D9D6'],
    strength: 0.9,
  },
  {
    id: 'user-concrete-corridor',
    type: 'image',
    owner: 'user',
    src: '/assets/user-concrete-corridor.jpg',
    label: 'Concrete Corridor',
    tags: ['concrete', 'corridor', 'geometry', 'empty', 'architectural'],
    position: { x: -0.22, y: 0.62, z: -0.62 },
    palette: ['#2D3033', '#777B7F', '#C7C5BE', '#E8E4DA', '#A6B0B8'],
    strength: 1.0,
  },
  {
    id: 'user-neon-diner',
    type: 'image',
    owner: 'user',
    src: '/assets/user-neon-diner.jpg',
    label: 'Neon Diner',
    tags: ['neon', 'diner', 'retro', 'saturated', 'nightlife'],
    position: { x: 0.58, y: -0.22, z: 0.7 },
    palette: ['#08070A', '#D3193C', '#00B8D9', '#F9B21A', '#C13BFF'],
    strength: 1.0,
  },
  {
    id: 'user-desert-highway',
    type: 'image',
    owner: 'user',
    src: '/assets/user-desert-highway.jpg',
    label: 'Desert Highway',
    tags: ['desert', 'road', 'horizon', 'solitude', 'sun'],
    position: { x: -0.18, y: 0.18, z: -0.22 },
    palette: ['#D8B982', '#E9D8B8', '#87A8C1', '#4A4A43', '#F3E8D1'],
    strength: 0.75,
  },
  {
    id: 'user-earth',
    type: 'image',
    owner: 'user',
    src: '/assets/user-earth.jpg',
    label: 'Earth',
    tags: ['earth', 'scale', 'atmosphere', 'blue', 'awe'],
    position: { x: -0.1, y: 0.82, z: -0.34 },
    palette: ['#02040A', '#0B2F64', '#2F80D1', '#E9F4FF', '#AAB8C8'],
    strength: 0.85,
  },
]

export const textAssets: Asset[] = [
  {
    id: 'text-dreamy-controlled',
    type: 'text',
    owner: 'user',
    label: 'dreamy but controlled',
    tags: ['dreamlike', 'controlled', 'soft'],
    position: { x: 0.02, y: 0.34, z: -0.42 },
    palette: ['#D8D2FF', '#9AA8FF', '#F5F1FF'],
    strength: 0.55,
  },
  {
    id: 'text-monumental-restraint',
    type: 'text',
    owner: 'user',
    label: 'monumental restraint',
    tags: ['monumental', 'restrained', 'scale'],
    position: { x: -0.22, y: 0.78, z: -0.66 },
    palette: ['#1C2B36', '#6D7882', '#E8E2D6'],
    strength: 0.65,
  },
  {
    id: 'text-retro-pulse',
    type: 'text',
    owner: 'user',
    label: 'retro pulse',
    tags: ['retro', 'saturated', 'kinetic'],
    position: { x: 0.62, y: -0.1, z: 0.76 },
    palette: ['#B11218', '#E0A326', '#F2E4C8'],
    strength: 0.65,
  },
]

export const paletteAssets: Asset[] = [
  {
    id: 'palette-steel-cinema',
    type: 'palette',
    owner: 'user',
    label: 'Steel Cinema',
    palette: ['#07090D', '#1C2B36', '#6D7882', '#C8A86A', '#E8E2D6'],
    tags: ['cold', 'cinematic', 'restrained'],
    position: { x: -0.24, y: 0.55, z: -0.54 },
    strength: 0.35,
  },
  {
    id: 'palette-neon-theater',
    type: 'palette',
    owner: 'user',
    label: 'Neon Theater',
    palette: ['#0A0807', '#B11218', '#E0A326', '#F2E4C8', '#F05A28'],
    tags: ['warm', 'retro', 'saturated'],
    position: { x: 0.5, y: -0.12, z: 0.6 },
    strength: 0.35,
  },
  {
    id: 'palette-quiet-earth',
    type: 'palette',
    owner: 'user',
    label: 'Quiet Earth',
    palette: ['#02040A', '#0B2F64', '#E9F4FF', '#D8B982', '#E9D8B8'],
    tags: ['blue', 'vast', 'quiet'],
    position: { x: -0.12, y: 0.62, z: -0.36 },
    strength: 0.3,
  },
]

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** Everything the user can drag into their lens, in tray order. */
export const trayAssets: Asset[] = [...userImageAssets, ...textAssets, ...paletteAssets]

export const anchorAssets: Asset[] = [...nolanAssets, ...tarantinoAssets]

export const allAssets: Asset[] = [...trayAssets, ...anchorAssets]

const assetMap: Record<string, Asset> = Object.fromEntries(allAssets.map((a) => [a.id, a]))

export function getAsset(id: string): Asset {
  const a = assetMap[id]
  if (!a) throw new Error(`Unknown asset id: ${id}`)
  return a
}

export const anchorProfiles: Profile[] = [nolanProfile, tarantinoProfile]
