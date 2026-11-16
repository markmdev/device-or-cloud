import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const project = JSON.parse(readFileSync(".firebaserc", "utf8")).projects.default;

// FIREBASE_CONFIG names a file with another Firebase project's web config. A recording runs on a project of its own,
// because the free cloud requests are counted by project and a recording would use up the live site's day.
const other = process.env.FIREBASE_CONFIG;
const ownProject: Plugin = {
  name: "own-project",
  configureServer(server) {
    server.middlewares.use("/__/firebase/init.json", (_, response) => {
      response.setHeader("Content-Type", "application/json");
      response.end(readFileSync(other!));
    });
  },
};

export default defineConfig({
  plugins: [react(), other && ownProject],
  build: { target: "es2022", rollupOptions: { input: ["index.html", "shop/index.html", "own/index.html", "results/index.html", "label/index.html", "samples/index.html", "samples/results/index.html"] } },
  // The dev server reads the project's config from the live site, as Firebase Hosting serves it.
  server: { host: "127.0.0.1", proxy: { "/__": { target: `https://${project}.web.app`, changeOrigin: true } } },
});
