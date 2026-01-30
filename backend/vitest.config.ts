// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.*/**"],
    globalSetup: "./logic/test-helpers/global-setup.ts",
    sequence: {
      concurrent: false,
      shuffle: {
        files: true,
      },
    },
  },
});
