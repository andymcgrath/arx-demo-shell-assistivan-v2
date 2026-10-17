# Brands

One brand per client. Each client has one Netlify site that builds from `main`.

## Add or change a brand

1. Create `brands/<slug>/brand.json`. Copy an existing one. The type is `BrandConfig` in `client/brand/schema.ts`.
2. Put images in `public/brands/<slug>/` and refer to them as `/brands/<slug>/<file>`.
3. Set `enabledFlows`. The first entry is the flow a new session starts on.
4. Run `pnpm test`. The brand test checks required fields, real flow ids, and that every local image exists.

## Pick a brand

Set `BRAND=<slug>` in the Netlify site settings. The default is `assistivan`. The build fails when the slug has no `brands/<slug>/brand.json`.

```
BRAND=dexcom pnpm build:client
BRAND=dexcom pnpm dev
```

A brand change costs one redeploy. There is no runtime fetch, no Netlify Blobs, and no admin screen.

## Not in the brand file yet

Some brand and drug names still sit in source (patient copy, sample patients, the provider portal). See `REFACTOR_AUDIT.md`, Step 10.
