import { defineConfig } from "@effing/dev";

export default defineConfig({
  project: "llm-leaderboard",
  images: "app/images/*.fn.tsx",
  annies: "app/annies/*.fn.tsx",
  effies: "app/effies/*.fn.tsx",
  dev: {
    // The original and slick cuts are designed for a 6:5 frame (1080×900) —
    // keep that first so previews default to it. The split-flap "flap" cut is
    // authored 16:9 (a departure board wants to be wide) — preview it at
    // 1920×1080.
    resolutions: [
      { width: 1080, height: 900, label: "6:5" },
      { width: 1920, height: 1080, label: "16:9" },
    ],
  },
});
