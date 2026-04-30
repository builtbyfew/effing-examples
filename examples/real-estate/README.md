# Real Estate Listing Promo

An end-to-end example using the `@effing/*` packages to build a video promo for a real estate listing — a sequence of panning property photos with overlaid info pills, capped by a realtor contact card and backed by a music track.

The project doubles as a reference for how images, annies (animations), and effies (video compositions) compose together in a real app.

## Getting Started

```bash
cd examples/real-estate
pnpm install
cp .env.example .env
pnpm dev
```

Open [http://localhost:3839](http://localhost:3839) for the homepage listing every fn, or jump straight to [http://localhost:3839/preview/effie/listing-promo](http://localhost:3839/preview/effie/listing-promo) to preview and render the promo video.

## What's in here

```
examples/real-estate/
├── app/
│   ├── images/
│   │   ├── listing-promo-cover.fn.tsx   # Static cover frame for the promo
│   │   └── panned-photo.fn.tsx          # Single still of a photo at a pan offset
│   ├── annies/
│   │   ├── panning-photo.fn.tsx         # Slow Ken-Burns-style pan over a photo
│   │   ├── photo-zoom.fn.tsx            # Zooming photo animation
│   │   ├── pill-list.fn.tsx             # Staggered slide-in info pills
│   │   └── realtor-card.fn.tsx          # Realtor contact card with fade-in
│   ├── effies/
│   │   └── listing-promo.fn.tsx         # The full listing promo composition
│   ├── routes/
│   │   ├── _index.tsx                   # Homepage listing all images/annies/effies
│   │   ├── annie.$segment.tsx           # Annie TAR streaming endpoint
│   │   ├── effie.$segment.tsx           # Effie JSON endpoint
│   │   ├── image.$segment.tsx           # Image rendering endpoint
│   │   ├── preview.annie.$annieId.tsx   # Annie preview page
│   │   ├── preview.effie.$effieId.tsx   # Effie preview page
│   │   └── preview.image.$imageId.tsx   # Image preview page
│   ├── fn.server.ts                     # Wires the @effing/fn runtime to the app
│   ├── fonts.ts                         # Font definitions and loading utils
│   ├── photo-pan.ts                     # Shared pan-geometry helpers
│   ├── theme.ts                         # Shared colors / type scale
│   └── urls.server.ts                   # Signed URL segment helpers
└── vite.config.ts
```

Fns of all three kinds (image, annie, effie) share one module shape: a `propsSchema`, a `previewProps`, and an exported `runner`. They live in `app/{images,annies,effies}/*.fn.tsx` and are auto-discovered by `app/fn.server.ts` via `import.meta.glob`, so dropping a new file in is enough to register it.

## How the promo is composed

`app/effies/listing-promo.fn.tsx` is the centerpiece. Given a list of scenes (each scene = a set of pills + one or more property photos) and a realtor profile, it builds an effie with:

1. A photo segment that strings every photo together. Each photo gets a `panning-photo` annie layer for its at-rest period, plus a still `panned-photo` image layer that handles the slide-out — frozen at the panning's endpoint so the handoff between annie and image is pixel-identical.
2. One `pill-list` annie per scene, fading out during cross-swipes so pills stay positionally still through photo changes.
3. A trailing realtor segment using the `realtor-card` annie, joined with a fade transition.
4. A static cover frame (`listing-promo-cover` image) used as the poster while the video loads, and an audio track from `static.effing.dev`.

The pan-geometry math is shared between the panning annie and the still image via `app/photo-pan.ts`, which is what makes the annie→image handoff seamless.

