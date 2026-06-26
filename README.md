# Visual Taste

A spatial, almost text-free demo that visualizes a multimodal **taste profile** as a living glass object shaped by film references.

Three translucent lenses float in a dark studio void:

- **You** — starts pale and unformed, then grows and bends as you add references
- **Nolan** — cool, tall, architectural, restrained
- **Tarantino** — warm, saturated, theatrical, kinetic

Drag image / text / palette references into your lens and watch it morph, recolor, move through taste-space, and overlap with the anchors. A second, warmer lobe appears when your taste splits across clusters.

## Concept

> Taste is a material shaped by references.

No embeddings, no backend — every coordinate, palette, and pull is hardcoded (see `src/data/tasteData.ts`). The hidden taste-space has three axes:

- **X** Naturalistic ↔ Stylized
- **Y** Intimate ↔ Monumental
- **Z** Restrained ↔ Electric

## Run

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Interactions

- **Drag** a reference from the bottom tray up into the scene to absorb it into your lens.
- **Click** an active reference in the tray to remove it.
- **Hover** a reference to preview its pull and light up the matching anchor overlap.
- **Build / Compare / Unfold** (top-right) switch modes.
- **Play** runs a cinematic auto-walkthrough of the whole idea.

## Stack

Vite · React 19 · React Three Fiber · three.js · drei · postprocessing · Zustand · Framer Motion · Tailwind.

## Assets

Film stills live in `public/assets/` (copied from `film-stills/`). They are used here purely for a non-commercial design demo.
