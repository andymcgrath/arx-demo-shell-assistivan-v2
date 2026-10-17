import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { brandChain, pruneBrandAssets, resolveBrand } from "./client/brand/resolve";

/**
 * The brand is chosen at build time. Set BRAND=<slug> to bundle brands/<slug>/brand.json.
 * The default is the internal demo brand. An unknown slug fails the build.
 */
const brandSlug = process.env.BRAND || "assistivan";
const brandsDir = path.resolve(__dirname, "brands");
if (!fs.existsSync(path.join(brandsDir, brandSlug, "brand.json"))) {
  const known = fs.readdirSync(brandsDir).filter((d) => !d.startsWith("_")).join(", ");
  throw new Error(`BRAND="${brandSlug}" has no brands/${brandSlug}/brand.json. Known brands: ${known}`);
}
// resolveBrand follows "extends", so a brand can start from another one.
const brand = resolveBrand(brandsDir, brandSlug) as { title?: string; favicon?: string };

/** Keeps only this brand's images (and its parents') in the build. Other clients' images never ship. */
function brandAssetIsolationPlugin(keep: string[]): Plugin {
  let outDir = "";
  return {
    name: "brand-asset-isolation",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      pruneBrandAssets(outDir, keep);
    },
  };
}

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
  plugins: [react(), brandHtmlPlugin(brand), brandAssetIsolationPlugin(brandChain(brandsDir, brandSlug))],
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
