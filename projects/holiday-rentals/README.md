# Effing project `holiday-rentals`

Programmatic image and video creation with the `@effing/*` packages — see [`GUIDE.md`](./GUIDE.md) for setup and deployment.

A booking-style promo for "Aquabnb", an imaginary holiday-rental brand,
starring a clifftop villa on Bali's Bukit Peninsula. Swap the props (or
`app/sample-listing.ts`) to render any real listing.

## Effies

- **`stay-promo`** — the full spot, beat-matched to its backing track: the
  Aquabnb logo sting (a droplet that morphs into a sun, fills with water, and
  blooms over the frame), a flight-tracker opener with a tracking camera and a
  ripple photo reveal, three Ken Burns scenes with animated amenity chips, a
  rating count-up, and the cover card to close.
- **`amenity-chips-preview`** — a review gallery showing every amenity chip
  (and its icon animation) at once.

## Fns

- **Annies** — `logo-intro` (the brand sting), `flight-animation` (map, plane,
  camera, ripple), `ken-burns` (focal-point rect-to-rect drift),
  `amenity-chips` (chip overlay with per-icon animations), `rating-stars`.
- **Images** — `stay-promo-cover` (cover/poster), `photo-gradient` (legibility
  scrim), plus the standalone `postcard-photo` and `stay-card`.

Shared pieces live in `app/components/` — most notably `animated-icons.tsx`,
the amenity icon set with motion designed into each glyph — with the palette
and type pairing in `app/theme.ts`.
