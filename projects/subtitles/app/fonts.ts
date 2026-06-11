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
 * Inter Black (900)
 */
export const interBlack: Font = async () => ({
  name: "Inter",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuBWYMZg.ttf`,
  ),
  weight: 900,
  style: "normal",
});
