import { designUnit } from "./design-unit";

type DayBadgeProps = {
  dateLabel: string;
  width: number;
  height: number;
};

// Quiet pill anchored in the top-left corner with equal top/left margins —
// reads as a subtle corner tag rather than a label above the type column.
export function DayBadge({ dateLabel, width, height }: DayBadgeProps) {
  const unit = designUnit(width, height);
  const fontSize = Math.round(unit * 0.035);
  const padX = Math.round(fontSize * 0.75);
  const padY = Math.round(fontSize * 0.4);
  const letterSpacing = Math.round(fontSize * 0.18);
  const corner = Math.round(width * 0.08);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        paddingTop: corner,
        paddingLeft: corner,
      }}
    >
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize,
          letterSpacing,
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.28)",
          paddingTop: padY,
          paddingBottom: padY,
          paddingLeft: padX,
          paddingRight: padX,
          borderRadius: fontSize * 1.0,
        }}
      >
        {dateLabel}
      </div>
    </div>
  );
}
