# Contributing

Thanks for your interest! This is a small, dependency-light project — contributions
that keep it that way are especially welcome.

## Setup

```bash
nvm use            # Node 20 (see .nvmrc)
npm install
npm run dev
```

## Before you open a PR

CI runs the same two checks — please run them locally first:

```bash
npm run typecheck   # tsc --noEmit, strict mode
npm run build       # tsc -b && vite build
```

A green `npm run build` is the bar for merge.

## Ground rules (the non-negotiables)

These are the project's load-bearing invariants. PRs that break them won't merge:

1. **Stay 100% client-side.** No backend, no server calls except the user's own
   optional AI provider. This is what keeps the app free to host and private.
2. **Never break ATS-safety.** No feature may let a section body emit a table,
   column, text box, or image. New fonts/sizes/margins go through the curated
   `theme` schema in `src/schema/resume.ts`.
3. **The schema is the single source of truth.** Preview, PDF, and DOCX are
   *projections* of `ResumeDocument`. Don't add state that lives only in a view.
4. **Keep the initial bundle lean.** Heavy/rarely-first-used code (parsers, export,
   dialogs) must be code-split via dynamic `import()` / `React.lazy`.
5. **Don't put developer branding into the exported document.** Credit/footer UI
   lives in app chrome only; exports read `#resume-paper` and must stay clean.

## Project map

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the module-by-module layout
and the key design decisions (render parity, persistence, AI fallbacks).

## Commit style

Small, focused commits with a clear subject line. Conventional-commit prefixes
(`feat:`, `fix:`, `docs:`, `chore:`) are appreciated but not required.
