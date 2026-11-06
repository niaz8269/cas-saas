import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor files: they stay cached across deploys, and download in parallel.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "vendor-react"
          if (id.includes("@tanstack")) return "vendor-query"
          if (id.includes("i18next")) return "vendor-i18n"
          if (id.includes("lucide-react")) return "vendor-icons"
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Local API (nginx in docker compose); keeps the SPA same-origin in dev.
      // Inside the compose network the target is http://web:80 (see compose.yml).
      "/api": process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8080",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: false,
  },
})
