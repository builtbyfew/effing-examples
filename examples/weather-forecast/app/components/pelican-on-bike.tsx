type PelicanOnBikeProps = {
  width: number;
  wheelAngle?: number;
  bobOffset?: number;
  progress?: number;
};

const VIEW_W = 240;
const VIEW_H = 200;

const REAR = { cx: 60, cy: 150, r: 35 };
const FRONT = { cx: 180, cy: 150, r: 35 };
const BB = { cx: 120, cy: 150 };
const CRANK_LEN = 14;
const CHAINRING_R = 9;
const SPROCKET_R = 5;

const HIP_NEAR = { x: 117, y: 78 };
const HIP_FAR = { x: 112, y: 79 };
const THIGH = 42;
const SHIN = 46;

const STROKE_DARK = "#1d2530";
const FRAME_DARK = "#181f2a";

type Point = { x: number; y: number };
type Wheel = { cx: number; cy: number; r: number };

export function PelicanOnBike({
  width,
  wheelAngle = 0,
  bobOffset = 0,
  progress = 0,
}: PelicanOnBikeProps) {
  const height = width * (VIEW_H / VIEW_W);

  const crankRad = (wheelAngle * Math.PI) / 180;
  const pedalA = {
    x: BB.cx + CRANK_LEN * Math.cos(crankRad),
    y: BB.cy + CRANK_LEN * Math.sin(crankRad),
  };
  const pedalB = {
    x: BB.cx - CRANK_LEN * Math.cos(crankRad),
    y: BB.cy - CRANK_LEN * Math.sin(crankRad),
  };

  const wingFlap = Math.sin(progress * Math.PI * 8) * 1.4;
  const beakOpen = Math.max(0, Math.sin(progress * Math.PI * 6 - 0.3));
  const blink = blinkAmount(progress);
  const crestWiggle = Math.sin(progress * Math.PI * 12) * 1.0;
  const pouchSway = Math.sin(progress * Math.PI * 4) * 0.8;
  const tailTwitch = Math.sin(progress * Math.PI * 4 + Math.PI) * 1.3;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ display: "block", width, height }}
    >
      <Defs />
      <Shadow />
      <SpeedLines progress={progress} />
      <Bike
        wheelAngle={wheelAngle}
        crankRad={crankRad}
        pedalA={pedalA}
        pedalB={pedalB}
      />
      <Leg hip={HIP_FAR} foot={pedalB} isNear={false} bobOffset={bobOffset} />
      <Pelican
        bobOffset={bobOffset}
        wingFlap={wingFlap}
        tailTwitch={tailTwitch}
        beakOpen={beakOpen}
        blink={blink}
        crestWiggle={crestWiggle}
        pouchSway={pouchSway}
      />
      <Leg hip={HIP_NEAR} foot={pedalA} isNear={true} bobOffset={bobOffset} />
    </svg>
  );
}

// Single quick blink centered just past mid-loop. Returns 0..1.
function blinkAmount(progress: number): number {
  const center = 0.55;
  const halfWidth = 0.04;
  const dist = Math.abs(progress - center);
  const wrapped = Math.min(dist, 1 - dist);
  if (wrapped > halfWidth) return 0;
  return Math.sin(((1 - wrapped / halfWidth) * Math.PI) / 2);
}

function Defs() {
  return (
    <defs>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#dde3ec" />
      </linearGradient>
      <linearGradient id="bellyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbfdff" />
        <stop offset="100%" stopColor="#cdd5df" />
      </linearGradient>
      <linearGradient id="wingGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#cdd5df" />
        <stop offset="100%" stopColor="#7d8a98" />
      </linearGradient>
      <linearGradient id="beakUpperGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffd370" />
        <stop offset="100%" stopColor="#d97a0e" />
      </linearGradient>
      <linearGradient id="beakLowerGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e08a14" />
        <stop offset="100%" stopColor="#a35d09" />
      </linearGradient>
      <radialGradient id="pouchGrad" cx="40%" cy="20%" r="80%">
        <stop offset="0%" stopColor="#ffd370" />
        <stop offset="60%" stopColor="#e89924" />
        <stop offset="100%" stopColor="#a35d09" />
      </radialGradient>
      <linearGradient id="frameGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4d5870" />
        <stop offset="100%" stopColor="#181f2a" />
      </linearGradient>
      <linearGradient id="tireGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3c424d" />
        <stop offset="100%" stopColor="#15171c" />
      </linearGradient>
      <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e6ebf0" />
        <stop offset="100%" stopColor="#7a838f" />
      </linearGradient>
      <linearGradient id="legGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97a0e" />
        <stop offset="100%" stopColor="#6b3a04" />
      </linearGradient>
      <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#cfd6df" />
      </linearGradient>
    </defs>
  );
}

