import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  define: {
    __GLOBE_DEMO_BUILD__: JSON.stringify(process.env.VITE_GLOBE_DEMOS === "1"),
  },
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
