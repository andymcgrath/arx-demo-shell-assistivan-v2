import { describe, it, expect } from "vitest";
import { validateDemoRequest, ghostCards, type DemoRequest } from "@/workflows/catalog/request";
import { buildPrompt } from "@/workflows/catalog/prompt";

/** The demo request is the source of truth for a build. The validator rejects what the build could not use. */

const GHOST = { kind: "ghost", name: "White-label pharmacy intake", sees: "The pharmacy form under the client's name", app: "provider", lane: "hcp" } as const;

const request = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  version: 1,
  client: "mirum",
  slug: "abv-apa",
  title: "ABV with APA to the HCP",
  workflow: "iassist",
  intake: "erx",
  apps: ["crm", "patient", "iassist"],
  forks: ["bi", "pa"],
  cards: [
    { kind: "block", moduleId: "enrollment" },
    { kind: "block", moduleId: "pa_notification", variantId: "hcp_administered" },
    { kind: "block", moduleId: "pharmacy_selection", variantId: "assigned" },
    GHOST,
    { kind: "block", moduleId: "tracking" },
  ],
  demos: [{ id: "specialty-pharmacy", label: "Specialty pharmacy ships", choices: { bi: "medical_pa_required", pa: "approved" } }],
  brand: { name: "Mirum", drug: "Drug", sourceUrl: "https://example.com", documents: ["brochure.pdf"] },
  winTheme: "One handoff from referral to shipment",
  openQuestions: ["Is the specialty pharmacy ours?"],
  ...over,
});

const problems = (over: Record<string, unknown>): string[] => {
  const r = validateDemoRequest(request(over));
  return r.ok ? [] : r.problems;
};

describe("validateDemoRequest", () => {
  it("accepts a complete request", () => {
    const r = validateDemoRequest(request());
    expect(r.ok).toBe(true);
  });

  it("rejects a value that is not an object, and an unknown field (so a request cannot carry a path)", () => {
    expect(validateDemoRequest("x")).toEqual({ ok: false, problems: ["the request must be a JSON object"] });
    expect(problems({ path: "../../etc" })).toContain('unknown field "path"');
  });

  it("rejects a client or slug that is not plain words joined by hyphens", () => {
    for (const bad of ["../x", "a/b", "A", "a b", "", "a--b", "-a"]) {
      expect(problems({ client: bad }).join(), bad).toContain("client must be");
      expect(problems({ slug: bad }).join(), bad).toContain("slug must be");
    }
  });

  it("requires a win theme, and takes no demo date or indication", () => {
    expect(problems({ winTheme: "  " })).toContain("win theme is required");
    expect(problems({ demoDate: "2026-12-01" })).toContain('unknown field "demoDate"');
  });

  it("rejects a block or variant the catalog does not have", () => {
    expect(problems({ cards: [{ kind: "block", moduleId: "nope" }] })[0]).toContain('module "nope"');
    expect(problems({ cards: [{ kind: "block", moduleId: "payment", variantId: "x" }] })[0]).toContain('variant "x"');
    expect(problems({ cards: [{ kind: "block", moduleId: "scheduling", variantId: "infusion" }] })).toEqual([]);
  });

  it("requires a ghost card to say what the audience sees, which app, and who triggers it", () => {
    for (const key of ["name", "sees", "app", "lane"]) {
      const card = { ...GHOST, [key]: key === "app" || key === "lane" ? "nobody" : "" };
      expect(problems({ cards: [card] }).join(), key).toContain("ghost card");
    }
    expect(problems({ cards: [{ ...GHOST, trigger: "shout" }] }).join()).toContain("unknown trigger");
  });

  it("rejects a demo that picks a fork or exit no workflow declares (rule 14), and a repeated demo id", () => {
    expect(problems({ demos: [{ id: "a", label: "A", choices: { nope: "x" } }] })[0]).toContain('fork "nope"');
    expect(problems({ demos: [{ id: "a", label: "A", choices: { bi: "nope" } }] })[0]).toContain('exit "nope"');
    const d = { id: "a", label: "A", choices: {} };
    expect(problems({ demos: [d, d] })).toContain('demos[1].id "a" is used twice');
  });

  it("requires bi in forks, only declared forks, and a pick only on a fork the request passes through", () => {
    expect(problems({ forks: ["pa"] })[0]).toContain('forks must include "bi"');
    expect(problems({ forks: ["bi", "nope"] })).toContain('fork "nope" is not declared by any workflow');
    expect(problems({ forks: ["bi"] }).join()).toContain('fork "pa", which the request does not pass through');
  });

  it("requires the brand inputs and a clean source URL", () => {
    expect(problems({ brand: { name: "M", drug: "", documents: [] } })).toContain("brand.drug is required");
    expect(problems({ brand: { name: "M", drug: "D", sourceUrl: "javascript:x", documents: [] } })).toContain("brand.sourceUrl must be an http or https URL");
  });
});

describe("buildPrompt", () => {
  const req = (over: Record<string, unknown> = {}) => {
    const r = validateDemoRequest(request(over));
    if (!r.ok) throw new Error(r.problems.join());
    return r.request as DemoRequest;
  };
  const path = "docs/demos/mirum/abv-apa.request.json";

  it("points at the request file and the client's tag prefix, and does not carry the storyboard", () => {
    const prompt = buildPrompt(req(), path);
    expect(prompt).toContain(path);
    expect(prompt).toContain("`mirum/NN-short-name`");
    expect(prompt).toContain("git tag -l 'mirum/*'");
    expect(prompt).not.toContain("White-label pharmacy intake");
    expect(prompt).not.toContain("Specialty pharmacy ships");
  });

  it("covers every instruction the plan lists", () => {
    const prompt = buildPrompt(req(), path);
    for (const needle of ["CLAUDE.md", "rule 6", "rule 4", "rule 13", "rules 11 and 12", "rule 8", "pnpm test", "pnpm typecheck:ratchet", "Never tag a red build", "stop and ask", "Do not invent an answer", "short report"]) {
      expect(prompt, needle).toContain(needle);
    }
  });

  it("counts ghost cards and open questions, and says when there are none", () => {
    expect(ghostCards(req())).toHaveLength(1);
    expect(buildPrompt(req(), path)).toContain("1 ghost card");
    const none = buildPrompt(req({ cards: [{ kind: "block", moduleId: "enrollment" }], openQuestions: [] }), path);
    expect(none).toContain("no ghost cards");
    expect(none).toContain("no open questions");
  });

  it("uses no em dashes", () => {
    expect(buildPrompt(req(), path)).not.toContain("—");
  });
});
