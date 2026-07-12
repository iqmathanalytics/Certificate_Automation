import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  // App lives at www.iqmath.in/certificates and certificate-automation.pages.dev/certificates
  base: "/certificates/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Nest under /certificates so asset URLs like /certificates/assets/*.js resolve on Pages
    outDir: "dist/certificates",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
