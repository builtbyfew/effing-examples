import { designUnit } from "./design-unit";

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
  const unit = designUnit(width, height);
  const cityFontSize = Math.round(unit * 0.06);
  const tempFontSize = Math.round(unit * 0.26);
  const cityLetterSpacing = Math.round(cityFontSize * 0.22);
  const shadow = `0 ${Math.round(unit * 0.005)}px ${Math.round(unit * 0.012)}px rgba(0,0,0,0.25)`;
  const padLeft = Math.round(width * 0.08);
  const padTop = Math.round(height * 0.17);

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
        alignItems: "flex-start",
        paddingTop: padTop,
        paddingLeft: padLeft,
      }}
    >
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: cityFontSize,
          letterSpacing: cityLetterSpacing,
          color: "#ffffff",
          textTransform: "uppercase",
          textShadow: shadow,
          marginBottom: Math.round(cityFontSize * 0.4),
        }}
      >
        {city.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: tempFontSize,
          color: "#ffffff",
          textShadow: shadow,
          lineHeight: 0.9,
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        {Math.round(displayTemperature)}
        <span
          style={{
            fontSize: tempFontSize * 0.55,
            marginTop: tempFontSize * 0.02,
            marginLeft: tempFontSize * 0.02,
          }}
        >
          °
        </span>
      </div>
    </div>
  );
}
