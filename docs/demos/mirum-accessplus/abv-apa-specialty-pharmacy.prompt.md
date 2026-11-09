# Build the demo: Mirum: ABV with APA, triage to the specialty pharmacy, the pharmacy ships

Client: `mirum-accessplus`. Request: `docs/demos/mirum-accessplus/abv-apa-specialty-pharmacy.request.json`.
The request has 2 ghost cards. Build each one.

Do these in order.

1. Read `docs/demos/mirum-accessplus/abv-apa-specialty-pharmacy.request.json`, then `CLAUDE.md` and the docs it names. The rules there apply. Do not restate them.
2. Apply the recipe and the 1 demo in the request.
3. Build each ghost card as a block. Keep it inline unless a second scenario uses it (rule 6). Declare `needs` and `sets` (rule 4).
4. Add screens (rule 13), preconditions (rules 11 and 12), and one headless test per demo. Each test reaches the end state the last card names (rule 8).
5. Run `pnpm test` and `pnpm typecheck:ratchet`. Tag `mirum-accessplus/NN-short-name`. Find the next number with `git tag -l 'mirum-accessplus/*'`. Never tag a red build.
6. The request has 8 open questions. For each one, stop and ask. Do not invent an answer.
7. End with a short report: what was built, and what was not.
