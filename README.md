# Resume Builder

An **ATS-first, privacy-first resume builder** that runs **100% in your browser**.
No backend, no sign-up, no data ever leaves your device — which also means it
deploys **free** to any static host.

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

- **Cloudflare Pages:** framework preset *Vite*, build `npm run build`, output `dist`.
- **Vercel:** import repo; it auto-detects Vite. Output `dist`.
- **Netlify:** build `npm run build`, publish `dist`.
- **GitHub Pages:** push `dist/` (set Vite `base` if not served from root).

No environment variables or server are required.

## Privacy

All resume data lives in your browser (IndexedDB). Nothing is uploaded — there is no
server. The **only** time data leaves the device is if *you* enable AI with your own
API key, in which case text goes directly from your browser to the provider you chose
(stated in the in-app AI settings). Job descriptions used for tailoring are analyzed
fully on-device.

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for the design decisions and module map. In short: the
canonical Zod document (`src/schema/resume.ts`) is the single source of truth; the
preview, PDF, and DOCX are all projections of it.
