import { defineConfig } from "vite"
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import { resolve } from "path"

export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
  resolve: {
    alias: {
      "@mymosdk/avatar": resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
})
