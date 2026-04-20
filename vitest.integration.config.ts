import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    // Integration tests are sequential — each test manipulates shared DB state
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["tests/integration/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
