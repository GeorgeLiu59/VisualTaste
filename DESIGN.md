# Design Doc: Visual Taste Demo

## 0. Concept

Build a modern, Apple-style web demo that visualizes a multimodal taste profile as a living glass object shaped by references.

The demo should be elegant, spatial, intuitive, and almost entirely visual.

The user sees three floating taste lenses:

1. **You**
2. **Nolan**
3. **Tarantino**

Each lens is a translucent material object. It is shaped by image references, text references, and palette references. As the user adds or removes assets, their lens bends, recolors, shifts position, and overlaps more or less with the Nolan and Tarantino lenses.

The core idea:

**Taste is a material shaped by references.**

No real embeddings are needed. Everything can be hardcoded.

---

# 1. Desired Feeling

The demo should feel like:

* Apple Vision Pro spatial UI
* A high-end design museum installation
* A living moodboard
* A tactile glass material system
* A cinematic taste map

It should not feel like:

* A dashboard
* A graphing tool
* A recommender system UI
* A sci-fi universe map
* A technical ML demo
* A Figma clone
* A SaaS analytics product

The experience should feel calm, expensive, fluid, and inevitable.

---

# 2. Visual Metaphor

## Visual Taste

A taste profile is represented as a floating glass lens.

The lens is:

* Translucent
* Slightly curved
* Softly reflective
* Palette-tinted
* Morphing
* Spatial
* Sensitive to reference objects around it

The lens is not a circle, not a blob, and not a chart point. It should look like a piece of living glass or liquid crystal suspended in space.

## Meaning of the Lens

The lens represents the user’s current taste profile.

Its properties communicate meaning visually:

| Taste Concept                   | Visual Representation                              |
| ------------------------------- | -------------------------------------------------- |
| Current taste center            | Lens position                                      |
| Taste coherence                 | Smoothness of lens shape                           |
| Taste diversity                 | Multiple lobes or protrusions                      |
| Image influence                 | Image tile pulling/bending the lens                |
| Text influence                  | Engraved phrase strip warping the lens             |
| Palette influence               | Color wash inside the glass                        |
| Strong contribution             | Larger tile, brighter influence curve              |
| Weak contribution               | Smaller tile, faint influence curve                |
| Similarity to another profile   | Lens overlap                                       |
| Difference from another profile | Non-overlapping protrusions                        |
| Taste history                   | Faint ghost silhouettes of previous lens positions |

---

# 3. Main Screen

## Layout

The app is a single full-screen spatial canvas.

There should be very little visible chrome.

### Center

A large 3D or pseudo-3D scene containing the taste lenses.

### Bottom

A floating reference tray containing available assets.

### Top Left

Tiny title:

**Visual Taste**

### Top Right

Three small mode controls:

* Build
* Compare
* Unfold

These should be minimal and optional.

No sidebars by default.

No large explanatory panels.

---

# 4. Environment Design

Use a clean spatial studio environment.

## Background

Recommended background:

* Warm off-white, soft gray, or deep graphite
* Very subtle gradient
* Gentle vignette
* Soft studio shadows
* Optional grain
* No stars
* No grid unless extremely subtle
* No sci-fi HUD elements

Two acceptable themes:

### Light Theme

* Background: #F4F1EA / #ECE8DF
* Glass lenses: pearl, smoke, blue-gray
* Shadows: soft and diffuse
* Mood: Apple keynote / museum installation

### Dark Theme

* Background: #090A0D / #111318
* Glass lenses: luminous but restrained
* Bloom: subtle
* Mood: cinematic premium product demo

Recommendation: use the **light theme** if you want it to feel more Apple and less sci-fi.

---

# 5. Profile Objects

There are three main profiles.

## 5.1 User Lens

Initial appearance:

* Small
* Pale
* Mostly transparent
* Smooth
* Unformed
* Center of scene
* Slight blue-gray tint

As assets are added:

* Lens grows
* Lens bends toward added references
* Palette tint becomes stronger
* Image tiles attach around the surface
* Text strips embed into the material
* Influence curves become visible
* Lens moves through the canvas
* Lens may develop multiple lobes

## 5.2 Nolan Lens

