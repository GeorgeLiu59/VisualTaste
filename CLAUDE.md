# CLAUDE.md

Guidance for AI agents (and humans) working in this repo. Read this first.

---

## What this is

**Visual Taste** — a spatial, nearly text-free WebGL experience that visualizes a
person's **multimodal film taste profile** as a living glass object. Three
translucent "taste lenses" float in a dark studio void:

- **You** — starts pale/unformed, grows and bends as references are added
- **Nolan** — cool, tall, architectural, restrained
- **Tarantino** — warm, saturated, theatrical, kinetic

The user drags image / text / palette references into their lens and watches it
morph, recolor, move through a hidden "taste-space," and overlap with the
anchors. There is also a cinematic auto-play walkthrough.

> Core thesis: **taste is a material shaped by references.**

There is **no backend and no embeddings** — every coordinate, palette, tag, and
pull is hardcoded in `src/data/tasteData.ts`. This is a design demo;
prioritize the experience over architectural purity.

The full original product vision lives in `DESIGN.md` (long; ~1250 lines). This
file is the practical engineering summary — consult `DESIGN.md` for intent,
copy, and the demo storyboard.

---

## Tech stack

Vite 6 · React 19 · TypeScript 5 · React Three Fiber 9 · three.js 0.175 · drei 10
· @react-three/postprocessing 3 · Zustand 5 · Framer Motion 11 · @use-gesture/react 10 · Tailwind 3.

Key dependency versions are **pinned exactly** (not `^`) for `react`,
`react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`,
`@react-three/postprocessing`, and their `@types`. This combo (R3F 9 / React 19 /
three 0.175) is fragile — **do not bump these casually.** If you must, verify the
scene still renders with zero console errors afterward.

---

## Commands

```bash
npm install
npm run dev        # vite dev server (prints local URL, usually :5173)
npm run build      # tsc --noEmit && vite build  (type-check + production build)
npm run preview    # serve the production build
```

### Visual QA scripts (`scripts/*.mjs`)

Playwright-driven screenshot/interaction harnesses used during development. They
require a running dev or preview server and write PNGs to `.preview/`
(git-ignored). They drive the app by calling the Zustand store directly via
`window.tasteStore` (exposed in `src/main.tsx`).

```bash
node scripts/orbit.mjs http://localhost:5173/   # adds refs, captures + drag-orbit
node scripts/shoot.mjs <url> <out.png> <waitMs>  # single screenshot
node scripts/tour.mjs <url>                       # multi-state tour
node scripts/walk.mjs <url>                        # walkthrough progression
node scripts/drag.mjs <url>                         # real drag-and-drop gesture
```

Notes:
- Headless Chromium uses swiftshader (`--use-gl=angle --use-angle=swiftshader`);
  rendering is slow, so scripts wait several seconds before capturing.
- Prefer `window.tasteStore.getState().<action>()` over clicking UI in tests —
  UI clicks were flaky under swiftshader.
- After any visual change, re-run `node scripts/orbit.mjs` and read the PNGs in
  `.preview/` to confirm zero console errors and the intended look.

---

## Architecture

```
src/
  main.tsx              # mounts <App/> (NO React.StrictMode — see gotchas); exposes window.tasteStore
  App.tsx               # background layers + <Scene/> + <Overlay/>
  index.css             # Tailwind + dark theme + glass utility classes

  data/tasteData.ts     # ALL hardcoded data: profiles, assets, taste-space coords
  lib/
    taste.ts            # taste-space math + profile derivation (WORLD_SCALE, toWorld, deriveUserProfile, similarity, ...)
    walkthrough.ts      # timed cinematic auto-play sequence (runWalkthrough)
  hooks/
    useDragAsset.ts     # @use-gesture drag-and-drop from tray into scene
  store/
    tasteStore.ts       # app state (active assets, mode, hover, walkthrough, ...)
    cameraStore.ts      # camera "goal" override (set imperatively, no React re-render)

  three/                # the 3D scene (R3F)
    Scene.tsx           # Canvas, lighting, EffectComposer, orchestrates everything
    Lens.tsx            # the glass lens: MeshTransmissionMaterial + custom rim/core glow shaders + inner particles
    CameraRig.tsx       # custom cinematic + orbit camera (no OrbitControls)
    ProfileAttachments.tsx / AssetAttachment.tsx / AssetVisual.tsx  # references rendered with each lens
    OverlapField.tsx    # similarity glow between lenses (compare mode)
    UnfoldView.tsx      # flattened radial "ingredients" view (unfold mode)
    AxisLabels.tsx      # faint 3D taste-space axis labels
    InfluenceCurve.tsx  # bezier connectors (used in unfold)

  ui/                   # 2D HTML/SVG overlay (Framer Motion)
    Overlay.tsx         # assembles all overlay pieces
    Title.tsx ModeControls.tsx SimilarityBadge.tsx MicroLabel.tsx
    FinalLine.tsx Hint.tsx WalkthroughControls.tsx ReferenceTray.tsx
```

