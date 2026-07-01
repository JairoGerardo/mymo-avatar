import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"

export default defineConfig({
  plugins: [vue(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (fmt) => `index.${fmt === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: ["vue", "@mymo/avatar"],
    },
  },
})