Appearance:

* Large, stable, controlled
* Cool blue-gray tint
* Smooth geometry
* Strong vertical shape
* Slow, restrained motion
* High contrast image tiles
* Sparse, precise composition

Taste qualities:

* Monumental
* Restrained
* Architectural
* Practical
* Cold
* Large-scale
* Geometric

## 5.3 Tarantino Lens

Appearance:

* Warmer, more saturated
* Slightly irregular shape
* More energetic motion
* Red/yellow tint
* Stronger image contrast
* More angular protrusions
* More theatrical feeling

Taste qualities:

* Retro
* Saturated
* Theatrical
* Pulp
* Kinetic
* Human-scale
* Genre-aware

---

# 6. Existing Assets

Use the assets exactly as gathered.

## Nolan Assets

1. `nolan-inception.jpg`

   * Inception, hotel corridor
   * Tags: corridor, architecture, surreal, controlled, geometric
   * Palette: charcoal, cream, muted gold, shadow gray
   * Pull: architectural, restrained, stylized-real

2. `nolan-interstellar.jpg`

   * Interstellar, Gargantua black hole
   * Tags: cosmic, monumental, awe, scale, darkness
   * Palette: black, amber, white, deep blue
   * Pull: monumental, vast, abstract, restrained

3. `nolan-dunkirk.jpg`

   * Dunkirk, beach evacuation
   * Tags: historical, coastline, tension, realism, scale
   * Palette: sand, gray, navy, washed blue
   * Pull: naturalistic, monumental, restrained

4. `nolan-dark-knight.jpg`

   * The Dark Knight, Batman looking down over Gotham
   * Tags: urban, night, vertical, heroic, surveillance
   * Palette: black, steel blue, city amber, smoke gray
   * Pull: urban, monumental, dark, controlled

## Tarantino Assets

1. `tarantino-pulp-fiction.jpg`

   * Pulp Fiction, dance scene
   * Tags: retro, dance, theatrical, human, iconic
   * Palette: black, white, warm skin, red accent
   * Pull: stylized, intimate, kinetic

2. `tarantino-once-upon-a-time.jpg`

   * Once Upon a Time in Hollywood, neon LA cinema
   * Tags: neon, LA, nostalgia, cinema, retro
   * Palette: neon red, yellow, black, warm orange
   * Pull: retro, saturated, cinematic, electric

3. `tarantino-reservoir-dogs.jpeg`

   * Reservoir Dogs, black suits walking
   * Tags: suits, attitude, lineup, minimal, cool
   * Palette: black, white, asphalt gray, warm daylight
   * Pull: stylized, restrained, iconic

4. `tarantino-inglourious-basterds.jpg`

   * Inglourious Basterds, theater lighting up
   * Tags: fire, theater, violence, spectacle, revenge
   * Palette: flame orange, red, black, gold
   * Pull: theatrical, saturated, explosive, kinetic

## User Assets

1. `user-rain-city.jpg`

   * Tags: rain, city, cold, noir, reflective
   * Palette: dark blue, graphite, wet silver, amber
   * Pull: cold, urban, restrained, cinematic

2. `user-concrete-corridor.jpg`

   * Tags: concrete, corridor, geometry, empty, architectural
   * Palette: cement gray, off-white, shadow, muted blue
   * Pull: architectural, minimal, controlled, cold

3. `user-neon-diner.jpg`

   * Tags: neon, diner, retro, saturated, nightlife
   * Palette: red, cyan, magenta, black, chrome
   * Pull: retro, stylized, electric, warm

4. `user-desert-highway.jpg`

   * Tags: desert, road, horizon, solitude, sun
   * Palette: sand, pale blue, asphalt, warm beige
   * Pull: naturalistic, lonely, spacious, restrained

5. `user-earth.jpg`

   * Tags: earth, scale, atmosphere, blue, awe
   * Palette: deep blue, white, black, cloud gray
   * Pull: monumental, cosmic, clean, vast

---

# 7. Hidden Taste Space

Use hardcoded 3D coordinates. Do not show the user any technical details.

The internal axes are:

## X: Naturalistic ↔ Stylized

