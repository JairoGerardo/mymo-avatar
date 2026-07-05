import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  root: resolve(__dirname, "renderer"),
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@mymosdk/avatar": resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
})
