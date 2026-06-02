# Resume Builder — ATS-first, free-to-deploy, client-side

A browser-first resume builder. Benchmark: ResumeMaker Pro Deluxe template/feature
depth, delivered as a frictionless web app. **Hard goal: deployable for free.**

## Core architectural decisions (and the *why*)

- **100% client-side.** No always-on server → deployable free on a static host
  (Cloudflare Pages / Vercel / Netlify). Consequence: **all resume PII stays in the
  browser** — the privacy goal is literally true, not just "stateless server."
- **The document is data, not a file.** `src/schema/resume.ts` (Zod) is the single
  source of truth. The live preview, PDF, and DOCX are all *projections* of it.
- **Render parity strategy (the inversion):** the original DOCX-centric brief implied
  a server (LibreOffice) for DOCX→PDF parity. Free hosting rules that out, so:
  - **Preview ↔ PDF parity is PERFECT** — the PDF is produced by printing the *exact*
    approved preview DOM (`src/export/pdf.ts`), same browser layout engine for both.
  - **DOCX is the approximation layer** (`src/export/docx.ts`) — same content/order/
    headings/font-by-name as the PDF, plus native Word `keepNext`/`keepLines`/
    `widowControl` so page breaks behave like the PDF. Residual visual drift lives
    HERE, never in the PDF the user visually approved. (Brief's DOCX↔PDF constraint
    is met as "near-identical"; the parity tradeoff is intentionally flipped.)
- **ATS-first by construction.** `theme` only allows curated fonts/sizes/margins;
  no field anywhere can emit a table, text box, column, or image. Custom sections
  render through an `itemTemplate` → one plain semantic line. Strict mode (chosen).
- **Local-first persistence.** Zustand store + IndexedDB (Dexie), ~300ms debounce,
  plus flush on `beforeunload`/`visibilitychange`. Zero data loss on tab close/timeout.

## Layout

```
src/schema/      canonical ResumeDocument (Zod) + factory/defaults
src/store/       Zustand store + Dexie IndexedDB (docs + version snapshots)
src/editor/      FormPane — left split-screen pane (form fields)
src/preview/     ResumePreview — right pane, semantic ATS-safe HTML (== PDF source)
src/export/      pdf.ts (print approved DOM), docx.ts (editable twin)
```

## Run / build

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static dist/ — deploy to any free static host
npm run typecheck
```

## Implemented (Phases 0–4)

- [x] Canonical schema + factory
- [x] Local-first autosave (IndexedDB) + close/hide flush
- [x] Split-screen WYSIWYG editor (mobile = tabbed Edit/Preview)
- [x] Dynamic sections: add / remove / hide / reorder
- [x] Custom sections with field schema + ATS-safe itemTemplate (Scenario B)
- [x] PDF export (preview-faithful) + DOCX export (editable twin, orphan controls)
- [x] **Import & auto-fill (Scenario A):** in-browser PDF (`pdfjs-dist`) + DOCX
      (`mammoth`) extraction → heuristic no-LLM classifier (`src/import/classify.ts`)
      → triage re-map UI with confidence chips, type dropdowns, editable text,
      reorder. Snapshots current doc "before import". Heavy parsers are code-split
      (lazy `ImportDialog` chunk) so they never bloat first load.

## AI is OPTIONAL — the no-LLM path is complete

The app builds a full resume with zero AI. AI only augments when the user adds
their own key. **There is no backend** — `src/ai/client.ts` calls the user's chosen
provider (OpenAI / Anthropic / any OpenAI-compatible `baseUrl`) directly from the
browser; the key lives only in localStorage. Privacy implication is stated in the
Settings UI: with AI on, text goes browser→that provider.

- `src/ai/config.ts` — provider/key/model, stored locally, AI off by default.
- `src/ai/client.ts` — fetch-only chat client (OpenAI-compatible + Anthropic shapes).
- `src/ai/capabilities.ts` — `improveBullet` / `generateSummary` / `tailorSuggestions`.
  **Every one falls back to a no-LLM heuristic when no key is set.**

No-LLM engines (all offline, pure functions, smoke-tested):
- `src/assist/verbs.ts` — action-verb bank, weak-opener + metric detection, per-bullet tips.
- `src/assist/atsCheck.ts` — live ATS/quality meter (`AtsMeter` chip in topbar).
- `src/assist/jdMatch.ts` — JD keyword-gap (Scenario F), runs 100% on-device; JD never sent.

UI: `⚙ AI` (Settings), `Tailor to job` (TailorDialog), ATS chip (AtsMeter), and
inline bullet coaching (verb/metric tags + ✨ Improve) in `FormPane`.

## Polish pass (done)

- [x] **Pagination (Scenario C):** `src/preview/PageGuides.tsx` overlays dashed
      page-break lines + page count by measuring the rendered paper (chose
      measurement over live Paged.js — see file header for why). `PreviewStage.tsx`
      scales the paper to fit the pane (no clipping/scroll).
- [x] **Design dialog** (`src/ui/DesignDialog.tsx`): curated font / size / line-height /
      section-gap / margins / page-size / dark-accent controls — the only theme UI,
      ATS-safe by construction. Live-updates preview; accent threaded into PDF+DOCX.
- [x] **Font fallback stacks** (`src/theme/fonts.ts`) so curated fonts render
      faithfully cross-machine (Calibri→Carlito, Garamond→EB Garamond, etc.).
- [x] **Accessible Modal** (`src/ui/Modal.tsx`): focus-trap, focus-restore, Esc,
      click-outside, scroll-lock — all 4 dialogs refactored onto it.
- [x] **Summary generator** button (AI or heuristic) in the summary section.
- [x] **ErrorBoundary** (`src/ui/ErrorBoundary.tsx`) — runtime errors degrade
      gracefully (data is safe in IndexedDB). Verified clean in a prod build.
- [x] **README.md** with free-deploy instructions (Cloudflare/Vercel/Netlify/Pages).

Also done: **JD tailoring (Scenario F)**, **variants & version history**
(`src/ui/DocsDialog.tsx`, `duplicateAsVariant` lineage + auto/manual snapshots +
non-destructive restore), **developer credit footer** (`src/ui/CreditFooter.tsx`,
app-chrome only, data from D:\portfolio), and **code-split** docx/import/dialog
chunks (initial bundle ~104 kB gzip).

## Roadmap / NOT yet built

- [ ] Optional cross-device sync — the only non-free piece (needs a backend).
- [ ] Full ARIA keyboard drag-and-drop reorder (today: a11y-friendly ↑/↓ buttons).
- [ ] More resume templates / layouts within the ATS-safe envelope.

## Known risks (see chat §7)

- DOCX line-break positions may differ from the PDF by a line — confined to DOCX by design.
- Import parsing of stylized PDFs is heuristic; the re-map UI is the safety net.
- No cross-device sync yet (would be the only non-free piece).
