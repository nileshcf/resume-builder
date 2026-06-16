# Resume Builder — Improvement Plan (for implementation)

> Hand-off spec. Each task is self-contained: **file(s)**, **problem**, **fix**, **acceptance**.
> Work top-to-bottom — phases are ordered by priority. After every phase run:
> `npm run typecheck && npm run build`, then verify in the browser preview.
> The inline WYSIWYG editor stores field values as **HTML** (`<b>`, `<i>`, `<a>`, `<br>`),
> so anything that *reads* a field for logic/export must go through `stripHtml`
> (added in `src/assist/docText.ts`) or `htmlToRuns` (in `src/export/docx.ts`).

---

## Phase 0 — Verify work already in progress (DO FIRST)

Two files were edited in the last session but **not yet type-checked, built, or committed**:

1. **`src/assist/docText.ts`** — added `export function stripHtml(s)`, and `collectText`
   now pipes through it. ✅ Looks complete.
2. **`src/assist/atsCheck.ts`** — rewritten to **v2**: weighted scoring, HTML-stripped
   analysis, and new checks (standard headings, chronology, clean-text, skills coverage,
   web presence). The `AtsCheck` interface gained a `weight: number` field.

**Task 0.1** — Run `npm run typecheck && npm run build`. Fix any compile errors.
**Task 0.2** — Confirm `src/ui/AtsMeter.tsx` still renders (it only reads `label/status/detail`,
so it should — but verify the popover shows all the new rows and the score looks sane).
**Acceptance:** build is green; opening the ATS chip shows ~11 checks; score reflects weights
(empty doc scores low, a filled doc scores 80+).

---

## Phase 1 — Bug fixes (HTML leaking from the inline editor)

### Task 1.1 — DOCX export prints literal HTML tags
**File:** `src/export/docx.ts`
**Problem:** `htmlToRuns()` exists and is used for **bullets + summary/skills**, but the
**name, headline, role/title, and org** are still passed as raw strings to `new TextRun({ text })`.
Since those fields are now HTML, a bolded name exports as the literal text `<b>Jane</b>` in Word.
**Fix:**
- Name → `htmlToRuns(header.name, font, 40)` with `bold: true` baked in (wrap: map the returned
  runs to force `bold`). Simplest: `new TextRun` per run but set `bold` true. Or add a
  `forceBold`/`forceSize` option to `htmlToRuns`.
- Headline → `htmlToRuns(header.headline, font, 22)`.
- Entry head: build the role/org runs via `htmlToRuns` instead of one `TextRun`. The bold
  weight for the role can stay (role is bold by default in the current code) — preserve it.
- `location` field (now rendered + editable) → `stripHtml` before writing (single line).
- Section title is already stored stripped (ResumePreview strips it in `onChange`), but be
  defensive: `stripHtml(section.title)` in `sectionHeading`.
**Acceptance:** Type a **bold word** into the name and a bullet, export `.docx`, open in Word /
Google Docs — bold renders as real bold, **no literal `<b>` tags anywhere**.

### Task 1.2 — PDF export: dev-mode styles + placeholder leakage
**File:** `src/export/pdf.ts`
**Problems:**
(a) It only copies **linked** stylesheets (`styleSheets[].href`). In `npm run dev`, Vite injects
CSS as inline `<style>` tags, so the printed PDF is **unstyled in dev** (works only in prod build).
(b) Empty editable fields render placeholder text via CSS `[data-ph]:empty::before` — so an
empty headline prints the literal placeholder "Job title / headline", empty summary prints
"Click to add text…", etc.
(c) `contenteditable` / `.rich-editable` hover-outline styles are copied (harmless but messy).
**Fix:**
- Collect **both** linked hrefs **and** the text of all inline `<style>` elements
  (`Array.from(document.querySelectorAll('style')).map(s => s.textContent)`) and inject the
  inline CSS into the print document inside a `<style>` block.
- Add print-scoped CSS to the injected `<style>`:
  ```css
  [data-ph]:empty::before { content: none !important; }
  .rich-editable { outline: none !important; background: none !important; }
  ```
- Optional: remove `contenteditable` attrs from the cloned node before writing
  (`clone.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'))`).
**Acceptance:** In **dev mode**, "Export PDF" produces a fully-styled PDF identical to the
preview; empty fields print **nothing** (no placeholder text); filled bold/italic/links render.

### Task 1.3 — Summary/Skills not click-to-editable when empty
**File:** `src/preview/ResumePreview.tsx`
**Problem:** `ItemView` returns `null` for empty summary/skills (`if (!f.text?.trim() && !f.text) return null;`),
so there is no element to click in the preview to start typing — the right-pane WYSIWYG promise
breaks for empty sections.
**Fix:** Always render the `<InlineEdit as="p">` for summary/skills items (drop the early
`return null`). The CSS `[data-ph]:empty::before` placeholder already shows "Click to add text…".
Keep the PDF/DOCX side ignoring empty text (they check `.trim()` already).
**Acceptance:** A visible-but-empty Summary section shows a clickable placeholder line in the
preview; clicking it lets you type; it still exports nothing when left empty.

