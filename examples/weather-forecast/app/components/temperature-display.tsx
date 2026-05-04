type TemperatureDisplayProps = {
  city: string;
  maxTemperature: number;
  displayTemperature?: number;
  width: number;
  height: number;
};

export function TemperatureDisplay({
  city,
  maxTemperature,
  displayTemperature = maxTemperature,
  width,
  height,
}: TemperatureDisplayProps) {
  const cityFontSize = Math.round(width * 0.045);
  const tempFontSize = Math.round(width * 0.28);
  const cityLetterSpacing = Math.round(cityFontSize * 0.18);
  const cityTop = Math.round(height * 0.28);
  const tempTop = Math.round(height * 0.34);
  const shadow = `0 ${Math.round(width * 0.005)}px ${Math.round(width * 0.012)}px rgba(0,0,0,0.25)`;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          marginTop: cityTop,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: cityFontSize,
          letterSpacing: cityLetterSpacing,
          color: "#ffffff",
          textTransform: "uppercase",
          textShadow: shadow,
        }}
      >
        {city.toUpperCase()}
      </div>
      <div
        style={{
          marginTop: tempTop - cityTop - cityFontSize,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: tempFontSize,
          color: "#ffffff",
          textShadow: shadow,
          lineHeight: 1,
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        {Math.round(displayTemperature)}
        <span
          style={{
            fontSize: tempFontSize * 0.55,
            marginTop: tempFontSize * 0.05,
            marginLeft: tempFontSize * 0.02,
          }}
        >
          °
        </span>
      </div>
    </div>
  );
}
