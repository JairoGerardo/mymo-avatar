import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { resolve } from "path"

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        "mymo-avatar": resolve(__dirname, "src/index.ts"),
        "react": resolve(__dirname, "src/react/index.ts"),
        "vue": resolve(__dirname, "src/vue/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
    },
    rollupOptions: {
      external: ["three", "react", "react/jsx-runtime", "vue", "@pixiv/three-vrm"],
      output: {
        globals: {
          three: "THREE",
          react: "React",
          "react/jsx-runtime": "ReactJSXRuntime",
          vue: "Vue",
        },
      },
    },
    sourcemap: true,
    minify: "esbuild",
    target: "es2020",
  },
})
