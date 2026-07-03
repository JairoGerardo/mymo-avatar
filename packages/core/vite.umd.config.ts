import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MymoAvatar",
      formats: ["umd"],
      fileName: () => "mymo-avatar.umd.js",
    },
    rollupOptions: {
      external: ["three"],
      output: {
        globals: { three: "THREE" },
      },
    },
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    minify: "esbuild",
    target: "es2020",
  },
})
