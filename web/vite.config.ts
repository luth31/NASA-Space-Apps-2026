import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          globe: ["three"],
          react: ["react", "react-dom"],
          motion: ["motion"],
        },
      },
    },
  },
});
