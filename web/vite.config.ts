import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // In dev, /api goes to the Node API. In production the API serves the built files itself.
  server: { proxy: { "/api": process.env.API_URL ?? "http://localhost:3000" } },
});
