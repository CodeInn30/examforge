import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "unit",
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/generated/**", "lib/email-templates/**"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