### Data model (`src/data/tasteData.ts`)

Hidden 3D **taste-space**, coords roughly in `[-1, 1]`:
- **X** Naturalistic (−) ↔ Stylized (+)
- **Y** Intimate (−) ↔ Monumental (+)
- **Z** Restrained (−) ↔ Electric (+)

`toWorld()` multiplies by `WORLD_SCALE` (currently `5.0`) to place lenses in the void.

- `Profile` (`user` | `nolan` | `tarantino`): position, palette, member asset ids.
- `Asset` (`image` | `text` | `palette`): position, palette, tags, `strength`,
  `owner`, optional image `src`. Image `src` paths point at `public/assets/`.
- The **user profile is derived** from active asset ids via
  `deriveUserProfile()` in `lib/taste.ts` (weighted average of positions, palette
  blend, shape = empty / coherent / split based on Nolan-like vs Tarantino-like
  membership, warm "split lobe" when taste fractures, similarity vs anchors).

### State (`src/store/`)

- `tasteStore` — `activeAssetIds`, `hoveredAssetId`, `draggingAssetId`, `mode`
  (`build`/`compare`/`unfold`), `compareTarget`, `microLabel`, `rippleSeed`
  (one-shot lens ripple on absorb), `walkthroughActive`, `showFinale`, plus
  actions. `addAsset` flashes a transient micro-label and bumps `rippleSeed`.
- `cameraStore` — a single `goal` ({pos, look, lambda}) the walkthrough/modes can
  set imperatively; `CameraRig` reads it each frame so camera moves never trigger
  React renders.

### Rendering pipeline (`src/three/Scene.tsx`)

- `<Canvas>` with a dark background + exponential fog.
- `Environment` with `Lightformer`s for studio reflections on the glass.
- `<Lens/>` ×3 (Nolan, Tarantino, user). User lens scale/shape/lobe are dynamic.
- `<ProfileAttachments/>` renders each lens's references (see below).
- `OverlapField`, `UnfoldView`, `AxisLabels`, `CameraRig`.
- `EffectComposer`: DepthOfField + Bloom + ChromaticAberration + Vignette + Noise.

### Camera (`src/three/CameraRig.tsx`)

Custom rig — **not** drei `OrbitControls`.
- Mode/walkthrough provides a "rest" framing (pos/look/lambda), damped smoothly.
- **User can click-drag to orbit** (horizontal = azimuth, vertical = pitch,
  clamped) and **scroll to dolly**. User rotation is layered on top of the damped
  base direction, so cinematic transitions and user orbit coexist.
- Gentle idle drift when not dragging.
- Implementation: drag listeners on `gl.domElement`; rotation applied by rotating
  a damped base-direction vector around world-up and a camera-right axis.

### References inside lenses (`AssetAttachment.tsx` → `AssetVisual.tsx`)

This has been iterated on several times and is the **most aesthetically
contested** part (see open questions). Current approach: references are laid out
as a **camera-facing phyllotaxis cluster nestled just in front of each bubble's
glass surface**, so they render crisp/unrefracted and always face the viewer as
the camera orbits. They stay within the bubble's silhouette, framed by the glass
body + rim glow behind them. `AssetVisual` billboards each tile (image card with
dark backing / text chip / palette strip).

