import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

export default defineConfig({
  base: "/leadwithAI/",
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: "stats.html",
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'charts-vendor';
          }
          if (id.includes('node_modules/qrcode.react')) {
            return 'qrcode-vendor';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/wouter/')) {
            return 'core-frameworks';
          }
        }
      }
    }
  },

  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },

  preview: {
    port: 5173,
    host: true,
  },
});