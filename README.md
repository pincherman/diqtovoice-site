# Diqto Voice site

Production-oriented Next.js prototype for `diqtovoice.com`.

## Product positioning

- Diqto Voice for Meetings first.
- Mac beta first.
- Diqto Voice for Conversations later.
- The site must feel premium, guided, self-serve, and ROI-obvious.
- Do not expose internal automation/agentic operations in the copy.

## Routes

- `/` — premium homepage with meeting voice route demo.
- `/beta` — Mac beta/team pilot/enterprise intake path.
- `/roi` — ROI calculator and use cases.
- `/security` — trust, privacy, and Mac permissions posture.

## Commands

```bash
npm install
npm run build
npm run start -- -p 8766
```

## Verification performed

- `npm run build` passes with Next.js 16.2.9.
- Static routes verified: `/`, `/beta`, `/roi`, `/security` return HTTP 200.
- Copy scan passes: no visible `agentic`, `AI agent`, `behind the scenes`, or `automatically` positioning.
- Desktop/mobile Chromium screenshots generated.

## Screenshots

- `diqtovoice-next-home-desktop-v2.png`
- `diqtovoice-next-home-mobile-v2.png`
- `diqtovoice-next-beta-desktop-v2.png`

## Production status

Published via GitHub Pages with OVH DNS:

- `https://diqtovoice.com/` — live
- `https://www.diqtovoice.com/` — redirects/serves the same GitHub Pages site
- EN/FR static routes are exported and listed in `sitemap.xml`
- GitHub Pages HTTPS is enforced with an approved certificate

Remaining before serious paid traffic:

1. Connect beta intake to a real backend or form provider.
2. Add analytics, ideally privacy-friendly first.
3. Add final privacy/security text once the Mac app data flow is locked.
4. Re-run `npm audit`; current prototype shows only moderate dependency advisories from Next/PostCSS with no safe automatic fix offered by npm.
