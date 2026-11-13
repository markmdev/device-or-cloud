import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const project = JSON.parse(readFileSync(".firebaserc", "utf8")).projects.default;

export default defineConfig({
  plugins: [react()],
  build: { target: "es2022", rollupOptions: { input: ["index.html", "shop/index.html"] } },
  // The dev server reads the project's config from the live site, as Firebase Hosting serves it.
  server: { host: "127.0.0.1", proxy: { "/__": { target: `https://${project}.web.app`, changeOrigin: true } } },
});
