// Shared palette and typography for the holiday-rentals pieces.
// Friendly booking-app aesthetic — bright white surfaces, warm off-white
// paper, the signature Rausch coral as the hero accent, with teal and orange to
// keep it playful. Near-black text, foggy grey for the quiet bits.

export const palette = {
  // Surfaces — bright and friendly
  paper: "#ffffff", // white cards and chips
  cloud: "#f5f2ef", // warm off-white backdrop the cards float on
  mist: "#e7e3de", // hairlines, dividers, map land
  // Text
  ink: "#222222", // near-black headings and body
  inkSoft: "#717171", // foggy grey for secondary text
  // Brand
  rausch: "#ff385c", // signature coral-red — the primary accent
  rauschDeep: "#bd1e59", // deep coral for the button gradient's tail
  babu: "#00a699", // teal — playful secondary
  arches: "#fc642d", // orange — warm accent
  star: "#222222", // rating stars sit near-black, booking-app style
} as const;

export const fontFamily = {
  display: "Poppins", // friendly geometric sans for headings and numbers
  body: "DM Sans", // clean body and labels
  script: "Caveat", // handwritten accent for the postcard piece
} as const;
