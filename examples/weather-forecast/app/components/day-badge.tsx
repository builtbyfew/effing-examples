type DayBadgeProps = {
  dateLabel: string;
  width: number;
  height: number;
};

export function DayBadge({ dateLabel, width, height }: DayBadgeProps) {
  const fontSize = Math.round(width * 0.03);
  const padX = Math.round(fontSize * 0.9);
  const padY = Math.round(fontSize * 0.55);
  const topOffset = Math.round(width * 0.13);
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
        justifyContent: "center",
        paddingTop: topOffset,
      }}
    >
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize,
          letterSpacing: Math.round(fontSize * 0.1),
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.45)",
          paddingTop: padY,
          paddingBottom: padY,
          paddingLeft: padX,
          paddingRight: padX,
          borderRadius: fontSize * 1.2,
        }}
      >
        {dateLabel}
      </div>
    </div>
  );
}
