// Impact-style meme caption: Anton + white with black stroke and drop shadow.
// Caller is responsible for loading the Anton font.
export function MemeCaption({
  text,
  fontSize,
  textAlign = "center",
}: {
  text: string;
  fontSize: number;
  textAlign?: "left" | "center" | "right";
}) {
  const strokeWidth = Math.max(2, Math.round(fontSize / 18));
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        fontFamily: "Anton",
        fontSize,
        color: "#ffffff",
        textAlign,
        lineHeight: 1.05,
        letterSpacing: 1,
        WebkitTextStroke: `${strokeWidth}px #000000`,
        textShadow: `0 ${Math.round(strokeWidth * 0.8)}px ${strokeWidth * 2}px rgba(0,0,0,0.45)`,
      }}
    >
      {text}
    </div>
  );
}
