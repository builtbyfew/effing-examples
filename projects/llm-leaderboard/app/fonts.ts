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
 * Inter Semi-Bold (600)
 */
export const interSemiBold: Font = async () => ({
  name: "Inter",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf`,
  ),
  weight: 600,
  style: "normal",
});

/**
 * Inter Bold (700)
 */
export const interBold: Font = async () => ({
  name: "Inter",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * Roboto Regular (400)
 */
export const robotoRegular: Font = async () => ({
  name: "Roboto",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmT.ttf`,
  ),
  weight: 400,
  style: "normal",
});

/**
 * Roboto Bold (700)
 */
export const robotoBold: Font = async () => ({
  name: "Roboto",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * Open Sans Regular (400)
 */
export const openSansRegular: Font = async () => ({
  name: "Open Sans",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/opensans/v44/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0C4n.ttf`,
  ),
  weight: 400,
  style: "normal",
});

/**
 * Open Sans Semi-Bold (600)
 */
export const openSansSemiBold: Font = async () => ({
  name: "Open Sans",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/opensans/v44/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsgH1y4n.ttf`,
  ),
  weight: 600,
  style: "normal",
});

/**
 * Open Sans Bold (700)
 */
export const openSansBold: Font = async () => ({
  name: "Open Sans",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/opensans/v44/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1y4n.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * JetBrains Mono Regular (400) — the leaderboard's body/label monospace.
 */
export const jetBrainsMonoRegular: Font = async () => ({
  name: "JetBrains Mono",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmSsac.ttf`,
  ),
  weight: 400,
  style: "normal",
});

/**
 * JetBrains Mono Medium (500)
 */
export const jetBrainsMonoMedium: Font = async () => ({
  name: "JetBrains Mono",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8-qxjPVmSsac.ttf`,
  ),
  weight: 500,
  style: "normal",
});

/**
 * JetBrains Mono Bold (700) — model names, ranks, and figures.
 */
export const jetBrainsMonoBold: Font = async () => ({
  name: "JetBrains Mono",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPVmSsac.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * JetBrains Mono ExtraBold (800) — the "Leaderboard" wordmark.
 */
export const jetBrainsMonoExtraBold: Font = async () => ({
  name: "JetBrains Mono",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8SKtjPVmSsac.ttf`,
  ),
  weight: 800,
  style: "normal",
});

// ---------------------------------------------------------------------------
// The "Slick" leaderboard's typeface system (the fancy variant).
//
// A high-contrast editorial serif for the headline, a characterful grotesque
// for names and labels, and JetBrains Mono (above) for the tabular figures.
// These are the *display* (opsz 144) static cuts of Fraunces — the dramatic,
// high-contrast cut, not the low-contrast text cut you get by default.
// ---------------------------------------------------------------------------

/**
 * Fraunces 72pt Display, SemiBold (700) — the Slick headline wordmark.
 */
export const frauncesDisplay700: Font = async () => ({
  name: "Fraunces",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58njr1a03gg7S2nfgRYIcUByjDvTUhUo.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * Fraunces 72pt Display, Black (900) — heaviest headline cut, if more punch is wanted.
 */
export const frauncesDisplay900: Font = async () => ({
  name: "Fraunces",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58njr1a03gg7S2nfgRYIcHhyjDvTUhUo.ttf`,
  ),
  weight: 900,
  style: "normal",
});

/**
 * Bricolage Grotesque Regular (400) — Slick harness sub-labels & meta.
 */
export const bricolage400: Font = async () => ({
  name: "Bricolage Grotesque",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvRviyM0vtewI.ttf`,
  ),
  weight: 400,
  style: "normal",
});

/**
 * Bricolage Grotesque SemiBold (600) — Slick eyebrow & column labels.
 */
export const bricolage600: Font = async () => ({
  name: "Bricolage Grotesque",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvcXlyM0vtewI.ttf`,
  ),
  weight: 600,
  style: "normal",
});

/**
 * Bricolage Grotesque Bold (700) — Slick model names.
 */
export const bricolage700: Font = async () => ({
  name: "Bricolage Grotesque",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvfzlyM0vtewI.ttf`,
  ),
  weight: 700,
  style: "normal",
});

/**
 * Bricolage Grotesque ExtraBold (800) — Slick emphasis.
 */
export const bricolage800: Font = async () => ({
  name: "Bricolage Grotesque",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvZvlyM0vtewI.ttf`,
  ),
  weight: 800,
  style: "normal",
});

// ---------------------------------------------------------------------------
// The "Flap" leaderboard's typeface (the split-flap / Solari departure board).
//
// Space Mono — a fixed-width grotesque with the mechanical, slightly retro
// character of an old transit board. Every glyph is the same width, so it sits
// dead-centre in a flap tile and rolls cleanly through the reel.
// ---------------------------------------------------------------------------

/**
 * Space Mono Regular (400) — Flap board labels & engraving.
 */
export const spaceMono400: Font = async () => ({
  name: "Space Mono",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/spacemono/v17/i7dPIFZifjKcF5UAWdDRUEZ2Qlq6.ttf`,
  ),
  weight: 400,
  style: "normal",
});

/**
 * Space Mono Bold (700) — the Flap board's tile glyphs.
 */
export const spaceMono700: Font = async () => ({
  name: "Space Mono",
  data: await fetchFont(
    `${GOOGLE_FONTS_BASE}/spacemono/v17/i7dMIFZifjKcF5UAWdDRaPpZYFKQGQyU.ttf`,
  ),
  weight: 700,
  style: "normal",
});
