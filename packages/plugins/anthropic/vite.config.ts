import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { resolve } from "path"

export default defineConfig({
  plugins: [dts({ include: ["src"], outDir: "dist", rollupTypes: false })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => format === "es" ? "index.js" : "index.cjs",
    },
    rollupOptions: {
      external: ["@mymosdk/avatar", "@anthropic-ai/sdk"],
    },
    sourcemap: true,
    minify: "esbuild",
    target: "es2020",
  },
})
