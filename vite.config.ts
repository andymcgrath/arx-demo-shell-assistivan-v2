import { defineConfig, type Plugin } from "vite";
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

/** Puts the brand title and favicon in the HTML at build time. Falls back to what index.html says. */
function brandHtmlPlugin(brand: { title?: string; favicon?: string }): Plugin {
  return {
    name: "brand-html",
    transformIndexHtml(html) {
      let out = html;
      if (brand.title) out = out.replace(/<title>[^<]*<\/title>/, `<title>${brand.title}</title>`);
      if (brand.favicon) {
        const type = brand.favicon.endsWith(".svg") ? "image/svg+xml" : "image/png";
        out = out.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="${type}" href="${brand.favicon}" />`);
      }
      return out;
    },
  };
}

export default defineConfig({
  plugins: [react(), brandHtmlPlugin(brand)],
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
