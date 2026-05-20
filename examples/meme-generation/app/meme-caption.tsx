// Impact-style meme caption: Anton + white with black stroke and drop shadow.
// Caller is responsible for loading the Anton font.
export function memeCaptionTextStyle(fontSize: number): React.CSSProperties {
  const strokeWidth = Math.max(2, Math.round(fontSize / 18));
  return {
    fontFamily: "Anton",
    fontSize,
    color: "#ffffff",
    lineHeight: 1.05,
    WebkitTextStroke: `${strokeWidth}px #000000`,
    textShadow: `0 ${Math.round(strokeWidth * 0.8)}px ${strokeWidth * 2}px rgba(0,0,0,0.45)`,
  };
}

export function MemeCaption({
  text,
  fontSize,
  textAlign = "center",
}: {
  text: string;
  fontSize: number;
  textAlign?: "left" | "center" | "right";
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        textAlign,
        letterSpacing: 1,
        ...memeCaptionTextStyle(fontSize),
      }}
    >
      {text}
    </div>
  );
}
