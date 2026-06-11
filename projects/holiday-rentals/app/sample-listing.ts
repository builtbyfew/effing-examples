// Demo data shared across every fn's `previewProps` so the preview pages all
// describe the same imaginary listing — a clifftop villa on Bali's Bukit
// Peninsula. Swap these out (or mint signed URLs with your own props) to render
// any real listing.

export const PHOTOS = {
  villa: "https://static.effing.dev/villa-serena/serena-villa.jpg",
  pool: "https://static.effing.dev/villa-serena/serena-pool.jpg",
  bedroom: "https://static.effing.dev/villa-serena/serena-bedroom.jpg",
} as const;

type Amenity = {
  label: string;
  icon: AmenityIcon;
};

export type AmenityIcon =
  | "wifi"
  | "pool"
  | "ocean"
  | "kitchen"
  | "ac"
  | "parking"
  | "beach"
  | "pet";

const SAMPLE_AMENITIES: Amenity[] = [
  { label: "Fast Wi-Fi", icon: "wifi" },
  { label: "Private pool", icon: "pool" },
  { label: "Ocean view", icon: "ocean" },
  { label: "Full kitchen", icon: "kitchen" },
  { label: "Air-con", icon: "ac" },
  { label: "Free parking", icon: "parking" },
];

export const SAMPLE_LISTING = {
  title: "Villa Serena",
  location: "Uluwatu, Bali",
  rating: 4.97,
  reviewCount: 214,
  guests: 8,
  bedrooms: 4,
  baths: 3,
  pricePerNight: 420,
  currency: "$",
  badge: "Guest favourite",
  amenities: SAMPLE_AMENITIES,
} as const;