* Negative X: naturalistic, grounded, realistic
* Positive X: stylized, theatrical, graphic

## Y: Intimate ↔ Monumental

* Negative Y: intimate, human-scale, close
* Positive Y: monumental, vast, architectural

## Z: Restrained ↔ Electric

* Negative Z: quiet, minimal, controlled
* Positive Z: kinetic, saturated, explosive

Do not draw visible axes unless absolutely necessary. If used, show only faint edge labels:

* Natural
* Stylized
* Intimate
* Monumental
* Quiet
* Electric

---

# 8. Hardcoded Coordinates

Use these approximate positions.

## Nolan Profile

```js
const nolanProfile = {
  id: "nolan",
  label: "Nolan",
  position: { x: -0.28, y: 0.78, z: -0.58 },
  palette: ["#07090D", "#1C2B36", "#6D7882", "#C8A86A", "#E8E2D6"],
  assets: [
    "nolan-inception",
    "nolan-interstellar",
    "nolan-dunkirk",
    "nolan-dark-knight"
  ]
};
```

## Tarantino Profile

```js
const tarantinoProfile = {
  id: "tarantino",
  label: "Tarantino",
  position: { x: 0.62, y: -0.18, z: 0.72 },
  palette: ["#0A0807", "#B11218", "#E0A326", "#F2E4C8", "#F05A28"],
  assets: [
    "tarantino-pulp-fiction",
    "tarantino-once-upon-a-time",
    "tarantino-reservoir-dogs",
    "tarantino-inglourious-basterds"
  ]
};
```

## User Initial Profile

```js
const userProfileInitial = {
  id: "user",
  label: "You",
  position: { x: 0.0, y: 0.0, z: 0.0 },
  palette: ["#F4F1EA", "#DDE5EE", "#BFC7D2", "#2F343B", "#FFFFFF"],
  assets: []
};
```

## User Asset Coordinates

```js
const userAssets = [
  {
    id: "user-rain-city",
    type: "image",
    src: "/assets/user-rain-city.jpg",
    label: "Rain City",
    tags: ["rain", "city", "cold", "noir", "reflective"],
    position: { x: -0.32, y: 0.38, z: -0.46 },
    palette: ["#071018", "#1A2B36", "#60717D", "#B8894A", "#D7D9D6"],
    strength: 0.9
  },
  {
    id: "user-concrete-corridor",
    type: "image",
    src: "/assets/user-concrete-corridor.jpg",
    label: "Concrete Corridor",
    tags: ["concrete", "corridor", "geometry", "empty", "architectural"],
    position: { x: -0.22, y: 0.62, z: -0.62 },
    palette: ["#2D3033", "#777B7F", "#C7C5BE", "#E8E4DA", "#A6B0B8"],
    strength: 1.0
  },
  {
    id: "user-neon-diner",
    type: "image",
    src: "/assets/user-neon-diner.jpg",
    label: "Neon Diner",
    tags: ["neon", "diner", "retro", "saturated", "nightlife"],
    position: { x: 0.58, y: -0.22, z: 0.70 },
    palette: ["#08070A", "#D3193C", "#00B8D9", "#F9B21A", "#C13BFF"],
    strength: 1.0
  },
  {
    id: "user-desert-highway",
    type: "image",
    src: "/assets/user-desert-highway.jpg",
    label: "Desert Highway",
    tags: ["desert", "road", "horizon", "solitude", "sun"],
    position: { x: -0.18, y: 0.18, z: -0.22 },
    palette: ["#D8B982", "#E9D8B8", "#87A8C1", "#4A4A43", "#F3E8D1"],
    strength: 0.75
  },
  {
    id: "user-earth",
    type: "image",
    src: "/assets/user-earth.jpg",
    label: "Earth",
    tags: ["earth", "scale", "atmosphere", "blue", "awe"],
    position: { x: -0.10, y: 0.82, z: -0.34 },
    palette: ["#02040A", "#0B2F64", "#2F80D1", "#E9F4FF", "#AAB8C8"],
    strength: 0.85
  }
];
```

---

# 9. Additional Non-Image Assets

