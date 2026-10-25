# Fit Mama

A calm, offline rhythm-workout PWA for days when the couch or the bed is the gym. Everything stays on the phone: plans, scores, music settings, and an optional song file you pick yourself.

## Scripts

- `npm run dev` — local app at `/fitmama/`
- `npm run check` — typecheck, lint, unit tests, and production build
- `npm run e2e` — Playwright flow and axe checks
- `npm run build` — static build with the PWA manifest

The production build uses the `/fitmama/` base. Publishing is a separate manual workflow, Deploy Fit Mama. It does not run on pull requests, and its deploy job stays skipped until the repository variable `FITMAMA_DEPLOY_APPROVED` is `true`.

## Privacy

No backend, accounts, analytics, or paid services. IndexedDB holds sessions and settings. Built-in music is synthesized in the browser. Fonts and images are bundled.
