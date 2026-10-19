# Plan: generic coverage fork and CoA_Coverage

Remove the DME special case. The coverage outcomes (pharmacy, transfer, medical, none) belong to any Rx, not one scenario.

## Decisions

- The presenter never picks a fork branch. Each outcome is a demo in the brand file's `demos` list. The scenario recipe pins the choice. Delete `chooser: "presenter"` from `ForkDefinition` and the presenter branch buttons. Fix rule 14 and the Fork definition in `CLAUDE.md`.
- No DME variation. Rename `CoA_DME` to `CoA_Coverage`. Keep it as a normal scenario beside `CoA_DTP` and `CoA_Copay`.
- One `bi` fork for every CoAssist scenario. Replace `DME_BI_FORK` and `STANDARD_BI_FORK`.
- Exit ids are coverage-based: `pharmacy_covered`, `pharmacy_transfer`, `medical_covered`, `no_coverage`.
  - `coverage_found` becomes `pharmacy_covered`.
  - `covered_by_both` becomes `medical_covered`.
  - Every exit sets `pharmacyBenefitStatus` and `medicalBenefitStatus`. `biResult` is derived.
- Exits use `requires` to block modules a scenario lacks. DTP and Copay need `provider_transfer` before they can pick `medical_covered` or `pharmacy_transfer`. `no_coverage` needs `cash_offer`.
- Purge scope: code, tests, fixtures, and docs.

## Known collisions to resolve in step 1

- `spine.submit_pa.standard` and `spine.submit_pa.dme` both scope to `pharmacy_covered` after the rename. Merge them into one rule on benefit statuses.
- `spine.complete_bi` branches on `pharmacyBenefitStatus === undefined`. Remove the branch. Every exit now carries statuses.
- Stage ladders: `coassistLadders.ts` special-cases `CoA_DME` and reads `DME_BI_FORK`. DTP and Copay ladders are hand-built. Move stage lists so each scenario owns its own, keyed by exit.
- `deriveBiResult` returns `dme_covered`. Rename the result.
- UI checks that assume DTP and Copay never see transfer exits (`isCoaFlow` in `portals/client/pages/Index.tsx`). Audit with `rg "flowType ==="`.
- `BrandLabDemos.tsx` prints `fork.chooser`. Remove it with the type change.
- `brands/*/brand.json` demos that name `CoA_DME` or `coverage_found`. The brand test rejects unknown exits.

## Steps

Run `pnpm test` and `pnpm typecheck:ratchet` before and after each step. Tag each green step `refactor/NN-short-name`.

1. Generic `bi` fork, exits renamed, `presenter` chooser removed, `CLAUDE.md` fixed. Re-record DTP and Copay fixtures with `RECORD=1 pnpm test`. Read every diff first.
2. Rename `CoA_DME` to `CoA_Coverage`. Move fixtures in `golden/`, `emails/`, `reset/`, `undo/`, and `ladders/`. Update `brand.json` demos, `scenarios.ts`, `recipes.ts`, and `BrandLabDemos.tsx`.
3. Rename `DmeTransferSms.tsx`, `DmeProviderTransfer.tsx`, and DME events, helpers, and doc references (`dmeNeitherCovered`, `dme_covered`, `COA_DME_*`).

## Final check

- `rg -i dme` returns nothing outside git history.
- Brand test passes for every `demos` entry.
- Invariant test (rule 12) passes for every scenario.

## State when this plan was written

- Baseline: `tsc` reports 2 errors, matching `.typecheck-baseline`.
- DME appears in 97 files and about 644 non-fixture lines.
- No code has changed yet.
