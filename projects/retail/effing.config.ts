import { defineConfig } from "@effing/dev";

export default defineConfig({
  project: "retail",
  images: "app/images/*.fn.tsx",
  annies: "app/annies/*.fn.tsx",
  effies: "app/effies/*.fn.tsx",
  dev: {
    host: "127.0.0.1",
    port: 4839, // off the 3839 (0xEFF) default so it can run next to other example projects
    ffs: true, // auto-start FFS sidecar (when installed)
    resolutions: [
      { width: 1080, height: 1080, label: "1:1" },
      { width: 1080, height: 1350, label: "4:5" },
      { width: 1080, height: 1920, label: "9:16" },
    ],
  },
});
