# Plan: Demo Lab

Turn the Brand Lab into the Demo Lab. Sales builds a storyboard from what exists, marks what is new, and exports a demo request. The request drives the build: a script when nothing is new, a Claude Code prompt when something is.

Read `CLAUDE.md` first. Its workflow and test rules apply to every step here.

## Decisions (6 Nov 2026)

- **Dev-only.** The lab is not in any client build, same rule as `/admin`. Sales runs it with `pnpm dev`. No hosted lab site.
- **Read and export only.** No runtime store, no Blobs. The only write is the dev endpoint below.
- **The spec is the source of truth.** The prompt points at the spec file. It does not carry the storyboard.
- **Sales never picks a branch live.** They pick outcomes at design time. Each outcome is a demo.
- **Not a chain.** The route is derived from data. Onboarding, BI, and PA are independent timelines. Show lanes with "waits for" arrows, not one line of boxes.

## Outcome

Sales can open the lab, see every block and outcome in plain language, and draw a scenario. A request with no gaps becomes a working demo with no model. A request with gaps becomes a prompt that builds only the gaps.

## Steps

Each step ends green (`pnpm test`, `pnpm typecheck:ratchet`), is committed, and is tagged `demo-lab/NN-short-name` (find the next number with `git tag -l 'demo-lab/*'`). Put the test count and type-error baseline in the tag message. Work on a short-lived feature branch.

### 1. Rename to Demo Lab

- `/brand-lab` becomes `/demo-lab`. Keep a redirect from the old path.
- Tabs: Storyboard (default, empty for now), Demos, Colors.
- Update every reference: `App.tsx`, `client/shell/BrandLab.tsx`, `client/brand/__tests__/brands.test.ts`, `client/engine/__tests__/ui.noFlowChecks.test.ts`, `scripts/brand-scan.mjs`, `docs/BRANDS.md`, `docs/REFACTOR_AUDIT.md`.
- Check that the lab is still left out of client builds (`BRAND=<slug> pnpm build:client`, then look for it in `dist`).
- No behavior change. Fixtures must not move.

### 2. Catalog metadata

Add one entry per module and per fork exit, read by the lab:

- Block: sales name, one-line summary (what the audience sees), `aliases` (sales vocabulary, read by the palette search), apps touched, lane (HCP, patient, agent, system), trigger (click, text, automatic), variants with labels.
- Fork exit: sales label, description (most already exist in `forks.ts`), and `aliases`.
- Aliases examples: BI is ABV, BV, eMedBV. PA is APA. Pharmacy selection is triage to SP. Enrollment is onboarding. eRx intake is eRx initiation.
- `needs` and `sets` for each block, taken from its existing rules. Do not duplicate them. Derive them where possible.

Add a test that fails when a module in a recipe, or a fork exit, has no catalog entry. Break it once on purpose to confirm it fails.

Drafting rules for the sales text:

- Draft each name and summary from the module file, its screens, and the prose in `docs/scenarios/recipes.md` and `buy-and-bill.md`. Describe only what a screen or rule does today. Do not promise a screen the block lacks.
- Mark any entry you are unsure of `draft: true` with a one-line `question`. Never guess silently.
- Write names in sales vocabulary, not module ids. Keep the module id as a separate field.
- Stop after drafting and list every draft entry with its question. The user reviews the wording (name, summary, aliases) before the step is tagged. `needs`, `sets`, and lane come from the code and need no review.
- A catalog entry marked `draft` fails the tag step until the user clears it.

Sources: `client/workflows/*/modules/`, `*/forks.ts`, `*/recipes.ts`. iAssist and CoAssist first. Standard and PAP have no recipes yet, so list their scenarios as whole demos only.

### 3. Read-only storyboard

Draw every existing recipe and brand demo as a storyboard: lanes, cards, fork splits, the selected exit highlighted. No editing yet.

Goal: sales sees what exists. It also proves the metadata. A recipe that draws wrongly means the metadata is wrong.

### 4. Request schema and export

- Define `DemoRequest` (type plus validator): workflow, intake channel, apps shown, blocks with variants, fork picks per demo, ghost cards, brand inputs (name, drug, source URL, documents), win theme, open questions. No demo date and no indication: nothing read them.
- Dev endpoint that writes `docs/demos/<client>/<slug>.request.json` and `<slug>.prompt.md`. It writes under `docs/demos/` only and rejects any other path. It does not exist in a production build. Test both.
- Generate the prompt from the request (see below).

### 5. Editing and validation

- Palette of blocks. Blocks that cannot go next are greyed out with the unmet `needs`.
- Fork cards with one branch per exit. An exit whose `requires` block is missing is greyed out.
- Ghost card for something new. Required: what the audience sees, which app, who triggers it.
- Export is blocked when a ghost card lacks a required field, when the order breaks a `needs`, or when the win theme or date is empty.
- Start from a ready-made demo or blank.

### 6. `pnpm demo:apply <slug>`

For a request with no ghost cards. Writes the recipe and the `demos` entries into the brand file, then runs the brand test. No model.

Needs a decision before this step: the machine does not read a recipe's module list yet (see the note in `iassist/recipes.ts`). Until it does, apply can write fork picks and demos but not a new module order. Settle this when starting step 6.

## The generated prompt

Short. It must:

1. Read the request file, then `CLAUDE.md` and the docs it names. Do not restate the rules.
2. Apply the recipe and demos.
3. Build each ghost card as a block. Keep it inline unless a second scenario uses it (rule 6). Declare `needs` and `sets` (rule 4).
4. Add screens (rule 13), preconditions (rules 11, 12), and one headless test per demo that reaches the end state the last card names (rule 8).
5. Run `pnpm test` and `pnpm typecheck:ratchet`. Tag `<client>/NN-short-name` (find the next number with `git tag -l '<client>/*'`). Never tag a red build.
6. For each open question, stop and ask. Do not invent an answer.
7. End with a short report: what was built, what was not.

## Test case

The Mirum request (eRx initiation, onboarding, ABV with APA to the HCP, coverage confirmation, triage to the specialty pharmacy, the pharmacy ships). Expected: tier two, with gaps for white-label pharmacy intake and the external CRM handoff. A repeat of Celldex Buy and Bill for a new client is the tier-one case.

## Open questions

- Who owns patient communications for Mirum? Their agents do, so is the Patient UI branded Mirum or us?
- Is the Mirum CRM integration shown on screen or only described?
- Is the specialty pharmacy ours?
- Does the machine read the recipe module list before step 6?