function Shadow() {
  return (
    <g>
      <ellipse
        cx="120"
        cy="192"
        rx="108"
        ry="6"
        fill={STROKE_DARK}
        opacity="0.12"
      />
      <ellipse
        cx="120"
        cy="192"
        rx="80"
        ry="3.5"
        fill={STROKE_DARK}
        opacity="0.18"
      />
    </g>
  );
}

function SpeedLines({ progress }: { progress: number }) {
  const params = [
    { y: 56, len: 22, alpha: 0.42, off: 0 },
    { y: 88, len: 30, alpha: 0.4, off: 0.3 },
    { y: 108, len: 18, alpha: 0.32, off: 0.6 },
    { y: 130, len: 26, alpha: 0.5, off: 0.85 },
    { y: 70, len: 16, alpha: 0.34, off: 0.45 },
    { y: 116, len: 12, alpha: 0.28, off: 0.18 },
  ];
  const phase = (progress * 4) % 1;
  return (
    <g>
      {params.map((p, i) => {
        const local = (phase + p.off) % 1;
        const x2 = 32 - local * 70;
        const x1 = x2 + p.len;
        return (
          <line
            key={i}
            x1={x1}
            y1={p.y}
            x2={x2}
            y2={p.y}
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity={p.alpha}
          />
        );
      })}
    </g>
  );
}

function Bike({
  wheelAngle,
  crankRad,
  pedalA,
  pedalB,
}: {
  wheelAngle: number;
  crankRad: number;
  pedalA: Point;
  pedalB: Point;
}) {
  return (
    <g>
      <Wheel w={REAR} angle={wheelAngle} />
      <Wheel w={FRONT} angle={wheelAngle} />
      <Frame />
      <Drivetrain crankRad={crankRad} pedalA={pedalA} pedalB={pedalB} />
      <Handlebars />
      <Saddle />
    </g>
  );
}

