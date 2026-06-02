# Resume Builder

[![CI](https://github.com/nileshcf/resume-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/nileshcf/resume-builder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

An **ATS-first, privacy-first resume builder** that runs **100% in your browser**.
No backend, no sign-up, no data ever leaves your device — which also means it
deploys **free** to any static host.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nileshcf/resume-builder)

> Live preview ⇄ PDF parity is *perfect* (the PDF is the printed preview). DOCX is
> the editable twin. AI is optional (bring your own key). Everything works offline.

## Features

- **Split-screen WYSIWYG editor** — form on the left, live paginated preview on the right.
- **ATS-safe by construction** — curated fonts/sizes/margins/accents; no tables, columns,
  text boxes, or images can ever be emitted. A live **ATS meter** scores quality.
- **Export** — PDF (prints the exact approved preview) and editable DOCX (with Word
  `keepNext`/`keepLines`/`widowControl` so page breaks match).
- **Import & auto-fill** — drop a PDF/DOCX; it’s parsed in-browser (`pdfjs-dist` +
  `mammoth`), classified with a no-LLM heuristic, then you re-map sections in a triage UI.
- **Dynamic & custom sections** — add/remove/hide/reorder; build custom sections
  (e.g. Publications) with their own fields, still ATS-safe.
- **Job-description tailoring** — paste a JD for an on-device keyword-gap analysis.
  The JD never leaves the browser.
- **Variants & version history** — one profile, many tailored resumes; auto-snapshots
  + manual saves + non-destructive rollback.
- **Optional AI** — add your own OpenAI / Anthropic / OpenAI-compatible key to enable
  bullet rewriting, summary drafting, and richer tailoring. Off by default; every AI
  feature has a no-LLM fallback.
- **Accessible** — keyboard reorder, focus-trapped dialogs, ARIA live regions,
  reduced-motion support, error boundary.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # → static dist/
npm run preview    # serve the production build locally
```

## Deploy (free)

It’s a static SPA — `npm run build` produces `dist/`. Deploy that anywhere:

- **Vercel (one click):** use the **Deploy with Vercel** button above, or import the
  repo — [`vercel.json`](./vercel.json) already sets the build, output dir, SPA
  rewrite, and asset caching headers.
- **Cloudflare Pages:** framework preset *Vite*, build `npm run build`, output `dist`.
- **Netlify:** build `npm run build`, publish `dist`.
- **GitHub Pages:** push `dist/` (set Vite `base` if not served from root).

No environment variables or server are required.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and PR to
`main`: it installs with `npm ci`, type-checks (`npm run typecheck`), builds
(`npm run build`), and uploads the `dist/` artifact. [Dependabot](.github/dependabot.yml)
keeps npm and Actions dependencies current (grouped, weekly).

## Privacy

All resume data lives in your browser (IndexedDB). Nothing is uploaded — there is no
server. The **only** time data leaves the device is if *you* enable AI with your own
API key, in which case text goes directly from your browser to the provider you chose
(stated in the in-app AI settings). Job descriptions used for tailoring are analyzed
fully on-device.

## Architecture

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the module map and design
decisions (render parity, persistence, AI fallbacks). In short: the canonical Zod
document (`src/schema/resume.ts`) is the single source of truth; the preview, PDF, and
DOCX are all projections of it.

## Contributing

PRs welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup and the project’s
load-bearing invariants (stay client-side, never break ATS-safety, schema is the source
of truth). Run `npm run typecheck && npm run build` before opening a PR.

## License

[MIT](./LICENSE) © Nilesh Verma — [LinkedIn](https://www.linkedin.com/in/nileshvermaa/) ·
[GitHub](https://github.com/nileshcf)
