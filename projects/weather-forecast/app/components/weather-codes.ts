export type WeatherCategory =
  | "clear"
  | "partly_cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export function wmoCategory(code: number): WeatherCategory {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly_cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunder";
  return "overcast";
}

export type SkyGradient = { top: string; bottom: string };

export function skyGradient(category: WeatherCategory): SkyGradient {
  switch (category) {
    case "clear":
      return { top: "#3aa6ff", bottom: "#a0d8ff" };
    case "partly_cloudy":
      return { top: "#5aa9d6", bottom: "#bcd6e6" };
    case "overcast":
      return { top: "#7d8a96", bottom: "#b6bec6" };
    case "fog":
      return { top: "#a8b0b6", bottom: "#dde0e2" };
    case "drizzle":
      return { top: "#5e7a92", bottom: "#9bb0bf" };
    case "rain":
      return { top: "#3f5666", bottom: "#7d94a3" };
    case "snow":
      return { top: "#9fb6c8", bottom: "#e3ecf2" };
    case "thunder":
      return { top: "#2d2f3a", bottom: "#5b6172" };
  }
}