function Wheel({ w, angle }: { w: Wheel; angle: number }) {
  const innerR = w.r - 5;
  const spokeCount = 10;
  return (
    <g>
      <circle
        cx={w.cx}
        cy={w.cy}
        r={w.r}
        fill="none"
        stroke="url(#tireGrad)"
        strokeWidth="6"
      />
      <circle
        cx={w.cx}
        cy={w.cy}
        r={innerR}
        fill="none"
        stroke="url(#rimGrad)"
        strokeWidth="2.4"
      />
      <circle
        cx={w.cx}
        cy={w.cy}
        r={innerR - 1.6}
        fill="none"
        stroke="#3c424d"
        strokeWidth="0.6"
        opacity="0.7"
      />
      <g transform={`rotate(${angle} ${w.cx} ${w.cy})`}>
        {Array.from({ length: spokeCount }, (_, i) => {
          const a = (i / spokeCount) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={w.cx + Math.cos(a) * 3.5}
              y1={w.cy + Math.sin(a) * 3.5}
              x2={w.cx + Math.cos(a) * (innerR - 1)}
              y2={w.cy + Math.sin(a) * (innerR - 1)}
              stroke="#5a6573"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle
        cx={w.cx}
        cy={w.cy}
        r="3.6"
        fill={STROKE_DARK}
        stroke="#5a6573"
        strokeWidth="0.6"
      />
      <circle
        cx={w.cx - 0.8}
        cy={w.cy - 0.8}
        r="1.2"
        fill="#bcc6d2"
        opacity="0.7"
      />
    </g>
  );
}

function Frame() {
  return (
    <g>
      <line
        x1="60"
        y1="150"
        x2="120"
        y2="150"
        stroke="url(#frameGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="60"
        y1="150"
        x2="110"
        y2="80"
        stroke="url(#frameGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="110"
        y1="80"
        x2="170"
        y2="75"
        stroke="url(#frameGrad)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <line
        x1="170"
        y1="75"
        x2="120"
        y2="150"
        stroke="url(#frameGrad)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <line
        x1="110"
        y1="80"
        x2="120"
        y2="150"
        stroke="url(#frameGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="170"
        y1="75"
        x2="180"
        y2="150"
        stroke="url(#frameGrad)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <line
        x1="170"
        y1="75"
        x2="178"
        y2="52"
        stroke="url(#frameGrad)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <line
        x1="167"
        y1="73"
        x2="119"
        y2="146"
        stroke="#cdd5df"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.55"
      />
      <line
        x1="112"
        y1="78"
        x2="167"
        y2="73"
        stroke="#cdd5df"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="111.5"
        y1="83"
        x2="121"
        y2="148"
        stroke="#cdd5df"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      <line
        x1="172"
        y1="80"
        x2="181"
        y2="147"
        stroke="#cdd5df"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </g>
  );
}

function Drivetrain({
  crankRad,
  pedalA,
  pedalB,
}: {
  crankRad: number;
  pedalA: Point;
  pedalB: Point;
}) {
  const chainTopL = { x: REAR.cx, y: REAR.cy - SPROCKET_R };
  const chainTopR = { x: BB.cx, y: BB.cy - CHAINRING_R };
  const chainBotR = { x: BB.cx, y: BB.cy + CHAINRING_R };
  const chainBotL = { x: REAR.cx, y: REAR.cy + SPROCKET_R };
  const chainPath =
    `M ${chainTopL.x} ${chainTopL.y}` +
    ` L ${chainTopR.x} ${chainTopR.y}` +
    ` A ${CHAINRING_R} ${CHAINRING_R} 0 0 1 ${chainBotR.x} ${chainBotR.y}` +
    ` L ${chainBotL.x} ${chainBotL.y}` +
    ` A ${SPROCKET_R} ${SPROCKET_R} 0 0 1 ${chainTopL.x} ${chainTopL.y} Z`;

  return (
    <g>
      <path
        d={chainPath}
        stroke={FRAME_DARK}
        strokeWidth="2.6"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d={chainPath}
        stroke="#7a838f"
        strokeWidth="0.7"
        fill="none"
        opacity="0.65"
      />
      <Teeth
        cx={REAR.cx}
        cy={REAR.cy}
        tipR={SPROCKET_R + 0.9}
        baseR={SPROCKET_R - 0.1}
        count={8}
        angleOffset={crankRad * 1.8}
      />
      <circle
        cx={REAR.cx}
        cy={REAR.cy}
        r={SPROCKET_R - 0.4}
        fill="#3c424d"
      />
      <circle
        cx={REAR.cx}
        cy={REAR.cy}
        r={SPROCKET_R - 2.2}
        fill="#7a838f"
        opacity="0.55"
      />
      <Teeth
        cx={BB.cx}
        cy={BB.cy}
        tipR={CHAINRING_R + 1.2}
        baseR={CHAINRING_R - 0.2}
        count={12}
        angleOffset={crankRad}
      />
      <circle cx={BB.cx} cy={BB.cy} r={CHAINRING_R - 0.4} fill="#3c424d" />
      <circle
        cx={BB.cx}
        cy={BB.cy}
        r={CHAINRING_R - 2.2}
        fill="#7a838f"
        opacity="0.5"
      />
      <circle cx={BB.cx} cy={BB.cy} r="2" fill={STROKE_DARK} />
      <line
        x1={BB.cx}
        y1={BB.cy}
        x2={pedalB.x}
        y2={pedalB.y}
        stroke="#3c424d"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1={BB.cx}
        y1={BB.cy}
        x2={pedalA.x}
        y2={pedalA.y}
        stroke={STROKE_DARK}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <rect
        x={pedalB.x - 4.5}
        y={pedalB.y - 1.6}
        width="9"
        height="3.2"
        rx="1"
        fill="#3c424d"
      />
      <rect
        x={pedalA.x - 4.5}
        y={pedalA.y - 1.6}
        width="9"
        height="3.2"
        rx="1"
        fill={STROKE_DARK}
      />
      <line
        x1={pedalB.x - 4}
        y1={pedalB.y}
        x2={pedalB.x + 4}
        y2={pedalB.y}
        stroke="#7a838f"
        strokeWidth="0.5"
        opacity="0.6"
      />
      <line
        x1={pedalA.x - 4}
        y1={pedalA.y}
        x2={pedalA.x + 4}
        y2={pedalA.y}
        stroke="#bcc6d2"
        strokeWidth="0.5"
        opacity="0.7"
      />
    </g>
  );
}

function Teeth({
  cx,
  cy,
  tipR,
  baseR,
  count,
  angleOffset,
}: {
  cx: number;
  cy: number;
  tipR: number;
  baseR: number;
  count: number;
  angleOffset: number;
}) {
  const halfW = (Math.PI * 2) / (count * 2.4);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + angleOffset;
        const tx = cx + Math.cos(a) * tipR;
        const ty = cy + Math.sin(a) * tipR;
        const b1x = cx + Math.cos(a - halfW) * baseR;
        const b1y = cy + Math.sin(a - halfW) * baseR;
        const b2x = cx + Math.cos(a + halfW) * baseR;
        const b2y = cy + Math.sin(a + halfW) * baseR;
        return (
          <polygon
            key={i}
            points={`${tx},${ty} ${b1x},${b1y} ${b2x},${b2y}`}
            fill="#3c424d"
          />
        );
      })}
    </g>
  );
}

