// vitest.config.ts for RectPlacer
// Copyright (C) 2026 KONNO Akihisa
//
// Kept separate from vite.config.ts: the app's Vite config sets
// root: "src" for its multi-page (index/docs) build, which is
// unrelated to running unit tests against source files.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
