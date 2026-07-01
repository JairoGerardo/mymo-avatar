import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@mymo/avatar": resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
})
