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

/**
 * Minimum taste-space distance the user lens keeps from each anchor center.
 * ~0.7 → ~3.5 world units between centers, so the (large) user lens approaches
 * Nolan/Tarantino but always stays visibly *in front of* it, never merging in.
 */
const ANCHOR_KEEPOUT = 0.7

/**
 * Push a user-lens taste position out of any anchor's keep-out sphere so the
 * lens moves *toward* an anchor but never *into* it (which made it impossible to
 * tell where "you" is). This only affects the rendered position — similarity is
 * still computed from the true, unclamped position, so affinity still reads high
 * for an aligned taste.
 */
export function clampAwayFromAnchors(p: Vec3): Vec3 {
  let out = p
  for (const anchor of [nolanProfile.position, tarantinoProfile.position]) {
    const dx = out.x - anchor.x
    const dy = out.y - anchor.y
    const dz = out.z - anchor.z
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d >= ANCHOR_KEEPOUT) continue
    // direction away from the anchor; if essentially coincident, fall back to
    // the direction from the anchor toward the neutral origin.
    let nx: number, ny: number, nz: number
    if (d > 1e-3) {
      nx = dx / d
      ny = dy / d
      nz = dz / d
    } else {
      const al = Math.hypot(anchor.x, anchor.y, anchor.z) || 1
      nx = -anchor.x / al
      ny = -anchor.y / al
      nz = -anchor.z / al
    }
    out = {
      x: anchor.x + nx * ANCHOR_KEEPOUT,
      y: anchor.y + ny * ANCHOR_KEEPOUT,
      z: anchor.z + nz * ANCHOR_KEEPOUT,
    }
  }
  return out
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

// NOTE: the live lens no longer renders a separate "split lobe" — it always
// stays one unified body. These warm/cool cluster centers are kept as the
// seed for the future "generate" flow, where the profile cleaves into taste
// sub-bubbles (each meshing with a prompt to produce an image option).

/** Center (taste-space) of the warm, Tarantino-leaning cluster, if any. */
export function computeWarmLobeCenter(activeAssets: Asset[]): Vec3 | null {
  const warm = activeAssets.filter(isTarantinoLike)
  if (warm.length === 0) return null
  return computeProfilePosition(warm)
}

/** Center (taste-space) of the cool, non-warm cluster, if any. */
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
  /** True weighted-average taste position (used for similarity). */
  position: Vec3
  /** Render position: clamped out of anchor keep-out spheres so the lens never
   *  visually merges into Nolan/Tarantino. Use this for placing the lens. */
  displayPosition: Vec3
}

export function deriveUserProfile(activeAssetIds: string[]): DerivedUserProfile {
  const activeAssets = activeAssetIds.map(getAsset)
  const tags = Array.from(new Set(activeAssets.flatMap((a) => a.tags)))
  const position = computeProfilePosition(activeAssets)
  return {
    ...userProfileInitial,
    position,
    displayPosition: clampAwayFromAnchors(position),
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

export function microLabelFor(assetId: string, _causedSplit: boolean): string {
  // Note: we no longer surface a special "split" word — the lens stays one
  // unified body. Taste sub-clusters are reserved for the (future) generate
  // flow, where the profile cleaves into sub-bubbles per prompt.
  return LABEL_BY_ASSET[assetId] ?? getAsset(assetId).label.toLowerCase()
}
