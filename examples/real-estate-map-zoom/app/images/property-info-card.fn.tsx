import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interSemiBold, interBold, loadFonts } from "~/fonts";

// FA 6 Free "fa-house" solid — viewBox 0 0 576 512
const FA_HOUSE =
  "M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c.2 35.5-28.5 64.3-64 64.3H128.1c-35.3 0-64-28.7-64-64V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7.2 17-11 27-11s20 3.8 27 11l255.4 263.5c6.7 7 10 15 10 24zM352 224c0-35.3-28.7-64-64-64s-64 28.7-64 64v96h128V224z";

// FA 7 Free "fa-bed" solid — viewBox 0 0 576 512
const FA_BED =
  "M32 32c17.7 0 32 14.3 32 32l0 224 224 0 0-128c0-17.7 14.3-32 32-32l160 0c53 0 96 43 96 96l0 224c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64-448 0 0 64c0 17.7-14.3 32-32 32S0 465.7 0 448L0 64C0 46.3 14.3 32 32 32zm80 160a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z";

// FA 7 Free "fa-shower" solid — viewBox 0 0 512 512
const FA_SHOWER =
  "M64 131.9c0-19.8 16.1-35.9 35.9-35.9 9.5 0 18.6 3.8 25.4 10.5l16.2 16.2c-21 38.9-17.4 87.5 10.9 123L151 247c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0L345 121c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-1.3 1.3c-35.5-28.3-84.1-31.9-123-10.9L170.5 61.3C151.8 42.5 126.4 32 99.9 32 44.7 32 0 76.7 0 131.9L0 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-316.1zM256 352a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm64 64a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm0-128a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm64 64a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm0-128a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm64 64a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm32-32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z";

export const propsSchema = z.object({
  liveableArea: z.number().positive(),
  bedrooms: z.number().int().positive(),
  bathrooms: z.number().int().positive(),
  price: z.string(),
});

export type PropertyInfoCardProps = z.infer<typeof propsSchema>;

export const previewProps: PropertyInfoCardProps = {
  liveableArea: 240,
  bedrooms: 4,
  bathrooms: 2,
  price: "€ 1,250,000",
};

export function getPropertyCardMetrics(width: number, height: number) {
  const fs = Math.round(width / 26);
  const cardH = Math.round(fs * 5.2);
  const cardW = Math.round(width * 0.74);
  return {
    fs,
    cardW,
    cardH,
    cardX: Math.round((width - cardW) / 2),
    bottomY: height - cardH - 40,
  };
}

function StatItem({
  value,
  iconPath,
  viewBox,
  iconW,
  iconH,
  fs,
}: {
  value: string;
  iconPath: string;
  viewBox: string;
  iconW: number;
  iconH: number;
  fs: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 15}}>
      <svg viewBox={viewBox} width={iconW} height={iconH}>
        <path d={iconPath} fill="#555555" />
      </svg>
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: fs,
          color: "#1a1a1a",
          marginTop: 8,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function PropertyInfoCardOverlay({
  liveableArea,
  bedrooms,
  bathrooms,
  price,
  width,
  height,
}: {
  liveableArea: number;
  bedrooms: number;
  bathrooms: number;
  price: string;
  width: number;
  height: number;
}) {
  const { fs, cardW, cardH, cardX, bottomY } = getPropertyCardMetrics(width, height);
  const statFs = Math.round(fs * 0.88);
  const priceFs = Math.round(fs * 1.3);
  const dividerGap = Math.round(fs * 0.75);
  const iconH = Math.round(fs * 1.1);
  // house and bed: viewBox 576×512; shower: viewBox 512×512
  const wideIconW = Math.round((iconH * 576) / 512);
  const squareIconW = iconH;

  return (
    <div style={{ width, height, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: cardX,
          top: bottomY,
          width: cardW,
          height: cardH,
          backgroundColor: "rgba(255, 255, 255, 0.90)",
          borderRadius: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: Math.round(fs * 0.32),
          }}
        >
          <StatItem
            value={`${liveableArea} m²`}
            iconPath={FA_HOUSE}
            viewBox="0 0 576 512"
            iconW={wideIconW}
            iconH={iconH}
            fs={statFs}
          />
          <div
            style={{
              width: 1,
              height: Math.round(fs * 2.2),
              backgroundColor: "rgba(0,0,0,0.12)",
              marginLeft: dividerGap,
              marginRight: dividerGap,
            }}
          />
          <StatItem
            value={String(bedrooms)}
            iconPath={FA_BED}
            viewBox="0 0 576 512"
            iconW={wideIconW}
            iconH={iconH}
            fs={statFs}
          />
          <div
            style={{
              width: 1,
              height: Math.round(fs * 2.2),
              backgroundColor: "rgba(0,0,0,0.12)",
              marginLeft: dividerGap,
              marginRight: dividerGap,
            }}
          />
          <StatItem
            value={String(bathrooms)}
            iconPath={FA_SHOWER}
            viewBox="0 0 512 512"
            iconW={squareIconW}
            iconH={iconH}
            fs={statFs}
          />
        </div>
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: priceFs,
            color: "#1a1a1a",
          }}
        >
          {price}
        </div>
      </div>
    </div>
  );
}

export async function runner({
  props: { liveableArea, bedrooms, bathrooms, price },
  bounds: { width, height },
}: RunnerArgs<PropertyInfoCardProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <PropertyInfoCardOverlay
      liveableArea={liveableArea}
      bedrooms={bedrooms}
      bathrooms={bathrooms}
      price={price}
      width={width}
      height={height}
    />,
    { fonts },
  );
  return canvas.encode("png");
}
