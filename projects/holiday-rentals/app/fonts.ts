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
 * Poppins SemiBold (600) — headings and the big rating/price numbers.
 */
export const poppinsSemiBold: Font = async () => ({
  name: "Poppins",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/poppins/v24/pxiByp8kv8JHgFVrLEj6Z1xlEA.ttf`,
  ),
  weight: 600,
  style: "normal",
});

/**
 * Poppins Bold (700) — the boldest display weight, for hero numbers and the CTA.
 */
export const poppinsBold: Font = async () => ({
  name: "Poppins",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/poppins/v24/pxiByp8kv8JHgFVrLCz7Z1xlEA.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * DM Sans Regular (400)
 */
export const dmSansRegular: Font = async () => ({
  name: "DM Sans",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf`,
  ),
  weight: 400,
  style: "normal",
});

/**
 * DM Sans Medium (500)
 */
export const dmSansMedium: Font = async () => ({
  name: "DM Sans",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJxhTg.ttf`,
  ),
  weight: 500,
  style: "normal",
});

/**
 * DM Sans Bold (700)
 */
export const dmSansBold: Font = async () => ({
  name: "DM Sans",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * Caveat Semi-Bold (600) — handwritten accent for postcard greetings.
 */
export const caveatSemiBold: Font = async () => ({
  name: "Caveat",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjSx6SII.ttf`,
  ),
  weight: 600,
  style: "normal",
});

/**
 * Caveat Bold (700) — handwritten accent for postcard greetings.
 */
export const caveatBold: Font = async () => ({
  name: "Caveat",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6SII.ttf`,
  ),
  weight: 700,
  style: "normal",
});
