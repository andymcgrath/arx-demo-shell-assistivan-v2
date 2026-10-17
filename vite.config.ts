import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

/**
 * The brand is chosen at build time. Set BRAND=<slug> to bundle brands/<slug>/brand.json.
 * The default is the internal demo brand. An unknown slug fails the build.
 */
const brandSlug = process.env.BRAND || "assistivan";
const brandFile = path.resolve(__dirname, "brands", brandSlug, "brand.json");
if (!fs.existsSync(brandFile)) {
  const known = fs.readdirSync(path.resolve(__dirname, "brands")).join(", ");
  throw new Error(`BRAND="${brandSlug}" has no brands/${brandSlug}/brand.json. Known brands: ${known}`);
}
const brand = JSON.parse(fs.readFileSync(brandFile, "utf8"));

export default defineConfig({
  plugins: [react()],
  define: { __BRAND__: JSON.stringify(brand) },
  resolve: {
    alias: {
      // The one alias. Portal code imports "@/portals/<name>/..." and the UI kit lives at "@/ui/...".
      "@": path.resolve(__dirname, "./client"),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
});
