// vite.config.ts for Hanoi Simulator site
// Copyright (C) 2024-2025 KONNO Akihisa
import { defineConfig } from "vite";
import vue from '@vitejs/plugin-vue';
import { resolve } from "node:path";

export default defineConfig({
    plugins: [vue()],
    base: "/RectPlacer/",
  root: resolve(__dirname, "src"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src/index.html"),
        doc_index: resolve(__dirname, "src/docs/index.html"),
      },
    },
  },
});
