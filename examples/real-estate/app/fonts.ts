import type { FontData } from "@effing/canvas";

export type { FontData };

export type Font = () => Promise<FontData>;

export async function loadFonts(fonts: Font[]): Promise<FontData[]> {
  return Promise.all(fonts.map((font) => font()));
}

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

const GOOGLE_FONTS_BASE = "https://fonts.gstatic.com/s";

export const interSemiBold: Font = async () => ({
  name: "Inter",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf`,
  ),
  weight: 600,
  style: "normal",
});

export const interBold: Font = async () => ({
  name: "Inter",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf`,
  ),
  weight: 700,
  style: "normal",
});

export const frauncesBold: Font = async () => ({
  name: "Fraunces",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcUByjDg.ttf`,
  ),
  weight: 700,
  style: "normal",
});

export const manropeMedium: Font = async () => ({
  name: "Manrope",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk7PFO_F.ttf`,
  ),
  weight: 500,
  style: "normal",
});

export const manropeSemiBold: Font = async () => ({
  name: "Manrope",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk4jE-_F.ttf`,
  ),
  weight: 600,
  style: "normal",
});

export const manropeBold: Font = async () => ({
  name: "Manrope",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk4aE-_F.ttf`,
  ),
  weight: 700,
  style: "normal",
});