---

## Conventions & gotchas

- **No `React.StrictMode`.** `@react-three/postprocessing` crashes under React 19
  StrictMode in dev. Keep `src/main.tsx` as-is unless you've verified otherwise.
- **`window.tasteStore`** is intentionally exposed for QA scripts. Don't remove.
- **Build = `tsc --noEmit && vite build`.** There is a single `tsconfig.json`
  (no `tsconfig.node.json`, no project references / `tsc -b`). `*.tsbuildinfo` is
  git-ignored.
- **`vite.config.ts`** dedupes `react`/`react-dom`/`three` and pre-bundles core
  libs via `optimizeDeps.include` — this fixed "Invalid hook call" / duplicate-
  React issues with Playwright against the dev server. Don't drop it.
- **Framer Motion + Tailwind transforms conflict.** When centering motion
  components, set `x: '-50%'` inside the motion `animate`/`initial` rather than
  relying on Tailwind `-translate-x-1/2` (it gets overwritten by motion's inline
  `transform`).
- **Asset duplication:** the same stills exist in both `film-stills/` (original
  source set, referenced by `DESIGN.md`) and `public/assets/` (what the app
  actually loads). If you change images, update `public/assets/` and the `src`
  paths in `tasteData.ts`.
- **Local-only / generated (git-ignored):** `node_modules/`, `dist/`,
  `.preview/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, logs,
  `.env*`.
- Performance is explicitly **not** a priority — favor visual quality.

---

## Aesthetic direction — OPEN QUESTION

**The visual/aesthetic language is not settled. Treat it as an active design
question, not a fixed spec.** The goal is "unbelievably aesthetic, jaw-dropping,
Apple-grade." The broad direction so far has been *dark cinematic* (deep
graphite void, luminous glass, subtle bloom/DOF, fine grain), but specifics are
in flux and have been re-tuned repeatedly.

When making aesthetic changes:
- **Don't assume the current values are "correct."** They're a work in progress.
- Prefer to **propose options or show before/after screenshots** (use the
  `scripts/` harnesses) rather than silently locking in a look.
- Keep the *concept* ("taste as a material shaped by references") legible.

Currently-provisional choices that are fair game to revisit:
- **Theme:** dark cinematic. (Light / other moods were never explored.)
- **References inside vs. in-front of glass.** Tension between the poetic
  "suspended in glass" look and plain legibility. Current code favors legibility
  (tiles nestled at the front, crisp). The more "embedded/refracted" look is a
  valid alternative — the front-offset in `AssetAttachment.tsx` can be dialed
  back toward center to trade crispness for that suspended feel.
- **Glass material:** transmission thickness, roughness, IOR, chromatic
  aberration, attenuation/tint, rim + core glow intensity, inner particles
  (`Lens.tsx`). These have been pushed toward "clearer" for readability.
- **Post-processing strength:** DOF (`bokehScale`/`focalLength`), bloom, grain,
  vignette, chromatic aberration (`Scene.tsx`). DOF was softened for legibility.
- **Spatial scale & layout:** `WORLD_SCALE`, lens sizes, spacing, camera
  framings.
- **Motion language:** idle drift, breathing, ripple-on-absorb, orbit
  sensitivity, mode-transition damping.
- **Typography / overlay chrome** in `src/ui/`.

If the user gives a strong aesthetic opinion, encode it here so it stops being an
open question.

---

## Interaction model (quick reference)

- **Drag** a tray reference up into the scene → absorbed into the user lens.
- **Click** an active tray reference → removed.
- **Hover** a reference → preview its pull / light the matching anchor overlap.
- **Click-drag** empty space → orbit the camera; **scroll** → dolly.
- **Build / Compare / Unfold** (top-right) → switch modes. (Compare also picks an
  anchor; Unfold is reachable via the button — clicking the lens to unfold was
  removed because it conflicted with drag-orbit.)
- **Play** → cinematic auto-walkthrough (`lib/walkthrough.ts`).
