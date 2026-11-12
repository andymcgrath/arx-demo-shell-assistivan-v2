# Plan: Demo Lab canvas

Replace the Storyboard and Builder tabs with one canvas. A horizontal row of scene cards you click through, with forks under the card that owns them and branches that fan out and rejoin. Sales edits on the canvas. Export stays a request file plus a prompt.

Read `CLAUDE.md` and `docs/plans/PLAN_DEMO_LAB.md` first. Their rules apply to every step here.

## Why

The Builder is a form, a flat card list, and a side panel of forks. It works, but it is hard to use. A fork outcome greys out in a far-off panel and the reason is a code-style list. Sales cannot see what an outcome does to the cards. The Storyboard draws the story but cannot edit it. They should be one thing.

## Decisions (12 Nov 2026)

- **One canvas.** It replaces Storyboard and Builder. Demos and Colors stay as tabs.
- **A card is a scene.** The row runs left to right in journey order. Click a card to see its detail: apps, lane, trigger, steps, what it needs, what it sets.
- **Two kinds of fork.**
  - A story fork (BI, PA) is picked at design time. One outcome per demo. This is today's model.
  - A patient fork (pricing, copay, assistance) is picked live. All its branches live inside one demo. The canvas draws each outcome as a branch under the card. Branches that end the same way rejoin. Example: Retail ends at a store with no shipping. Mail order goes on to address, date and delivery.
- **Outcomes declare what they feed.** Each fork outcome lists the blocks that can receive it (`leadsTo`). The outbound list is the canonical direction. `requires` (what an outcome needs) is checked against it by a test, so the two cannot drift.
- **Disabled, not removed.** When a changed outcome no longer feeds a card, the card stays on the canvas, greyed, with the reason. Sales can switch back without rebuilding.
- **Add a card on either side of any card.** The popover lists only blocks that fit there.
- **Export is unchanged.** The canvas writes the same request and prompt files. It never edits a recipe in code. `pnpm demo:apply` is unchanged.
- **Card-level branch editing waits.** Sales can include or exclude a patient fork's outcomes. They cannot add a card to one branch only. That needs a new request field and engine support (step 4, its own plan).

Conflict to confirm. `PLAN_DEMO_LAB.md` decided "not a chain: show lanes with waits-for arrows". The canvas is a row of scenes. This plan keeps the lane as a colored badge on each card and shows "waits for" in the detail panel. The old lane grid goes away.

## Model

### Outcome to receiver list

Add to each catalog fork exit:

- `leadsTo: string[]`. Block ids, or `module:variant`. These are the blocks that can follow the outcome on the canvas.
- `then?: CatalogStep[]`. For a patient fork, the sales steps that follow the outcome, in plain words. Example, `retail`: "The patient picks a store", "The patient pays at the counter", "Nothing ships". Authored text, because the branch logic sits in rule conditions the canvas cannot read.

Add to each catalog fork:

- `ownedBy: ModuleId`. The block the fork is drawn under (BI under enrollment, PA under the PA block, pricing and copay under payment, assistance under financial assistance).

Add to each block:

- `acceptsAny?: true`. For blocks that take input from every outcome (tracking, scheduling). Several branches can end there.

First pass: generate `leadsTo` from the existing `requires` and from the rule and screen scopes that name an exit. Hand-author the rest. Draft entries carry a question, as in step 2 of the Demo Lab plan.

### Canvas model

A pure function, `canvasModel(draft, pickedExits)`, returns:

- the cards in order, each with its detail and a `disabled` reason or none
- each fork under its owner card, with its outcomes
- for each outcome, the cards it feeds and the cards it leaves off
- the problems the editor already reports, tied to a card

No React. The component draws it. Every edit is the existing function in `catalog/editor.ts`.

## Steps

Each step ends green (`pnpm test`, `pnpm typecheck:ratchet`), is committed, and is tagged. Ask which tag prefix to use before the first tag (`demo-lab/` is the likely one). Work on a short-lived feature branch. Keep files under about 600 lines. `DemoLab.tsx` is already near it, so the canvas goes in new files.

### 1. Receiver lists

- Add `leadsTo`, `then`, `ownedBy`, and `acceptsAny` to the catalog types and entries.
- Generate the first `leadsTo` lists from `requires` and the scopes. Author `then` for pricing, copay, and assistance. Mark any entry you are unsure of `draft: true` with a question.
- Tests, each broken once on purpose to confirm it fails:
  - Every exit's `requires` is inside its `leadsTo`.
  - For every recipe, each block after a fork is either `acceptsAny`, before the fork, or in the `leadsTo` of the exit the recipe picks.
  - Every patient-fork outcome has `then` steps.
  - Every fork has an `ownedBy` block, and that block exists in the catalog.
- Stop after drafting. List every draft entry with its question. The user reviews the wording before the step is tagged.
- No UI change. Fixtures must not move.

### 2. Read-only canvas

- Build `canvasModel` and a horizontal scrolling card row with a detail panel. Forks under their owner card. Patient-fork branches fan out and rejoin. Cards an outcome does not feed are greyed, with the reason.
- It replaces the Storyboard tab. It draws every recipe and every brand demo. A recipe that draws with a problem means the catalog is wrong, so the existing storyboard test (every recipe and demo draws with no problems) carries over.
- Tests: `canvasModel` for every recipe and demo, a fixture of the card order and disabled flags per scenario, and a render test.
- Check in the browser: Copay, DTP, and the Mirum and Abivax demos.

### 3. Editing

- Add a card before or after any card. The popover lists only blocks that fit: the receivers of the outcome at a fork, and blocks the ordering rules allow elsewhere.
- Move, remove, and change a variant from the detail panel. Pick a story fork's outcome per demo on the fork card. Include or exclude a patient fork's outcomes.
- Ghost cards still work and attach to any outcome. They carry a "new" flag until built.
- Every edit calls a function in `catalog/editor.ts`. Add tests for the ones that do not exist yet (insert at an index, include or exclude an outcome).

### 4. Retire the Builder tab

- Move the request fields (title, client, request name, intake, win theme, brand, documents, open questions) into a drawer on the canvas.
- Keep Start from, the demo list, and the export button, with the export problems shown on the cards they belong to.
- Remove the Builder tab and its panels. Update `docs/BRANDS.md` and `PLAN_DEMO_LAB.md` where they name the tabs.

### 5. Card-level branches (separate plan, later)

Write its own plan before building. It needs:

- A request field that scopes a card to one outcome, for example `onlyFor: { fork, exit }`.
- The validator, the prompt, and Apply matching updated.
- Engine support: a block with a different variant per branch is not possible today, because a recipe holds one variant per module.

Do not start it until sales needs a branch the existing outcomes cannot express.

## Out of scope

- Editing a recipe in code from the canvas.
- A hosted lab. It stays dev-only.
- Standard and PAP whole demos. They have no recipes, so they stay as whole-demo cards.

## Verification

- `pnpm test` and `pnpm typecheck:ratchet` before and after each step. Step 1 moves no fixture.
- `pnpm dev`, then the lab: load each recipe and demo, click through the cards, switch a story fork and check which cards grey out and that they come back, add a card on each side, and export.
- The lab stays out of client builds (`BRAND=<slug> pnpm build:client`, then look for it in `dist`).
- Never tag a red build.

## Open questions

1. Is the lane badge enough, or should sales still see a lane grid somewhere?
2. Should a patient fork's branches be drawn side by side (fan out) or stacked under the card?
3. Should the canvas also open a brand's `demos` list, or only recipes and request files?
