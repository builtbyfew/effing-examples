import type { ReactNode } from "react";
import { wmoCategory } from "./weather-codes";

type WeatherSceneProps = {
  wmoCode: number;
  progress: number;
  width: number;
  height: number;
};

export function WeatherScene({
  wmoCode,
  progress,
  width,
  height,
}: WeatherSceneProps) {
  const cat = wmoCategory(wmoCode);
  switch (cat) {
    case "clear":
      return <ClearScene width={width} height={height} progress={progress} />;
    case "partly_cloudy":
      return (
        <PartlyCloudyScene
          width={width}
          height={height}
          progress={progress}
        />
      );
    case "overcast":
      return (
        <OvercastScene width={width} height={height} progress={progress} />
      );
    case "fog":
      return <FogScene width={width} height={height} progress={progress} />;
    case "drizzle":
      return (
        <RainScene
          width={width}
          height={height}
          progress={progress}
          dropCount={60}
          dropLength={20}
        />
      );
    case "rain":
      return (
        <RainScene
          width={width}
          height={height}
          progress={progress}
          dropCount={140}
          dropLength={36}
        />
      );
    case "snow":
      return <SnowScene width={width} height={height} progress={progress} />;
    case "thunder":
      return (
        <ThunderScene width={width} height={height} progress={progress} />
      );
  }
}

function SceneSvg({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block", width, height }}
      >
        {children}
      </svg>
    </div>
  );
}

function Cloud({
  cx,
  cy,
  scale,
  fill,
}: {
  cx: number;
  cy: number;
  scale: number;
  fill: string;
}) {
  const puffs = [
    { cx: cx - 1.4 * scale, cy: cy + 0.2 * scale, rx: 0.9 * scale, ry: 0.7 * scale },
    { cx: cx - 0.4 * scale, cy: cy - 0.4 * scale, rx: 1.0 * scale, ry: 0.85 * scale },
    { cx: cx + 0.6 * scale, cy: cy - 0.2 * scale, rx: 0.95 * scale, ry: 0.75 * scale },
    { cx: cx + 1.5 * scale, cy: cy + 0.25 * scale, rx: 0.85 * scale, ry: 0.65 * scale },
    { cx: cx, cy: cy + 0.3 * scale, rx: 1.6 * scale, ry: 0.7 * scale },
  ];
  return (
    <g>
      {puffs.map((p, i) => (
        <ellipse
          key={i}
          cx={p.cx}
          cy={p.cy}
          rx={p.rx}
          ry={p.ry}
          fill={fill}
        />
      ))}
    </g>
  );
}

function Sun({
  cx,
  cy,
  r,
  rotation,
  raysPulse,
}: {
  cx: number;
  cy: number;
  r: number;
  rotation: number;
  raysPulse: number;
}) {
  const rayInner = r * 1.35;
  const rayOuter = r * (1.7 + raysPulse);
  return (
    <g>
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * rayInner}
              y1={cy + Math.sin(a) * rayInner}
              x2={cx + Math.cos(a) * rayOuter}
              y2={cy + Math.sin(a) * rayOuter}
              stroke="#fff2a8"
              strokeWidth={r * 0.18}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r * 1.1} fill="#fff7c2" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r} fill="#ffd966" />
    </g>
  );
}

function ClearScene({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: number;
}) {
  const cx = width * 0.78;
  const cy = height * 0.18;
  const r = Math.min(width, height) * 0.08;
  const rotation = progress * 40;
  const pulse = 0.5 + 0.15 * Math.sin(progress * Math.PI * 4);
  return (
    <SceneSvg width={width} height={height}>
      <Sun cx={cx} cy={cy} r={r} rotation={rotation} raysPulse={pulse} />
    </SceneSvg>
  );
}

function PartlyCloudyScene({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: number;
}) {
  const cx = width * 0.78;
  const cy = height * 0.18;
  const r = Math.min(width, height) * 0.07;
  const rotation = progress * 30;
  const drift = ((progress * 0.3) % 1) * width * 0.1;
  const cloudScale = Math.min(width, height);
  return (
    <SceneSvg width={width} height={height}>
      <Sun cx={cx} cy={cy} r={r} rotation={rotation} raysPulse={0.3} />
      <Cloud
        cx={width * 0.32 + drift}
        cy={height * 0.22}
        scale={cloudScale * 0.06}
        fill="#ffffff"
      />
      <Cloud
        cx={width * 0.62 - drift * 0.6}
        cy={height * 0.32}
        scale={cloudScale * 0.05}
        fill="#f4f7fa"
      />
    </SceneSvg>
  );
}

