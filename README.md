# Fit Mama

A calm, offline rhythm-workout PWA for days when the couch or the bed is the gym. Everything stays on the phone: plans, scores, music settings, and an optional song file you pick yourself.

## Scripts

- `npm run dev` — local app at `/fitmama/`
- `npm run check` — typecheck, lint, unit tests, and production build
- `npm run e2e` — Playwright flow and axe checks
- `npm run build` — static build with the PWA manifest

The app is ready for a later GitHub Pages deploy under `/fitmama/`. This repo does not publish it.

## Privacy

No backend, accounts, analytics, or paid services. IndexedDB holds sessions and settings. Built-in music is synthesized in the browser. Fonts and images are bundled.
