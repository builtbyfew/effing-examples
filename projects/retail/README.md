# Effing project `retail`

Two promo videos for a fictional running shoe, the **Cloudstep 574** — an
example of composing images, frame-based animations, and synthesized audio
into MP4s with the `@effing/*` packages. See [`GUIDE.md`](./GUIDE.md) for
setup and deployment.

## The effies

- **`product-promo`** — a three-act spot: hero zoom with a fading-in
  headline, feature pills popping in over a drifting photo, and a CTA outro
  where the price tag bounces in while a typewriter spells the call to
  action.
- **`chat-promo`** — the same product pitched as a brand DM: a messaging
  conversation with typing indicator, message-grouped bubbles, image
  messages, and a read receipt, ending in the shared CTA outro.

Run `pnpm dev` and open the printed URL to preview them; the "Render it FFS"
button on an effie's preview page produces the MP4.

## Things worth stealing

- **Sprite-compositing annie** (`app/annies/chat-conversation.fn.tsx`) —
  every bubble is rendered once, cropped to exact pixel bounds via an alpha
  scan, then frames are cheap `drawImage` composites. Around 20× faster than
  re-running JSX layout per frame.
- **Schedule-driven duration** — `conversationSchedule()` is a pure function
  of the messages, so the effie's segment duration always matches the
  animation, whatever messages you pass in.
- **Synthesized sound effects** (`app/sound-effects.ts`) — the effie format
  has no timed audio cues, so message pops, typing ticks, card-drop thuds,
  and the typewriter bell are mixed into one WAV in plain JS and attached as
  a `data:` URL, sample-accurate to the schedule.
- **Shared chat UI** (`app/chat-ui.tsx`) — one module holds the message
  model, palette, layout, and components used by the conversation annie, the
  chrome image, and the cover still.
