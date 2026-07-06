import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/types/**",
        // WebGL-dependent: untestable in jsdom
        "src/renderer/**",
        "src/loader/**",
        // Framework adapters: require peer runtime environments
        "src/angular/**",
        "src/react/**",
        "src/svelte/**",
        "src/vue/**",
        "src/index.ts",
      ],
      thresholds: {
        statements: 50,
        branches: 75,
        functions: 70,
        lines: 50,
      },
    },
  },
})