Since the user currently has image assets, add a small hardcoded set of text and palette assets to demonstrate multimodality.

## Text Assets

```js
const textAssets = [
  {
    id: "text-dreamy-controlled",
    type: "text",
    label: "dreamy but controlled",
    tags: ["dreamlike", "controlled", "soft"],
    position: { x: 0.02, y: 0.34, z: -0.42 },
    palette: ["#D8D2FF", "#9AA8FF", "#F5F1FF"],
    strength: 0.55
  },
  {
    id: "text-monumental-restraint",
    type: "text",
    label: "monumental restraint",
    tags: ["monumental", "restrained", "scale"],
    position: { x: -0.22, y: 0.78, z: -0.66 },
    palette: ["#1C2B36", "#6D7882", "#E8E2D6"],
    strength: 0.65
  },
  {
    id: "text-retro-pulse",
    type: "text",
    label: "retro pulse",
    tags: ["retro", "saturated", "kinetic"],
    position: { x: 0.62, y: -0.10, z: 0.76 },
    palette: ["#B11218", "#E0A326", "#F2E4C8"],
    strength: 0.65
  }
];
```

## Palette Assets

```js
const paletteAssets = [
  {
    id: "palette-steel-cinema",
    type: "palette",
    label: "Steel Cinema",
    palette: ["#07090D", "#1C2B36", "#6D7882", "#C8A86A", "#E8E2D6"],
    tags: ["cold", "cinematic", "restrained"],
    position: { x: -0.24, y: 0.55, z: -0.54 },
    strength: 0.35
  },
  {
    id: "palette-neon-theater",
    type: "palette",
    label: "Neon Theater",
    palette: ["#0A0807", "#B11218", "#E0A326", "#F2E4C8", "#F05A28"],
    tags: ["warm", "retro", "saturated"],
    position: { x: 0.50, y: -0.12, z: 0.60 },
    strength: 0.35
  },
  {
    id: "palette-quiet-earth",
    type: "palette",
    label: "Quiet Earth",
    palette: ["#02040A", "#0B2F64", "#E9F4FF", "#D8B982", "#E9D8B8"],
    tags: ["blue", "vast", "quiet"],
    position: { x: -0.12, y: 0.62, z: -0.36 },
    strength: 0.3
  }
];
```

---

# 10. Visual Treatment of Assets

## Image Assets

Image assets are large, beautiful, and primary.

In the tray:

* Rectangular image cards
* Rounded corners
* Subtle glass border
* Slight parallax
* No captions by default
* On hover, show only the title

After entering the lens:

* Become smaller floating tiles
* Attach near lens surface
* Maintain image visibility
* Connect to the lens core with a thin influence curve
* Larger if stronger

## Text Assets

In the tray:

* Minimal pill-shaped phrase chips
* Soft translucent material
* Light blur
* Text is the asset, so it can be visible

After entering the lens:

* Becomes an engraved strip inside the glass
* Curves along the lens surface
* Subtly warps the lens
* Emits a faint violet/blue influence line

## Palette Assets

In the tray:

* Horizontal 5-color strips
* No title unless hovered
* Rounded capsule form

After entering the lens:

* Melts into the lens surface
* Tints the glass material
* Emits small liquid color particles
* Slightly shifts the lens position
* Strongly affects overlap color with anchors

---

# 11. Interaction Design

## 11.1 Drag Asset Into User Lens

This is the core interaction.

Animation sequence:

1. Asset lifts from tray.
2. Background subtly blurs.
3. User lens brightens and opens slightly.
4. A preview curve appears from asset to lens.
5. A ghost version of the future lens position appears.
6. User drops asset.
7. Asset is absorbed into lens.
8. Lens ripples.
9. Influence curve appears.
10. Lens moves toward the asset’s hardcoded coordinate.
11. Lens material updates with asset palette.
12. Overlap with Nolan/Tarantino updates.

No explanatory panel.

Only tiny labels may appear:

* cold
* architectural
* retro
* electric
* monumental

## 11.2 Remove Asset

User drags an attached asset away from the lens.

Animation:

