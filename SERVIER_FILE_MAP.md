# Servier file map

Everything that configures or supports the Servier demo. Build it with `BRAND=servier pnpm build:client` or run it with `BRAND=servier pnpm dev`.

Servier has no `extends`, so it inherits nothing from `assistivan`. A field missing from its brand file stays empty.

## Brand configuration

| File | What it holds |
|---|---|
| `brands/servier/brand.json` | Name, title, colors, logos, support phone, legal links, and the demo list |
| `public/brands/servier/servier-logo-color.svg` | Header logo and chatbot icon |
| `public/brands/servier/servier-logo-white.svg` | Logo on dark backgrounds |
| `public/brands/servier/favicon.jpeg` | Browser tab icon |
| `BRANDS.md` | How brand files work, including the demos and transfer sections |
| `brands/_template/brand.json` | Every field a brand can set |

## What brand.json sets

| Field | Servier value |
|---|---|
| `slug`, `name`, `title` | `servier`, Servier, Servier Sevasemten Demo |
| `demos` | One demo: `coa-pharmacy-transfer` on `CoA_Coverage`, with `bi: pharmacy_transfer` and `pa: approved` |
| `manufacturer.tagline` | Moved by you |
| `manufacturer.support` | ServierONE assistance, 800-813-5905 |
| `manufacturer.legal` | Privacy URL set. Terms, safety, and prescribing are `#` |
| `program.drugDisplayName` | Sevasemten (10 mg, once daily, tablet) |
| `program.colors` | Brand `#24226a`, accent `#ea5b47` |

## Code that reads the brand

| File | Role |
|---|---|
| `vite.config.ts` | Reads `BRAND`, bundles that brand file, fails on an unknown slug |
| `netlify.toml` | Documents the `BRAND` variable for the Netlify site |
| `client/brand/schema.ts` | The `BrandConfig` type, including `program.transferPartner` |
| `client/brand/resolve.ts` | Merges `extends` parents and checks images stay in the brand's folder |
| `client/brand/theme.ts` | Turns `program.colors` into CSS variables |
| `client/brand/index.ts` | Exposes `BRAND` to the app |
| `client/portals/patient/config/branding.ts` | `PROGRAM` values used by patient screens |

## Workflow that the demo runs

The demo runs the `CoA_Coverage` scenario on the CoAssist workflow, on the `pharmacy_transfer` exit of the `bi` fork.

| File | Role |
|---|---|
| `client/workflows/coassist/forks.ts` | Declares the `bi` fork and its `pharmacy_transfer` exit (sets `pharmacyAssigned: true`) |
| `client/workflows/coassist/recipes.ts` | `COA_COVERAGE_RECIPE`: modules and default choices |
| `client/workflows/coassist/scenarios.ts` | `COA_COVERAGE` scenario and `TRANSFER_PHARMACY`, read from `program.transferPartner` |
| `client/workflows/coassist/modules/spine.ts` | BI and PA rules. Sets `pharmacyAssigned` when BI resolves |
| `client/workflows/coassist/modules/shared.ts` | `assignment()` hands the Rx to the transfer pharmacy |
| `client/workflows/coassist/modules/pharmacy_selection.ts` | Skips the patient's pharmacy pick when a pharmacy is assigned |
| `client/workflows/coassist/modules/screens/pharmacy_selection.ts` | Routes to `/pharmacy-transfer` after the PA approval OTP |
| `client/engine/workflow/baseData.ts` | `pharmacyAssigned` default |
| `client/engine/types.ts` | `pharmacyAssigned` on `WorkflowData` |

## Patient screens on this path

| File | Screen |
|---|---|
| `client/portals/patient/pages/PaApprovedSms.tsx` | PA approved text message |
| `client/portals/patient/pages/PaApprovedOtp.tsx` | PA approved verification code |
| `client/portals/patient/pages/PharmacyTransfer.tsx` | Terminal screen with the transfer pharmacy's details |
| `client/portals/patient/index.tsx` | Route table (`/pharmacy-transfer`) |

## Tests and fixtures

| File | What it proves |
|---|---|
| `client/brand/__tests__/brands.test.ts` | Required fields, real flow ids, valid exits in `choices`, images exist |
| `client/brand/__tests__/theme.test.ts` | Button and heading contrast |
| `client/brand/__tests__/noBrandNames.test.ts` | No brand or drug names in source |
| `client/engine/__tests__/scenarios.ts` | Golden path `coa-pharmacy-transfer` (event list and end state) |
| `client/engine/__tests__/goldenPaths.test.ts` | Runs every golden path |
| `client/engine/__tests__/forks.test.ts` | `pharmacy_transfer` sets `pharmacyAssigned`, routes to `/pharmacy-transfer`, skips selection |
| `client/engine/__tests__/recipes.test.ts` | Exits that need `provider_transfer` |
| `client/engine/__tests__/__fixtures__/golden/coa-pharmacy-transfer.json` | Recorded path |
| `client/engine/__tests__/__fixtures__/emails/coa-pharmacy-transfer.json` | Recorded Field and provider emails |

Git tag `refactor/37-servier-golden-path` marks when this demo got its golden path.

## Gaps

- **No transfer pharmacy.** `program.transferPartner` is not set. The patient sees the placeholder CVS Pharmacy #3795 in Orlando. Set the name, address, city, state, zip, and phone in `brand.json`.
- **One demo only.** The other `bi` outcomes (`pharmacy_covered`, `medical_covered`, `no_coverage`) have no Servier demos.
- **Empty program assets.** `program.assets` logos and `educationVideo` are blank.
- **Placeholder legal links.** Terms, safety, and prescribing URLs are `#`. Copyright is empty.
- **Stray file.** `public/brands/servier/.DS_Store` should not be committed.
- **Stale doc line.** `BRANDS.md` still says the CRM shows branch buttons for any presenter fork (Demos section). The presenter has no branch buttons, so delete that line.
