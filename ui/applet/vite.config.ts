import { defineConfig } from "vite";
import { resolve } from "path";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: "eslint --ext .ts,.html . --ignore-path .gitignore",
      },
    }),
  ],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/index.ts"),
    },
  },
});