function Handlebars() {
  return (
    <g>
      <path
        d="M 162 50 Q 178 44 196 56"
        stroke={FRAME_DARK}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 164 51 Q 178 45 195 56.5"
        stroke="#bcc6d2"
        strokeWidth="0.6"
        fill="none"
        opacity="0.5"
      />
      <circle cx="162" cy="50" r="2.4" fill="#a35d09" />
      <circle cx="196" cy="56" r="2.4" fill="#a35d09" />
      <circle cx="161.4" cy="49.4" r="0.7" fill="#ffd370" opacity="0.7" />
      <circle cx="195.4" cy="55.4" r="0.7" fill="#ffd370" opacity="0.7" />
    </g>
  );
}

function Saddle() {
  return (
    <g>
      <path
        d="M 95 78 Q 110 75 124 78 L 122 82 Q 109 84 96 82 Z"
        fill={STROKE_DARK}
      />
      <path
        d="M 98 78 Q 110 76 121 78"
        stroke="#5a6573"
        strokeWidth="0.6"
        fill="none"
        opacity="0.7"
      />
      <line
        x1="111"
        y1="80"
        x2="111"
        y2="82"
        stroke="#5a6573"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

function Leg({
  hip,
  foot,
  isNear,
  bobOffset,
}: {
  hip: Point;
  foot: Point;
  isNear: boolean;
  bobOffset: number;
}) {
  const hipBob = { x: hip.x, y: hip.y + bobOffset };
  const knee = computeKnee(hipBob, foot, THIGH, SHIN, 1);

  const legColor = isNear ? "url(#legGrad)" : "#6b3a04";
  const footFill = isNear ? "#d97a0e" : "#6b3a04";
  const footEdge = isNear ? "#7a4506" : "#3a2002";

  return (
    <g>
      <line
        x1={hipBob.x}
        y1={hipBob.y}
        x2={knee.x}
        y2={knee.y}
        stroke={legColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1={knee.x}
        y1={knee.y}
        x2={foot.x}
        y2={foot.y - 0.5}
        stroke={legColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx={knee.x} cy={knee.y} r="1.1" fill={legColor} />
      <path
        d={
          `M ${foot.x - 1.8} ${foot.y - 0.8}` +
          ` L ${foot.x + 5} ${foot.y - 0.4}` +
          ` Q ${foot.x + 6.4} ${foot.y + 0.4} ${foot.x + 5} ${foot.y + 1.4}` +
          ` L ${foot.x - 1.8} ${foot.y + 1.2} Z`
        }
        fill={footFill}
        stroke={footEdge}
        strokeWidth="0.4"
      />
      <line
        x1={foot.x + 3}
        y1={foot.y - 0.3}
        x2={foot.x + 4.6}
        y2={foot.y - 0.5}
        stroke={footEdge}
        strokeWidth="0.3"
      />
      <line
        x1={foot.x + 3}
        y1={foot.y + 0.9}
        x2={foot.x + 4.6}
        y2={foot.y + 1.1}
        stroke={footEdge}
        strokeWidth="0.3"
      />
    </g>
  );
}

function computeKnee(
  hip: Point,
  foot: Point,
  thigh: number,
  shin: number,
  bendDir: 1 | -1,
): Point {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const dRaw = Math.hypot(dx, dy);
  const minD = Math.abs(thigh - shin) + 0.01;
  const maxD = thigh + shin - 0.01;
  const d = Math.max(minD, Math.min(maxD, dRaw));
  const cosA = (thigh * thigh + d * d - shin * shin) / (2 * thigh * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const baseAngle = Math.atan2(dy, dx);
  const kneeAngle = baseAngle + bendDir * a;
  return {
    x: hip.x + Math.cos(kneeAngle) * thigh,
    y: hip.y + Math.sin(kneeAngle) * thigh,
  };
}

function Pelican({
  bobOffset,
  wingFlap,
  tailTwitch,
  beakOpen,
  blink,
  crestWiggle,
  pouchSway,
}: {
  bobOffset: number;
  wingFlap: number;
  tailTwitch: number;
  beakOpen: number;
  blink: number;
  crestWiggle: number;
  pouchSway: number;
}) {
  return (
    <g transform={`translate(0 ${bobOffset})`}>
      <g transform={`translate(0 ${tailTwitch})`}>
        <Tail />
      </g>
      <Body />
      <g transform={`translate(0 ${wingFlap})`}>
        <Wing />
      </g>
      <Head
        beakOpen={beakOpen}
        blink={blink}
        crestWiggle={crestWiggle}
        pouchSway={pouchSway}
      />
    </g>
  );
}

function Tail() {
  return (
    <g>
      <polygon points="64,50 84,46 84,55" fill="#9ba4b1" />
      <polygon points="64,57 85,53 84,62" fill="#bcc6d2" />
      <polygon points="65,63 86,60 85,68" fill="#dde3ec" />
      <line
        x1="68"
        y1="50"
        x2="82"
        y2="48"
        stroke="#7a838f"
        strokeWidth="0.4"
        opacity="0.7"
      />
      <line
        x1="68"
        y1="58"
        x2="82"
        y2="56"
        stroke="#7a838f"
        strokeWidth="0.4"
        opacity="0.6"
      />
      <line
        x1="68"
        y1="64"
        x2="82"
        y2="62"
        stroke="#aab5c2"
        strokeWidth="0.4"
        opacity="0.5"
      />
    </g>
  );
}

function Body() {
  return (
    <g>
      <ellipse
        cx="105"
        cy="55"
        rx="36"
        ry="22"
        fill="url(#bodyGrad)"
      />
      <ellipse
        cx="105"
        cy="65"
        rx="28"
        ry="11"
        fill="url(#bellyGrad)"
        opacity="0.7"
      />
      <path
        d="M 80 58 Q 84 62 80 66"
        stroke="#cdd5df"
        strokeWidth="0.5"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M 86 60 Q 89 64 85 68"
        stroke="#cdd5df"
        strokeWidth="0.5"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 92 61 Q 94 65 91 69"
        stroke="#cdd5df"
        strokeWidth="0.5"
        fill="none"
        opacity="0.45"
      />
      <ellipse
        cx="105"
        cy="55"
        rx="36"
        ry="22"
        fill="none"
        stroke="#bcc6d2"
        strokeWidth="0.6"
        opacity="0.4"
      />
    </g>
  );
}

function Wing() {
  return (
    <g>
      <ellipse
        cx="106"
        cy="52"
        rx="26"
        ry="11"
        fill="url(#wingGrad)"
      />
      <ellipse
        cx="119"
        cy="48"
        rx="9"
        ry="5"
        fill="#bcc6d2"
        opacity="0.4"
      />
      <path
        d="M 86 52 Q 106 64 128 52"
        stroke="#7a838f"
        strokeWidth="0.7"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 84 50 Q 92 51 96 54"
        stroke="#5a6573"
        strokeWidth="0.6"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M 86 47 Q 94 48 99 52"
        stroke="#5a6573"
        strokeWidth="0.6"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M 89 44 Q 96 46 103 49"
        stroke="#5a6573"
        strokeWidth="0.6"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 93 42 Q 100 44 108 46"
        stroke="#5a6573"
        strokeWidth="0.6"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 96 50 Q 110 54 124 50"
        stroke="#9ba4b1"
        strokeWidth="0.5"
        fill="none"
        opacity="0.55"
      />
    </g>
  );
}

function Head({
  beakOpen,
  blink,
  crestWiggle,
  pouchSway,
}: {
  beakOpen: number;
  blink: number;
  crestWiggle: number;
  pouchSway: number;
}) {
  const beakOpenAngle = beakOpen * 12;
  return (
    <g>
      <path
        d="M 128 50 Q 134 32 152 20 L 162 24 Q 148 38 138 56 Z"
        fill="url(#bodyGrad)"
      />
      <path
        d="M 138 56 Q 148 38 162 24"
        stroke="#bcc6d2"
        strokeWidth="0.6"
        fill="none"
        opacity="0.5"
      />
      <ellipse
        cx="160"
        cy="16"
        rx="13"
        ry="11"
        fill="url(#headGrad)"
      />
      <path
        d="M 148 14 Q 152 22 158 25"
        stroke="#bcc6d2"
        strokeWidth="0.5"
        fill="none"
        opacity="0.55"
      />
      <Crest wiggle={crestWiggle} />
      <path
        d="M 168 13 L 200 14 L 178 18 Z"
        fill="url(#beakUpperGrad)"
      />
      <path
        d="M 168 13 L 200 14"
        stroke="#a35d09"
        strokeWidth="0.4"
        fill="none"
        opacity="0.7"
      />
      <circle cx="200" cy="14" r="1" fill="#5a3603" />
      <ellipse
        cx="170"
        cy="14.5"
        rx="2"
        ry="0.8"
        fill="#ffd370"
        opacity="0.5"
      />
      <g transform={`rotate(${beakOpenAngle} 170 18)`}>
        <LowerBeak pouchSway={pouchSway} />
      </g>
      <circle cx="163" cy="11.4" r="2.6" fill="#ffffff" />
      <circle
        cx="163.4"
        cy="11.6"
        r={1.7 * (1 - blink * 0.9)}
        fill="#1d2530"
      />
      <circle
        cx="164.2"
        cy="10.6"
        r={0.7 * (1 - blink)}
        fill="#ffffff"
      />
      <ellipse
        cx="163"
        cy="11.4"
        rx="2.6"
        ry={Math.max(0.001, 2.6 * blink)}
        fill="#cdd5df"
        opacity={blink > 0.01 ? 0.95 : 0}
      />
      <path
        d="M 159.5 8 Q 163.5 7 167 9"
        stroke="#aab5c2"
        strokeWidth="0.5"
        fill="none"
        opacity="0.6"
      />
    </g>
  );
}

function Crest({ wiggle }: { wiggle: number }) {
  return (
    <g>
      <path
        d={`M 152 6 Q ${156 + wiggle} 0 160 6`}
        stroke="#aab5c2"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M 156 4 Q ${160 + wiggle * 0.8} -1 164 5`}
        stroke="#bcc6d2"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M 159 4 Q ${162 + wiggle * 1.2} -2 166 5`}
        stroke="#9ba4b1"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

function LowerBeak({ pouchSway }: { pouchSway: number }) {
  return (
    <g>
      <path
        d="M 170 18 L 200 14 L 192 22 Q 180 26 170 22 Z"
        fill="url(#beakLowerGrad)"
      />
      <path
        d={
          `M 170 22` +
          ` Q ${178 + pouchSway} 30 187 ${28 + pouchSway * 0.4}` +
          ` Q 192 25 192 22` +
          ` Q 184 24 170 22 Z`
        }
        fill="url(#pouchGrad)"
      />
      <path
        d="M 175 24 Q 182 27 188 26"
        stroke="#a35d09"
        strokeWidth="0.4"
        fill="none"
        opacity="0.55"
      />
    </g>
  );
}
