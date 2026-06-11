import type { ReactNode } from "react";
import type { AmenityIcon } from "~/sample-listing";

// Small line-icon set drawn as inline SVG. Everything uses `currentColor` so an
// icon recolors with the surrounding CSS `color` — see @effing/canvas README,
// "Inline SVG". Stroked by default; the paw is filled for legibility at size.

type IconProps = {
  size: number;
  color?: string;
  strokeWidth?: number;
};

function Stroke({
  size,
  color = "currentColor",
  strokeWidth = 2,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.3" />
    </Stroke>
  );
}

export function GuestsIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5 20c0-3.7 3.1-6 7-6s7 2.3 7 6" />
    </Stroke>
  );
}

export function BedIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M3 18V8" />
      <path d="M3 14h18v4" />
      <path d="M21 18v-3a2 2 0 0 0-2-2H7" />
      <path d="M7 14v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </Stroke>
  );
}

export function BathIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 13h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2z" />
      <path d="M6 13V6a2 2 0 0 1 4 0" />
      <path d="M7 19l-1 2M18 19l1 2" />
    </Stroke>
  );
}

function WifiIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4.5 11.5a11 11 0 0 1 15 0" />
      <path d="M7.5 14.8a6.5 6.5 0 0 1 9 0" />
      <path d="M10.5 18a2.2 2.2 0 0 1 3 0" />
    </Stroke>
  );
}

function PoolIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M7 16V5M11 16V5" />
      <path d="M7 8h4M7 12h4" />
      <path d="M2.5 19c1.4 0 1.4 1.3 2.8 1.3S8.7 19 10 19s1.4 1.3 2.8 1.3S15 19 16.4 19s1.4 1.3 2.8 1.3" />
    </Stroke>
  );
}

function OceanIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="7" r="3" />
      <path d="M2.5 15c1.4 0 1.4 1.3 2.8 1.3S8.7 15 10 15s1.4 1.3 2.8 1.3S15 15 16.4 15s1.4 1.3 2.8 1.3" />
      <path d="M2.5 19c1.4 0 1.4 1.3 2.8 1.3S8.7 19 10 19s1.4 1.3 2.8 1.3S15 19 16.4 19s1.4 1.3 2.8 1.3" />
    </Stroke>
  );
}

function KitchenIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-3z" />
      <path d="M3.5 11h17" />
      <path d="M4 8v2M20 8v2" />
      <path d="M10 5c0-1 1-1 1-2M14 5c0-1 1-1 1-2" />
    </Stroke>
  );
}

function AcIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 3v18" />
      <path d="M4.2 7.5l15.6 9M19.8 7.5L4.2 16.5" />
      <path d="M9 4.5L12 7l3-2.5M9 19.5L12 17l3 2.5" />
    </Stroke>
  );
}

function ParkingIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="4" y="3" width="16" height="18" rx="3.5" />
      <path d="M9.5 17V7.5H13a3 3 0 0 1 0 6H9.5" />
    </Stroke>
  );
}

function BeachIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 3.5C7 3.5 3.5 8 3.5 11h17C20.5 8 17 3.5 12 3.5z" />
      <path d="M12 11v9" />
      <path d="M12 20c0-1.2 1.3-2 2.6-2" />
    </Stroke>
  );
}

function PetIcon({ size, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <ellipse cx="6.5" cy="10" rx="1.7" ry="2.3" />
      <ellipse cx="10.5" cy="7.5" rx="1.7" ry="2.3" />
      <ellipse cx="14.5" cy="7.5" rx="1.7" ry="2.3" />
      <ellipse cx="18" cy="11" rx="1.7" ry="2.3" />
      <path d="M12 12.5c2.6 0 4.6 1.7 4.6 3.9 0 1.9-1.7 2.9-4.6 2.9s-4.6-1-4.6-2.9c0-2.2 2-3.9 4.6-3.9z" />
    </svg>
  );
}

export function HeartIcon({ size, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 20.5s-7.2-4.6-9.2-9.1C1.4 8.1 3.1 5 6.2 5c1.9 0 3.2 1 3.8 2.1h4c.6-1.1 1.9-2.1 3.8-2.1 3.1 0 4.8 3.1 3.4 6.4-2 4.5-9.2 9.1-9.2 9.1z" />
    </svg>
  );
}

function StarIcon({ size, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2.5l2.85 6.06 6.4.93-4.63 4.66 1.1 6.65L12 17.9l-5.72 2.86 1.1-6.65L2.75 9.49l6.4-.93z" />
    </svg>
  );
}

// Every glyph the project draws, addressable by name. Amenity chips can carry
// any of these — amenities, the spec icons, or the favourite heart/star.
export type GlyphName =
  | AmenityIcon
  | "guests"
  | "bed"
  | "bath"
  | "pin"
  | "heart"
  | "star";

const ICONS: Record<GlyphName, (props: IconProps) => ReactNode> = {
  wifi: WifiIcon,
  pool: PoolIcon,
  ocean: OceanIcon,
  kitchen: KitchenIcon,
  ac: AcIcon,
  parking: ParkingIcon,
  beach: BeachIcon,
  pet: PetIcon,
  guests: GuestsIcon,
  bed: BedIcon,
  bath: BathIcon,
  pin: PinIcon,
  heart: HeartIcon,
  star: StarIcon,
};

function Glyph({ icon, ...props }: IconProps & { icon: GlyphName }) {
  const Comp = ICONS[icon];
  return <Comp {...props} />;
}

export function AmenityGlyph({
  icon,
  ...props
}: IconProps & { icon: AmenityIcon }) {
  return <Glyph icon={icon} {...props} />;
}
