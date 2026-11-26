import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    target: "es2018",
    cssTarget: "chrome64",
  },
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: [
        "defaults",
        "not IE 11",
        "iOS >= 12",
        "Safari >= 12",
        "Chrome >= 64",
        "Android >= 7",
      ],
    }),
    cloudflare({
      configPath: "../api/wrangler.jsonc",
    }),
  ],
});
