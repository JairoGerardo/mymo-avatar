import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@mymosdk/avatar": resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
})