1. Asset detaches.
2. Influence curve stretches.
3. Curve snaps.
4. Lens contracts.
5. Color slightly drains if the asset contributed palette.
6. Lens moves away from the removed asset’s coordinate.

## 11.3 Hover Asset

Hovering an asset shows contribution.

Visual effects:

* Asset enlarges.
* Other assets dim.
* Its influence curve brightens.
* Lens bends slightly toward it.
* A small pull vector appears.
* Relevant anchor overlap brightens.

Example:

Hover `user-concrete-corridor.jpg`:

* User lens bends toward Nolan lens.
* Nolan overlap glows cool blue.
* Tarantino overlap dims.

Hover `user-neon-diner.jpg`:

* User lens bends toward Tarantino lens.
* Tarantino overlap glows red/yellow.
* Nolan overlap becomes less visible.

## 11.4 Compare Mode

Compare mode brings two lenses close together.

Interaction:

* User selects Nolan or Tarantino.
* The selected anchor lens glides closer to the user lens.
* Overlap region becomes visible.
* Shared assets or similar aesthetic regions glow.
* Non-overlapping protrusions remain visible.

Similarity is shown by overlap, not by explanation.

Optional tiny number:

* `74`

Keep this number small and secondary.

## 11.5 Unfold Mode

Clicking the user lens unfolds the taste profile.

Animation:

1. Lens flattens into a glass disc.
2. Image tiles fan out around it.
3. Text strips align along arcs.
4. Palette strips become translucent color bands.
5. Influence curves become fully visible.
6. Strong assets sit closer to center and appear larger.
7. Weak assets sit farther and appear smaller.

This mode shows what goes into the taste profile without a text dashboard.

Click again to fold back.

---

# 12. Comparison Visualization

## Lens Overlap

Similarity should be represented through physical overlap.

When profiles are similar:

* Lenses overlap more
* Shared region is bright and smooth
* Shared colors blend cleanly
* Image tiles near the overlap glow
* Influence curves align

When profiles are different:

* Lenses barely overlap
* Edges repel or distort
* Shared region is small
* Colors do not blend
* Non-overlapping protrusions remain visible

## Nolan Comparison

When user adds:

* `user-rain-city.jpg`
* `user-concrete-corridor.jpg`
* `user-earth.jpg`
* `text-monumental-restraint`
* `palette-steel-cinema`

Then:

* User lens moves closer to Nolan
* Cool overlap forms
* Blue-gray tint intensifies
* Lens becomes smoother and more vertical
* Concrete corridor and Nolan Inception corridor glow together
* Earth and Interstellar glow together

## Tarantino Comparison

When user adds:

* `user-neon-diner.jpg`
* `text-retro-pulse`
* `palette-neon-theater`

Then:

* User lens stretches toward Tarantino
* Warm overlap forms
* Red/yellow tint enters lens
* A second lobe appears
* Neon diner and Once Upon a Time in Hollywood glow together
* Lens becomes more energetic

## Mixed Taste

If the user adds both Nolan-like and Tarantino-like references:

* User lens becomes two-lobed
* Cool lobe overlaps Nolan
* Warm lobe overlaps Tarantino
* The central glass region shows a blended tension
* This is the most important demo moment

The viewer should understand:

**One person can have multiple aesthetic clusters inside one taste profile.**

---

# 13. Minimal Text Policy

Use very little text.

## Visible Text Allowed

* Visual Taste
* You
* Nolan
* Tarantino
* Build
* Compare
* Unfold
* Asset titles on hover
* One or two word labels
* Tiny similarity numbers

## Avoid

* Paragraphs
* Explanations
* Formula language
* Technical language
* Dense panels
* Long descriptions
* Visible coordinates
* Full tag lists

## Preferred Micro Labels

Use only labels like:

* cold
* vast
* restrained
* retro
* electric
* architectural
* human
* theatrical
* quiet
* saturated
* monumental
* intimate

Labels should appear only on hover or during transition, then fade.

---

# 14. Motion Language

The motion should feel like Apple spatial UI.

## Motion Qualities

Use:

* Gentle inertia
* Soft morphs
* Slow glass bending
* Smooth overlap
* Magnetic attraction
* Liquid color diffusion
* Elegant unfolding
* No hard cuts

