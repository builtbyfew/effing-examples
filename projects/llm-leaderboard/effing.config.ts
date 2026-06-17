import { defineConfig } from "@effing/dev";

export default defineConfig({
  project: "llm-leaderboard",
  images: "app/images/*.fn.tsx",
  annies: "app/annies/*.fn.tsx",
  effies: "app/effies/*.fn.tsx",
  dev: {
    // The leaderboard is designed for a 6:5 frame (1080×900) — keep that
    // first so previews default to it. The scenes scale uniformly, so the
    // taller social ratios work too.
    resolutions: [
      { width: 1080, height: 900, label: "6:5" },
      { width: 1080, height: 1350, label: "4:5" },
      { width: 1080, height: 1920, label: "9:16" },
    ],
  },
});
