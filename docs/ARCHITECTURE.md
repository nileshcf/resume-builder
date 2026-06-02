# Architecture

A browser-first, ATS-first resume builder that is **100% client-side** — which is
what makes it free to host and private by construction.

## The one big idea

**The document is data, not a file.** `src/schema/resume.ts` defines a canonical
`ResumeDocument` (Zod). The live preview, the PDF, and the DOCX are all *projections*
of that object — never the other way around. Change the schema and everything downstream
follows.

```
ResumeDocument (Zod)  ──►  ResumePreview (semantic HTML)  ──►  PDF  (print that exact DOM)
        │                                                  └──►  DOCX (rebuilt from schema)
        └── Zustand store ──► IndexedDB (Dexie) autosave + version snapshots
```

## Render parity strategy (the deliberate inversion)

A DOCX↔PDF parity engine normally needs a server (LibreOffice). Free hosting forbids an
always-on server, so we flipped the tradeoff:

- **Preview ⇄ PDF parity is perfect** — the PDF is produced by printing the *exact*
  approved preview DOM (`src/export/pdf.ts`). Same browser layout engine for both.
- **DOCX is the approximation layer** (`src/export/docx.ts`) — same content, order,
  headings, and font-by-name as the PDF, plus native Word `keepNext` / `keepLines` /
  `widowControl` so page breaks behave like the PDF. Any residual visual drift lives
  here, never in the PDF the user visually approved.

## Module map

| Path | Responsibility |
| --- | --- |
| `src/schema/` | Canonical `ResumeDocument` (Zod) + factory/defaults. Single source of truth. |
| `src/store/` | Zustand store + Dexie/IndexedDB (documents + version snapshots). |
| `src/editor/` | `FormPane` — left split-screen pane; inline bullet coaching. |
| `src/preview/` | `ResumePreview` (semantic ATS-safe HTML == PDF source), `PageGuides` (page-break overlay), `PreviewStage` (fit-to-width scaling). |
| `src/export/` | `pdf.ts` (print approved DOM), `docx.ts` (editable twin). |
| `src/import/` | `extract.ts` (pdfjs + mammoth), `classify.ts` (no-LLM heuristic), `mapToSchema.ts`, `ImportDialog.tsx` (triage re-map UI). |
| `src/assist/` | No-LLM engines: `verbs.ts`, `atsCheck.ts`, `jdMatch.ts`, `docText.ts`. |
| `src/ai/` | Optional bring-your-own-key AI: `config.ts`, `client.ts`, `capabilities.ts` (each with a no-LLM fallback). |
| `src/theme/` | `fonts.ts` — fallback stacks for curated fonts. |
| `src/ui/` | `Modal` (focus-trap), dialogs (Settings/Tailor/Docs/Design), `AtsMeter`, `CreditFooter`, `ErrorBoundary`. |

## Persistence (zero data loss)

Local-first: every mutation writes to IndexedDB after a ~300 ms debounce, plus a flush on
`beforeunload`/`visibilitychange`. A tab close, crash, or session timeout never loses work
because durability doesn't depend on the network. Version snapshots (auto every ~3 min +
manual + before destructive ops) enable non-destructive rollback.

## Privacy

There is no server. All resume PII stays in the browser. The **only** time data leaves the
device is if the user enables AI with their own key — then text goes browser→that provider
directly (stated in the AI settings UI). Job-description tailoring is analyzed fully
on-device.

## Performance

Initial bundle is kept small (~104 kB gzip). Heavy or rarely-first-used code is code-split:
the import parsers (pdfjs + mammoth), DOCX export, and each dialog are separate chunks
loaded on demand.

## Known tradeoffs

- DOCX line-break positions can differ from the PDF by a line — confined to DOCX by design.
- Import parsing of heavily stylized PDFs is heuristic; the triage re-map UI is the safety net.
- No cross-device sync (it would be the only piece requiring a paid backend).