### Task 1.4 — Contact inline-edit mangles values containing colons
**File:** `src/preview/ResumePreview.tsx`
**Problem:** Contacts render as `label: value` in one editable span, and `onChange` does
`plain.replace(/^[^:]+:\s*/, "")` to strip the label back off. A value like `https://x.com`
contains a colon, so editing a labelled link corrupts it (strips `https:`).
**Fix (preferred):** Don't make the `label:` prefix part of the editable text. Render the label
as a static prefix (`{c.label ? c.label + ": " : ""}`) **outside** the `InlineEdit`, and bind
`InlineEdit` only to `c.value`. Store `stripHtml(html)` straight into `c.value` (no prefix
stripping). Contacts are plain text — no formatting needed there.
**Acceptance:** Editing a "GitHub: github.com/x" contact in the preview updates only the URL
and never drops the scheme; the left-pane Header field stays in sync.

### Task 1.5 — Custom-section items aren't inline-editable (consistency)
**File:** `src/preview/ResumePreview.tsx`
**Problem:** Custom-section items render via `dangerouslySetInnerHTML` from the `itemTemplate`
and are **not** editable in the preview (every other field is). Inconsistent UX.
**Fix:** Lower priority — acceptable to leave for now. If addressing: render each custom field
as its own `InlineEdit` (the template is for export composition; editing should target the
underlying `fields[key]`). Document the decision in a code comment either way.
**Acceptance:** Either custom items are inline-editable, or there's a clear comment explaining
they're edited from the left pane only.

---

## Phase 2 — ATS ranking polish (build on Phase 0 v2)

### Task 2.1 — Sort ATS checks by impact + show score ring
**Files:** `src/ui/AtsMeter.tsx`, `src/styles.css`
**Fix:**
- In the popover, sort checks so **fail → warn → pass** (most actionable first).
- Add a small header row in the popover: "ATS Score N/100" with a one-line verdict
  ("Strong" ≥80, "Needs work" 55–79, "At risk" <55).
- Optional: replace the dot with a tiny SVG progress ring (circle stroke-dasharray by score).
**Acceptance:** Opening the chip surfaces failing/warning checks at the top with the score and
a verdict label.

### Task 2.2 — Per-bullet ATS surfacing already exists in FormPane — keep parity
**File:** `src/editor/FormPane.tsx`
**Note:** `BulletRow` already shows verb/metric tags. Confirm it now reads `stripHtml(text)`
(it was updated to use `plain`). Verify after Phase 1.
**Acceptance:** Bolding a word in a bullet doesn't break the "✓ verb / no metric" tags.

### Task 2.3 — JD tailoring: highlight which bullets to edit
**File:** `src/ui/TailorDialog.tsx`, `src/assist/jdMatch.ts`
**Fix (enhancement):** When AI is off, in addition to the missing-keyword chips, list the
**existing bullets** that are the closest match to each missing keyword (so the user knows
where to weave it in). Pure heuristic: for each missing term, find the bullet with the highest
token overlap. Keep it on-device.
**Acceptance:** With a JD pasted and AI off, each missing keyword shows a "consider adding to: …"
hint pointing at a real bullet, or "add to Skills".

---

## Phase 3 — Better data import

### Task 3.1 — Robust contact-line parsing
**File:** `src/import/mapToSchema.ts` (`fillHeader`)
**Problem:** It grabs only the **first** email/phone/url. Real headers pack several contacts on
one line separated by `|`, `•`, `·`. Location is never detected.
**Fix:**
- Split the joined header text on `[|•·\n]` into tokens; classify each token: email (regex),
  phone (regex), URL (regex incl. `linkedin.com`, `github.com`), else if it looks like
  "City, ST" / "City, Country" → location.
- Create a contact per detected token (dedupe by type+value). Label LinkedIn/GitHub links
  by domain.
**Acceptance:** Importing a resume whose header is
`jane@x.com | (555) 123-4567 | linkedin.com/in/jane | Austin, TX` yields 4 contacts of the
correct types.

### Task 3.2 — Header detection fallback when resume starts with a heading
**File:** `src/import/classify.ts`
**Problem:** The "header" block is only built from lines **before the first heading**. If a
parsed resume starts directly with a name in a heading-like font, those lines may be swallowed
into the first section.
**Fix:** If no header block is produced (or it has no name-like first line), treat the first
1–3 non-heading lines of the document as the header candidate and flag confidence "low" so the
triage UI asks the user to confirm.
**Acceptance:** A resume with no clear pre-heading block still proposes a Header block in triage.

### Task 3.3 — Bullet vs wrapped-paragraph reconstruction
**File:** `src/import/mapToSchema.ts` (`parseEntries`), `src/import/extract.ts`
**Problem:** Every non-date line becomes its own bullet. PDF text extraction often splits one
logical bullet across several visual lines, producing fragmented bullets.
**Fix:** Within an entry, **merge** consecutive lines into the same bullet **unless** the line
starts with a bullet glyph (`•·-*▪◦`) or the previous line ended with sentence-final punctuation.
Lines starting with a glyph begin a new bullet. Strip the glyph (already done via `stripBullet`).
**Acceptance:** A 2-line wrapped accomplishment imports as **one** bullet; a genuine bullet list
imports as separate bullets.

