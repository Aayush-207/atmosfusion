import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  // maplibre-gl v6 loads its worker relative to its own module; pre-bundling breaks that URL
  optimizeDeps: { exclude: ["maplibre-gl"] },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
