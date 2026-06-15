import type { FontData } from "@effing/canvas";

export type { FontData };

export type Font = () => Promise<FontData>;

/**
 * Load multiple fonts in parallel
 */
export async function loadFonts(fonts: Font[]): Promise<FontData[]> {
  return Promise.all(fonts.map((font) => font()));
}

// Font cache to avoid re-fetching
const fontCache = new Map<string, Promise<ArrayBuffer>>();

async function fetchFont(url: string): Promise<ArrayBuffer> {
  if (!fontCache.has(url)) {
    fontCache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch font: ${url}`);
        return res.arrayBuffer();
      }),
    );
  }
  return fontCache.get(url)!;
}

// Google Fonts URLs - fetched from Google Fonts CSS2 API
const GOOGLE_FONTS_BASE = "https://fonts.gstatic.com/s";

/**
 * Space Grotesk Medium (500) — secondary display text (taglines, footers).
 */
export const spaceGroteskMedium: Font = async () => ({
  name: "Space Grotesk",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7aUUsj.ttf`,
  ),
  weight: 500,
  style: "normal",
});

/**
 * Space Grotesk Bold (700) — the big kinetic words and job titles.
 */
export const spaceGroteskBold: Font = async () => ({
  name: "Space Grotesk",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * Baloo 2 ExtraBold (800) — rounded and bouncy, for the playful intro line.
 */
export const baloo2ExtraBold: Font = async () => ({
  name: "Baloo 2",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/baloo2/v23/wXK0E3kTposypRydzVT08TS3JnAmtdiayqpv.ttf`,
  ),
  weight: 800,
  style: "normal",
});

/**
 * Caveat Bold (700) — handwritten accent for the "Apply now" CTA.
 */
export const caveatBold: Font = async () => ({
  name: "Caveat",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6SII.ttf`,
  ),
  weight: 700,
  style: "normal",
});
