import {
  type Asset,
  type Profile,
  type Vec3,
  getAsset,
  nolanProfile,
  tarantinoProfile,
  userProfileInitial,
} from '../data/tasteData'

// ---------------------------------------------------------------------------
// Taste-space <-> world-space
// ---------------------------------------------------------------------------

/** Taste-space coords are ~[-1, 1]; scale them out into the studio void. */
export const WORLD_SCALE = 5.0

export function toWorld(p: Vec3): [number, number, number] {
  return [p.x * WORLD_SCALE, p.y * WORLD_SCALE, p.z * WORLD_SCALE]
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}

export function distance3D(a: Vec3, b: Vec3) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function jaccard(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let inter = 0
  setA.forEach((t) => {
    if (setB.has(t)) inter++
  })
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function paletteOverlap(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0
  let score = 0
  let count = 0
  for (const ca of a) {
    const [r1, g1, b1] = hexToRgb(ca)
    let best = 0
    for (const cb of b) {
      const [r2, g2, b2] = hexToRgb(cb)
      const d = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
      best = Math.max(best, 1 - d / 441.67) // 441.67 = max rgb distance
    }
    score += best
    count++
  }
  return count === 0 ? 0 : score / count
}

// ---------------------------------------------------------------------------
// Profile derivations
// ---------------------------------------------------------------------------

export const DEFAULT_PALETTE = userProfileInitial.palette

export function computeProfilePosition(activeAssets: Asset[]): Vec3 {
  if (activeAssets.length === 0) return { x: 0, y: 0, z: 0 }
  const total = activeAssets.reduce((s, a) => s + a.strength, 0)
  return {
    x: activeAssets.reduce((s, a) => s + a.position.x * a.strength, 0) / total,
    y: activeAssets.reduce((s, a) => s + a.position.y * a.strength, 0) / total,
    z: activeAssets.reduce((s, a) => s + a.position.z * a.strength, 0) / total,
  }
}

export function computePalette(activeAssets: Asset[]): string[] {
  if (activeAssets.length === 0) return DEFAULT_PALETTE
  const blended = activeAssets
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .flatMap((a) => a.palette)
  // de-dupe while preserving order, then keep the 6 strongest colors
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of blended) {
    const k = c.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(c)
    }
    if (out.length >= 6) break
  }
  while (out.length < 5) out.push(DEFAULT_PALETTE[out.length % DEFAULT_PALETTE.length])
  return out
}

export type LensShape = 'empty' | 'coherent' | 'split'

const NOLAN_TAGS = ['cold', 'architectural', 'monumental', 'restrained', 'controlled', 'geometry', 'scale']
const TARANTINO_TAGS = ['retro', 'saturated', 'theatrical', 'electric', 'kinetic', 'neon', 'nightlife']

export function isNolanLike(a: Asset) {
  return a.tags.some((t) => NOLAN_TAGS.includes(t))
}

export function isTarantinoLike(a: Asset) {
  return a.tags.some((t) => TARANTINO_TAGS.includes(t))
}

export function computeLensShape(activeAssets: Asset[]): LensShape {
  if (activeAssets.length === 0) return 'empty'
  const hasNolan = activeAssets.some(isNolanLike)
  const hasTarantino = activeAssets.some(isTarantinoLike)
  if (hasNolan && hasTarantino) return 'split'
  return 'coherent'
}

/** Direction (taste-space) of the warm Tarantino-leaning lobe, if any. */
export function computeWarmLobeCenter(activeAssets: Asset[]): Vec3 | null {
  const warm = activeAssets.filter(isTarantinoLike)
  if (warm.length === 0) return null
  return computeProfilePosition(warm)
}

export function computeCoolBodyCenter(activeAssets: Asset[]): Vec3 | null {
  const cool = activeAssets.filter((a) => !isTarantinoLike(a))
  if (cool.length === 0) return null
  return computeProfilePosition(cool)
}

// ---------------------------------------------------------------------------
// Live user profile
// ---------------------------------------------------------------------------

export interface DerivedUserProfile extends Profile {
  tags: string[]
  shape: LensShape
}

export function deriveUserProfile(activeAssetIds: string[]): DerivedUserProfile {
  const activeAssets = activeAssetIds.map(getAsset)
  const tags = Array.from(new Set(activeAssets.flatMap((a) => a.tags)))
  return {
    ...userProfileInitial,
    position: computeProfilePosition(activeAssets),
    palette: computePalette(activeAssets),
    assets: activeAssetIds,
    tags,
    shape: computeLensShape(activeAssets),
  }
}

// ---------------------------------------------------------------------------
// Similarity (fake but consistent)
// ---------------------------------------------------------------------------

const anchorTags: Record<string, string[]> = {
  nolan: Array.from(new Set(nolanProfile.assets.flatMap((id) => getAsset(id).tags))),
  tarantino: Array.from(new Set(tarantinoProfile.assets.flatMap((id) => getAsset(id).tags))),
}

export function computeSimilarity(user: DerivedUserProfile, anchor: Profile): number {
  if (user.assets.length === 0) return 0
  const d = distance3D(user.position, anchor.position)
  const positionScore = clamp(1 - d / 1.8)
  const sharedTags = jaccard(user.tags, anchorTags[anchor.id] ?? [])
  const paletteScore = paletteOverlap(user.palette, anchor.palette)
  return Math.round(100 * (0.65 * positionScore + 0.2 * sharedTags + 0.15 * paletteScore))
}

// ---------------------------------------------------------------------------
// Micro labels
// ---------------------------------------------------------------------------

const LABEL_BY_ASSET: Record<string, string> = {
  'user-rain-city': 'cold',
  'user-concrete-corridor': 'architectural',
  'user-earth': 'vast',
  'user-neon-diner': 'electric',
  'user-desert-highway': 'quiet',
  'text-dreamy-controlled': 'dreamy',
  'text-monumental-restraint': 'monumental',
  'text-retro-pulse': 'electric',
  'palette-steel-cinema': 'palette',
  'palette-neon-theater': 'palette',
  'palette-quiet-earth': 'palette',
}

export function microLabelFor(assetId: string, causedSplit: boolean): string {
  if (causedSplit) return 'new lobe'
  return LABEL_BY_ASSET[assetId] ?? getAsset(assetId).label.toLowerCase()
}
