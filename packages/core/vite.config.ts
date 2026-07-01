import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { resolve } from "path"

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      outDir: "dist",
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MymoAvatar",
      formats: ["es", "cjs", "umd"],
      fileName: (format) => {
        if (format === "es") return "mymo-avatar.js"
        if (format === "cjs") return "mymo-avatar.cjs"
        return "mymo-avatar.umd.js"
      },
    },
    rollupOptions: {
      external: ["three"],
      output: {
        globals: {
          three: "THREE",
        },
      },
    },
    sourcemap: true,
    minify: "esbuild",
    target: "es2020",
  },
})
