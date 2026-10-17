import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { brandChain, mergeBrand, pruneBrandAssets, resolveBrand } from "@/brand/resolve";

function brandsDir(brands: Record<string, object>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brands-"));
  for (const [slug, json] of Object.entries(brands)) {
    fs.mkdirSync(path.join(dir, slug));
    fs.writeFileSync(path.join(dir, slug, "brand.json"), JSON.stringify(json));
  }
  return dir;
}

function error(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return "";
}

describe("brand extends", () => {
  it("merges objects field by field and lets the child win", () => {
    const merged = mergeBrand({ a: { x: 1, y: 2 }, b: 1 }, { a: { y: 3 }, c: 4 });
    expect(merged).toEqual({ a: { x: 1, y: 3 }, b: 1, c: 4 });
  });

  it("replaces arrays and does not merge them", () => {
    expect(mergeBrand({ flows: ["a", "b"] }, { flows: ["c"] })).toEqual({ flows: ["c"] });
  });

  it("builds the child from its parent and drops the extends key", () => {
    const dir = brandsDir({
      base: { slug: "base", title: "Base", program: { name: "Drug", colors: { primary: "#111" } }, enabledFlows: ["a", "b"] },
      kid: { extends: "base", slug: "kid", enabledFlows: ["a"], program: { colors: { primary: "#222" } } },
    });
    expect(resolveBrand(dir, "kid")).toEqual({
      slug: "kid",
      title: "Base",
      program: { name: "Drug", colors: { primary: "#222" } },
      enabledFlows: ["a"],
    });
  });

  it("follows a chain of parents, root first", () => {
    const dir = brandsDir({ a: { slug: "a", v: 1 }, b: { extends: "a", slug: "b", w: 2 }, c: { extends: "b", slug: "c", v: 3 } });
    expect(brandChain(dir, "c")).toEqual(["c", "b", "a"]);
    expect(resolveBrand(dir, "c")).toEqual({ slug: "c", v: 3, w: 2 });
  });

  it("rejects a loop", () => {
    const dir = brandsDir({ a: { extends: "b", slug: "a" }, b: { extends: "a", slug: "b" } });
    expect(error(() => resolveBrand(dir, "a")).includes("loops")).toBe(true);
  });

  it("rejects a parent that does not exist", () => {
    const dir = brandsDir({ a: { extends: "ghost", slug: "a" } });
    expect(error(() => resolveBrand(dir, "a")).includes('extends "ghost"')).toBe(true);
  });
});

describe("brand asset isolation", () => {
  it("removes every brand image folder except the ones kept", () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), "dist-"));
    for (const slug of ["mine", "parent", "other", "another"]) {
      fs.mkdirSync(path.join(dist, "brands", slug), { recursive: true });
      fs.writeFileSync(path.join(dist, "brands", slug, "logo.png"), "x");
    }
    fs.writeFileSync(path.join(dist, "favicon.png"), "x");
    const removed = pruneBrandAssets(dist, ["mine", "parent"]);
    expect(removed.sort()).toEqual(["another", "other"]);
    expect(fs.readdirSync(path.join(dist, "brands")).sort()).toEqual(["mine", "parent"]);
    expect(fs.existsSync(path.join(dist, "favicon.png"))).toBe(true);
  });

  it("does nothing when the build has no brands folder", () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), "dist-"));
    expect(pruneBrandAssets(dist, ["mine"])).toEqual([]);
  });
});
