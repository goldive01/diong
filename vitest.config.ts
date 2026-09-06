import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

// Minimal unit-test setup for pure application/domain logic only.
// No DOM, no app runtime — matches how the connections lib code is written.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
