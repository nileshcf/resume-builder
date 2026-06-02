import type { RawLine } from "./extract";
import type { SectionType } from "@/schema/resume";

/**
 * Heuristic, no-LLM section classifier. Runs entirely in the browser.
 * Strategy: detect heading lines (keyword dictionary first, formatting second),
 * then group the lines beneath each heading into a block. Every block carries a
 * confidence so the triage UI can flag the uncertain ones for the user.
 */

export interface ClassifiedBlock {
  id: string;
  guessedType: SectionType | "header" | "unknown";
  guessedTitle: string;
  confidence: "high" | "medium" | "low";
  lines: string[];
}

// keyword -> canonical section type. Order matters (longer/more specific first).
const HEADING_MAP: { rx: RegExp; type: SectionType; title: string }[] = [
  { rx: /^(work\s+)?(experience|employment|professional\s+experience|work\s+history)$/i, type: "experience", title: "Experience" },
  { rx: /^(education|academic\s+background|qualifications)$/i, type: "education", title: "Education" },
  { rx: /^(technical\s+)?(skills|competencies|technologies)$/i, type: "skills", title: "Skills" },
  { rx: /^(summary|profile|objective|about( me)?)$/i, type: "summary", title: "Summary" },
  { rx: /^(projects?|personal\s+projects?)$/i, type: "projects", title: "Projects" },
  { rx: /^(certifications?|licenses?|courses?)$/i, type: "certifications", title: "Certifications" },
  { rx: /^(publications?|papers?|research)$/i, type: "custom", title: "Publications" },
  { rx: /^(awards?|honou?rs?|achievements?)$/i, type: "custom", title: "Awards" },
];

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;

function looksLikeHeading(line: RawLine, medianFont: number): boolean {
  const t = line.text.trim();
  if (t.length > 40 || t.split(" ").length > 5) return false; // headings are short
  const allCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
  const bigger = line.fontSize > medianFont * 1.15;
  return allCaps || line.bold || bigger;
}

function matchKeyword(text: string) {
  const t = text.replace(/[:\s]+$/, "").trim();
  return HEADING_MAP.find((h) => h.rx.test(t));
}

export function classify(lines: RawLine[]): ClassifiedBlock[] {
  if (lines.length === 0) return [];

  const fonts = lines.map((l) => l.fontSize).filter((f) => f > 0).sort((a, b) => a - b);
  const medianFont = fonts.length ? fonts[Math.floor(fonts.length / 2)] : 11;

  const blocks: ClassifiedBlock[] = [];
  let current: ClassifiedBlock | null = null;
  let idCounter = 0;
  const newId = () => `blk_${idCounter++}`;

  // First block before any heading = contact/header (name + email/phone/links).
  const headerLines: string[] = [];
  let started = false;

  for (const line of lines) {
    const kw = matchKeyword(line.text);
    const isHeading = kw ? true : looksLikeHeading(line, medianFont);

    if (isHeading && (kw || started)) {
      // close previous block, open a new one
      if (current) blocks.push(current);
      current = {
        id: newId(),
        guessedType: kw ? kw.type : "unknown",
        guessedTitle: kw ? kw.title : line.text.replace(/[:\s]+$/, "").trim(),
        confidence: kw ? "high" : looksLikeHeading(line, medianFont) ? "medium" : "low",
        lines: [],
      };
      started = true;
      continue;
    }

    if (!started) {
      headerLines.push(line.text);
    } else if (current) {
      current.lines.push(line.text);
    }
  }
  if (current) blocks.push(current);

  // Promote the pre-heading lines into a header block if it looks like contact info.
  if (headerLines.length) {
    const joined = headerLines.join(" ");
    const hasContact = EMAIL.test(joined) || PHONE.test(joined);
    blocks.unshift({
      id: newId(),
      guessedType: "header",
      guessedTitle: "Header / Contact",
      confidence: hasContact ? "high" : "low",
      lines: headerLines,
    });
  }

  // Demote empty blocks; flag blocks whose body is suspiciously short/long as low conf.
  for (const b of blocks) {
    if (b.guessedType === "unknown" && b.confidence === "low" && b.lines.length === 0) {
      b.confidence = "low";
    }
  }
  return blocks.filter((b) => b.lines.length > 0 || b.guessedType === "header");
}