Avoid:

* Bouncy animations
* Confetti
* Cartoon effects
* Aggressive camera movement
* Dashboard transitions
* Busy particle spam

## Timing

Suggested durations:

* Asset lift: 0.25s
* Drag preview: realtime
* Asset absorption: 0.8s
* Lens ripple: 1.0s
* Lens movement: 1.4s
* Palette diffusion: 2.0s
* Comparison overlap: 1.2s
* Unfold mode: 1.0s
* Fold back: 0.9s
* Remove asset: 0.8s

---

# 15. Rendering Approach

## Recommended Stack

* Next.js or Vite
* React
* React Three Fiber
* Three.js
* Drei
* Framer Motion
* Zustand
* Tailwind for minimal UI
* postprocessing for bloom / depth-of-field if using dark theme

## Visual Taste Rendering

### MVP Method

Use layered translucent meshes:

* Main rounded ellipsoid
* 2 to 4 secondary lobes
* Transparent material
* MeshPhysicalMaterial with transmission/roughness
* Animated displacement/noise
* Palette gradient via shader or multiple translucent layers

### Better Method

Use custom shader:

* Fresnel edge glow
* Noise displacement
* Palette gradient
* Internal color diffusion
* Pointer-based ripple on asset drop

### Practical Recommendation

Start with:

* Ellipsoid mesh
* MeshPhysicalMaterial
* Subtle vertex displacement
* Add colored transparent planes/particles inside
* Add separate lobe meshes when clusters split

This will look good faster than true metaballs.

## Image Tiles

Use plane geometry with image texture.

* Rounded rectangle via shader mask or CSS overlay in 3D
* Always slightly face camera
* Attach near lens surface
* Smooth orbit or gentle floating
* Add soft shadow behind tile

## Influence Curves

Use Bezier curves.

* Thin tube or line
* Opacity based on asset strength
* White for images
* Blue/violet for text
* Palette gradient for palette assets
* On hover, brighten and thicken

## Overlap Region

Simpler MVP:

* When comparing, move lenses physically closer.
* Render a translucent glowing shape between them.
* Color it using shared palette colors.
* Increase opacity based on similarity.

Better:

* Shader-based intersection highlight.

For MVP, fake the overlap with a soft transparent ellipse between lenses.

---

# 16. State Logic

## User Profile Position

Compute weighted average of active asset positions.

```js
function computeProfilePosition(activeAssets) {
  if (activeAssets.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const total = activeAssets.reduce((s, a) => s + a.strength, 0);

  return {
    x: activeAssets.reduce((s, a) => s + a.position.x * a.strength, 0) / total,
    y: activeAssets.reduce((s, a) => s + a.position.y * a.strength, 0) / total,
    z: activeAssets.reduce((s, a) => s + a.position.z * a.strength, 0) / total
  };
}
```

## User Palette

Use strongest and most recent colors.

```js
function computePalette(activeAssets) {
  if (activeAssets.length === 0) {
    return ["#F4F1EA", "#DDE5EE", "#BFC7D2", "#2F343B", "#FFFFFF"];
  }

  return activeAssets
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .flatMap(a => a.palette)
    .slice(0, 6);
}
```

## Lens Shape

Hardcode simple shape states.

```js
function computeLensShape(activeAssets) {
  const hasNolanLike = activeAssets.some(a =>
    a.tags.some(t => ["cold", "architectural", "monumental", "restrained"].includes(t))
  );

  const hasTarantinoLike = activeAssets.some(a =>
    a.tags.some(t => ["retro", "saturated", "theatrical", "electric"].includes(t))
  );

  if (hasNolanLike && hasTarantinoLike) return "split";
  if (activeAssets.length === 0) return "empty";
  return "coherent";
}
```

## Similarity

Use fake but consistent score.

```js
function computeSimilarity(userProfile, anchorProfile) {
  const d = distance3D(userProfile.position, anchorProfile.position);
  const positionScore = Math.max(0, 1 - d / 1.8);

  const sharedTags = jaccard(userProfile.tags, anchorProfile.tags);
  const paletteScore = paletteOverlap(userProfile.palette, anchorProfile.palette);

  return Math.round(100 * (
    0.65 * positionScore +
    0.20 * sharedTags +
    0.15 * paletteScore
  ));
}
```

