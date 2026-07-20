import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "ui",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    target: "safari15",
  },
  clearScreen: false,
  server: { port: 5173, strictPort: true },
});
