import { defineConfig } from "@effing/dev";

export default defineConfig({
  project: "weather-forecast",
  images: "app/images/*.fn.tsx",
  annies: "app/annies/*.fn.tsx",
  effies: "app/effies/*.fn.tsx",
  dev: {
    // Other dev options (host, port, ffs) use their defaults; the scenes in
    // this project are designed for 4:5 and 9:16 only.
    resolutions: [
      { width: 1080, height: 1350, label: "4:5" },
      { width: 1080, height: 1920, label: "9:16" },
    ],
  },
});