Do not display how this is computed.

---

# 17. Suggested Demo Sequence

Use this sequence for the first polished walkthrough.

## Scene 1: Empty Taste

Initial screen:

* User lens small and pale
* Nolan lens to upper-left
* Tarantino lens to lower-right
* Reference tray at bottom
* Minimal title: Visual Taste

No explanation.

## Scene 2: Add `user-rain-city.jpg`

Effect:

* Image tile enters user lens
* Lens cools to blue-gray
* Lens moves slightly toward Nolan
* Thin overlap with Nolan appears
* Micro label: cold

## Scene 3: Add `user-concrete-corridor.jpg`

Effect:

* Lens bends more strongly toward Nolan
* Shape becomes smoother and more vertical
* Nolan overlap brightens
* Inception corridor and Concrete Corridor glow together
* Micro label: architectural

## Scene 4: Add `user-earth.jpg`

Effect:

* Lens gains a more monumental vertical pull
* Interstellar and Earth glow together
* Blue/black palette deepens
* Nolan overlap grows
* Micro label: vast

## Scene 5: Add `user-neon-diner.jpg`

Effect:

* Warm red/cyan color enters one side of user lens
* Lens splits into two lobes
* Tarantino overlap appears
* Once Upon a Time neon cinema and Neon Diner glow together
* Micro label: new lobe

This is the key conceptual moment.

## Scene 6: Add `text-retro-pulse`

Effect:

* Text becomes an engraved strip
* Warm lobe becomes more defined
* Tarantino overlap brightens
* Micro label: electric

## Scene 7: Add `palette-steel-cinema`

Effect:

* Cool palette melts into the main lens body
* Nolan overlap becomes smoother
* Warm lobe remains as contrast
* Micro label: palette

## Scene 8: Unfold

Click user lens.

Effect:

* Lens opens into radial exploded view
* Image tiles fan out
* Text strips arc around the center
* Palette bands become translucent rings
* Influence curves show contribution
* Strongest references are largest and closest

No panel.

The viewer sees the taste profile’s ingredients.

## Scene 9: Fold Back and Final View

Lens folds back.

Camera pulls out.

User lens sits between Nolan and Tarantino:

* Main cool architectural body
* Warm neon side lobe
* Overlaps with both anchors
* Influence curves visible
* Beautiful blended material

Final line:

**Taste, shaped by references.**

---

# 18. MVP Scope

Build only:

1. Fullscreen visual canvas
2. Three profile lenses
3. Bottom reference tray
4. Existing image assets
5. Three text chips
6. Three palette strips
7. Drag asset into user lens
8. Lens movement
9. Lens recoloring
10. Influence curves
11. Lens overlap comparison
12. Hover contribution highlight
13. Unfold mode
14. Remove asset interaction if time allows

Do not build:

* Login
* Backend
* Uploads
* Real embeddings
* Real search
* Real model calls
* Long explanation UI
* Full asset management
* Timeline unless there is extra time

---

# 19. Acceptance Criteria

The demo is successful if:

1. The first frame looks beautiful.
2. It is obvious that the user lens is made of references.
3. Image, text, and palette references look visually different.
4. Adding an asset changes the user lens immediately.
5. The user lens visibly moves toward Nolan or Tarantino.
6. Similarity is understood through overlap, not text.
7. Contribution is understood through influence curves and bending.
8. Adding Neon Diner after Nolan-like assets creates a visible second lobe.
9. The unfold mode clearly shows what goes into the profile.
10. The demo uses almost no explanatory text.

The highest bar:

Someone watching should understand the idea before anyone says the word “embedding.”

---

# 20. Final UI Copy

Use only these text moments.

Opening:

**Visual Taste**

During interaction:

* cold
* architectural
* vast
* electric
* palette
* new lobe

Profile labels:

* You
* Nolan
* Tarantino

Modes:

* Build
* Compare
* Unfold

Final:

**Taste, shaped by references.**