function OvercastScene({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: number;
}) {
  const drift = progress * width * 0.08;
  const s = Math.min(width, height) * 0.07;
  return (
    <SceneSvg width={width} height={height}>
      <Cloud
        cx={width * 0.2 + drift * 0.6}
        cy={height * 0.13}
        scale={s * 1.1}
        fill="#dde3ea"
      />
      <Cloud
        cx={width * 0.65 + drift * 0.4}
        cy={height * 0.09}
        scale={s * 1.3}
        fill="#cfd6de"
      />
      <Cloud
        cx={width * 0.45 - drift * 0.5}
        cy={height * 0.22}
        scale={s * 1.5}
        fill="#e6ecf2"
      />
      <Cloud
        cx={width * 0.85 - drift * 0.3}
        cy={height * 0.28}
        scale={s * 1.0}
        fill="#cfd6de"
      />
      <Cloud
        cx={width * 0.15 + drift * 0.35}
        cy={height * 0.32}
        scale={s * 0.95}
        fill="#dde3ea"
      />
    </SceneSvg>
  );
}

function FogScene({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: number;
}) {
  const bandCount = 8;
  return (
    <SceneSvg width={width} height={height}>
      {Array.from({ length: bandCount }, (_, i) => {
        const seed = (i * 0.137) % 1;
        const drift =
          ((progress * (0.4 + seed * 0.6) + seed) % 1) * width - width * 0.5;
        const y = height * (0.1 + (i / bandCount) * 0.8);
        const h = height * 0.04;
        const opacity = 0.18 + (i % 2) * 0.1;
        return (
          <rect
            key={i}
            x={drift}
            y={y}
            width={width * 1.5}
            height={h}
            rx={h / 2}
            fill="#ffffff"
            opacity={opacity}
          />
        );
      })}
    </SceneSvg>
  );
}

function RainScene({
  width,
  height,
  progress,
  dropCount,
  dropLength,
}: {
  width: number;
  height: number;
  progress: number;
  dropCount: number;
  dropLength: number;
}) {
  return (
    <SceneSvg width={width} height={height}>
      {Array.from({ length: dropCount }, (_, i) => {
        const seedX = ((i * 73) % 100) / 100;
        const phase = ((i * 41) % 100) / 100;
        const speed = 1.2 + (((i * 29) % 100) / 100) * 0.5;
        const span = height + dropLength * 4;
        const y = ((phase + progress * speed) % 1) * span - dropLength * 2;
        const x = seedX * width;
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x - dropLength * 0.18}
            y2={y + dropLength}
            stroke="#cfe1f0"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.75}
          />
        );
      })}
    </SceneSvg>
  );
}

function SnowScene({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: number;
}) {
  const flakeCount = 110;
  return (
    <SceneSvg width={width} height={height}>
      {Array.from({ length: flakeCount }, (_, i) => {
        const seedX = ((i * 53) % 100) / 100;
        const phase = ((i * 37) % 100) / 100;
        const speed = 0.4 + (((i * 19) % 100) / 100) * 0.4;
        const r = 3 + ((i * 13) % 5);
        const span = height + 40;
        const y = ((phase + progress * speed) % 1) * span - 20;
        const drift = Math.sin(progress * Math.PI * 2 + i) * 14;
        const x = seedX * width + drift;
        return (
          <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.9} />
        );
      })}
    </SceneSvg>
  );
}

function ThunderScene({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: number;
}) {
  const drift = progress * width * 0.06;
  const s = Math.min(width, height) * 0.07;
  const flash = flashStrength(progress, 0.25) + flashStrength(progress, 0.7);
  const boltOpacity = Math.min(1, flash);
  return (
    <SceneSvg width={width} height={height}>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#fff8d4"
        opacity={boltOpacity * 0.45}
      />
      <Cloud
        cx={width * 0.25 + drift * 0.6}
        cy={height * 0.12}
        scale={s * 1.4}
        fill="#3a3f4a"
      />
      <Cloud
        cx={width * 0.7 + drift * 0.4}
        cy={height * 0.1}
        scale={s * 1.5}
        fill="#2c303a"
      />
      <Cloud
        cx={width * 0.5 - drift * 0.5}
        cy={height * 0.23}
        scale={s * 1.7}
        fill="#454a55"
      />
      <polygon
        points={`
          ${width * 0.5},${height * 0.22}
          ${width * 0.46},${height * 0.36}
          ${width * 0.5},${height * 0.36}
          ${width * 0.45},${height * 0.5}
          ${width * 0.56},${height * 0.32}
          ${width * 0.51},${height * 0.32}
          ${width * 0.55},${height * 0.22}
        `}
        fill="#fff58c"
        opacity={boltOpacity}
      />
      {Array.from({ length: 90 }, (_, i) => {
        const seedX = ((i * 73) % 100) / 100;
        const phase = ((i * 41) % 100) / 100;
        const speed = 1.4 + (((i * 29) % 100) / 100) * 0.4;
        const dropLength = 32;
        const span = height + dropLength * 4;
        const y = ((phase + progress * speed) % 1) * span - dropLength * 2;
        const x = seedX * width;
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x - dropLength * 0.2}
            y2={y + dropLength}
            stroke="#9bb0bf"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.7}
          />
        );
      })}
    </SceneSvg>
  );
}

function flashStrength(progress: number, peak: number): number {
  const dx = Math.abs(progress - peak);
  const wrap = Math.min(dx, 1 - dx);
  const half = 0.04;
  return Math.max(0, 1 - wrap / half);
}