### Task 3.4 — Preserve DOCX bold on import (optional)
**File:** `src/import/extract.ts`
**Problem:** `mammoth` yields HTML, but extraction flattens to plain text, losing bold/italic.
**Fix:** When the source is DOCX, keep inline `<b>/<strong>/<i>/<em>` in the extracted line text
(strip everything else). Since fields now store HTML, this round-trips into the editor.
**Acceptance:** A DOCX with a bolded metric imports with that bold intact in the bullet.
**Note:** Sanitize — only allow `b,strong,i,em,br`; drop all other tags/attrs.

### Task 3.5 — Known limitation note
**File:** `src/import/ImportDialog.tsx` (upload stage copy) or README.
Add a one-line note that heavily multi-column / graphic PDFs may parse imperfectly and the
triage screen is the safety net. (Manages expectations; cheap.)

---

## Phase 4 — Customization & polish

### Task 4.1 — Dynamic, editable contacts
**Files:** `src/editor/FormPane.tsx`, `src/schema/*` (no schema change needed — contacts is
already an array), possibly `src/ui/` for an add/remove UI.
**Problem:** Header contacts are a fixed trio from the factory (+link on import). Users can't
add a portfolio, GitHub, second email, etc., or remove ones they don't want.
**Fix:** In the Header card, render each contact with: a **type select** (email/phone/location/link),
an optional **label** input (for links), the **value** input, a **visibility** toggle, and a
**remove** button. Add an "+ Add contact" button. Reuse existing `mutate`.
**Acceptance:** User can add/remove/reorder contacts and toggle visibility; preview + exports
reflect it.

### Task 4.2 — Clickable links in preview & exports
**Files:** `src/preview/ResumePreview.tsx`, `src/export/docx.ts`
**Fix:** Render `link`-type contacts and any `<a>` in fields as real anchors in the preview
(already partly true for `<a>`). In DOCX, map `<a href>` runs to `ExternalHyperlink`. The PDF
already prints anchors since it clones the DOM.
**Acceptance:** A LinkedIn contact is a clickable link in the PDF and a real hyperlink in the DOCX.

### Task 4.3 — Date format option
**Files:** `src/schema/resume.ts` (add `theme.dateFormat: "asTyped" | "MY" | "Y"`), `ResumePreview`,
`docx.ts`.
**Fix:** Add a curated date-format toggle in `DesignDialog`. `asTyped` = current behaviour.
`MY` = "Mar 2021", `Y` = "2021". Apply a tiny formatter where dates are rendered (`it-dates`)
and in DOCX. Keep it best-effort (parse year/month from the stored string).
**Acceptance:** Switching format updates every entry's date display live and in exports.

### Task 4.4 — Drag-to-reorder sections (progressive enhancement)
**File:** `src/editor/FormPane.tsx`
**Fix:** Keep the existing ↑/↓ buttons (a11y-friendly) and add HTML5 drag-and-drop (or
pointer-based) reordering of section cards as an enhancement. Persist via existing
`reorderSection`. Ensure keyboard path remains.
**Acceptance:** Sections can be dragged to reorder; ↑/↓ still work; order persists.

### Task 4.5 — More curated fonts / accent presets (low effort)
**Files:** `src/schema/resume.ts` (`ATS_FONTS`), `src/theme/fonts.ts` (fallback stacks).
**Fix:** Add 2–3 more ATS-safe fonts (e.g., "Cambria", "Verdana", "Tahoma") with proper
fallback stacks. Keep the curated/strict model — no free font input.
**Acceptance:** New fonts appear in the Design dialog and render with correct fallbacks.

---

## Testing guidance (no test runner in repo)

- **Type/build gate:** `npm run typecheck && npm run build` after each task.
- **Pure-logic smoke tests:** for `classify`, `mapToSchema`, `atsCheck`, `jdMatch`, `stripHtml`,
  write a throwaway `_smoke.mts` in the project root and run `npx tsx _smoke.mts`, then delete it.
  (Pattern used previously this session — alias `@/` resolves via tsconfig when run from root.)
- **Browser verification:** use the preview server (`.claude/launch.json` has `dev`); after CSS/DOM
  changes, reload and screenshot; for export bugs, actually trigger export and inspect.
- **Windows note:** stop any running dev/preview server before `npm ci` (it deletes `node_modules`;
  a running server locks files → EBUSY).

## Commit guidance
One commit per task (or per small group), conventional-commit style
(`fix:`, `feat:`, `refactor:`). End with the repo's standard footer. Push after each green phase.

## Suggested order
Phase 0 → 1 (bugs, user-visible) → 2 (ATS) → 3 (import) → 4 (customization).
Phases 1.1–1.4 are the highest value: they fix correctness of the two export paths and the
core WYSIWYG promise.
