import { defineConfig } from "astro/config";
import { isAbsolute, relative, resolve } from "node:path";

const caseStudyRoot = resolve("case-studies");

const caseStudyHotReload = {
  name: "case-study-hot-reload",
  hooks: {
    "astro:server:setup": ({ server }) => {
      server.watcher.add(caseStudyRoot);

      server.watcher.on("all", (event, file) => {
        if (!new Set(["add", "change", "unlink"]).has(event)) return;

        const relativePath = relative(caseStudyRoot, resolve(file));
        const isCaseStudy =
          relativePath.endsWith(".mdx") &&
          !relativePath.startsWith("..") &&
          !isAbsolute(relativePath);

        if (!isCaseStudy) return;

        server.environments.ssr.hot.send("astro:content-changed", {});
        server.environments.client.hot.send({
          type: "full-reload",
          path: "*"
        });
      });
    }
  }
};

export default defineConfig({
  integrations: [caseStudyHotReload],
  devToolbar: {
    enabled: false
  },
  output: "static",
  vite: {
    optimizeDeps: {
      include: [
        "three",
        "three/examples/jsm/loaders/DRACOLoader.js",
        "three/examples/jsm/loaders/GLTFLoader.js"
      ]
    },
    build: {
      chunkSizeWarningLimit: 700
    }
  }
});
