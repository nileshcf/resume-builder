import type { ResumeDocument } from "@/schema/resume";
import { collectText, countBullets, stripHtml } from "./docText";
import { analyzeBullet } from "./verbs";

/**
 * No-LLM ATS / quality meter, v2. Runs offline on every edit (cheap).
 *
 * The structural ATS guarantees (semantic headings, no tables/columns, safe
 * fonts) are enforced by the SCHEMA itself — this meter scores what the schema
 * can't enforce: content quality, completeness, and parser-hostile content.
 *
 * v2: weighted scoring (contact info matters more than length), HTML-stripped
 * analysis (fields are stored as inline-editor HTML), and new checks for
 * standard section headings, reverse-chronological order, parser-hostile
 * characters, first-person pronouns, and skills coverage.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface AtsCheck {
  label: string;
  status: CheckStatus;
  detail: string;
  /** Relative importance in the 0–100 score (default 1). */
  weight: number;
}

export interface AtsReport {
  score: number; // 0–100, weighted
  checks: AtsCheck[];
}

const EMOJI_RX = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const PRONOUN_RX = /\b(I|me|my|mine|we|our)\b/;

/** Standard heading vocabulary ATS parsers map sections with. */
const STANDARD_TITLES: Partial<Record<string, RegExp>> = {
  experience: /(experience|employment|work\s*history)/i,
  education: /(education|academic)/i,
  skills: /(skills?|competenc|technolog|tools)/i,
  summary: /(summary|profile|objective|about)/i,
  certifications: /(certification|license|courses)/i,
  projects: /(projects?)/i,
};

/** First 4-digit year in a date-ish string ("Mar 2021", "2021-03"). */
function yearOf(s: string | undefined): number | null {
  const m = s?.match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

export function runAtsCheck(doc: ResumeDocument): AtsReport {
  const checks: AtsCheck[] = [];
  const contacts = doc.header.contacts.filter((c) => c.visible && c.value.trim());
  const hasEmail = contacts.some((c) => c.type === "email");
  const hasPhone = contacts.some((c) => c.type === "phone");
  const hasLink = contacts.some((c) => c.type === "link" && c.value.trim());
  const visibleSections = doc.sections.filter((s) => s.visible);
  const types = new Set(visibleSections.map((s) => s.type));

  // ---- Contact (heavily weighted: ATS keys off it) -----------------------
  checks.push({
    label: "Name & contact",
    weight: 3,
    status: stripHtml(doc.header.name).trim() && hasEmail ? "pass" : "fail",
    detail: !stripHtml(doc.header.name).trim()
      ? "Add your name."
      : !hasEmail
      ? "Add an email — ATS systems key off it."
      : hasPhone
      ? "Name, email, and phone present."
      : "Consider adding a phone number.",
  });

  // ---- Core sections ------------------------------------------------------
  checks.push({
    label: "Core sections",
    weight: 2,
    status: types.has("experience") && types.has("education") ? "pass" : "warn",
    detail:
      [
        types.has("experience") ? null : "Experience",
        types.has("education") ? null : "Education",
        types.has("skills") ? null : "Skills",
      ]
        .filter(Boolean)
        .map((m) => `Missing ${m}`)
        .join("; ") || "Experience, Education, and Skills present.",
  });

  // ---- Standard headings (ATS maps sections by their title text) ---------
  const nonStandard = visibleSections.filter((s) => {
    const rx = STANDARD_TITLES[s.type];
    return rx && !rx.test(stripHtml(s.title));
  });
  checks.push({
    label: "Standard headings",
    weight: 2,
    status: nonStandard.length === 0 ? "pass" : "warn",
    detail:
      nonStandard.length === 0
        ? "All section headings use ATS-recognised wording."
        : `"${stripHtml(nonStandard[0].title)}" may not be recognised — ` +
          `ATS parsers look for standard headings like "Experience" or "Education".`,
  });

  // ---- Reverse-chronological order ----------------------------------------
  const expSection = visibleSections.find((s) => s.type === "experience");
  let chrono: CheckStatus = "pass";
  let chronoDetail = "Experience is listed newest-first.";
  if (expSection) {
    const years = expSection.items
      .map((it) => yearOf(stripHtml(it.fields.start ?? "")))
      .filter((y): y is number => y !== null);
    for (let i = 1; i < years.length; i++) {
      if (years[i] > years[i - 1]) {
        chrono = "warn";
        chronoDetail = "List experience reverse-chronologically (newest first) — recruiters and ATS expect it.";
        break;
      }
    }
    if (years.length === 0 && expSection.items.length > 0) {
      chrono = "warn";
      chronoDetail = "Add dates to your experience entries — ATS parsers extract work history from them.";
    }
  }
  checks.push({ label: "Chronology & dates", weight: 1, status: chrono, detail: chronoDetail });

  // ---- Bullet quality ------------------------------------------------------
  const bulletTexts: string[] = [];
  for (const s of visibleSections) {
    for (const it of s.items) {
      bulletTexts.push(...it.bullets.map((b) => stripHtml(b.text)).filter((t) => t.trim()));
    }
  }
  const analyzed = bulletTexts.map(analyzeBullet);
  const quantified = analyzed.filter((a) => a.hasMetric).length;
  const weak = analyzed.filter((a) => a.weakOpener || !a.startsWithVerb).length;

  checks.push({
    label: "Quantified impact",
    weight: 2,
    status: bulletTexts.length === 0 ? "warn" : quantified / bulletTexts.length >= 0.4 ? "pass" : "warn",
    detail:
      bulletTexts.length === 0
        ? "Add accomplishment bullets with metrics."
        : `${quantified}/${bulletTexts.length} bullets include a number. Aim for ~half.`,
  });

  checks.push({
    label: "Strong verbs",
    weight: 2,
    status: bulletTexts.length === 0 ? "warn" : weak === 0 ? "pass" : weak <= 2 ? "warn" : "fail",
    detail:
      weak === 0 && bulletTexts.length > 0
        ? "Every bullet opens with an action verb."
        : `${weak} bullet(s) start weakly ("responsible for", etc.).`,
  });

  // ---- Clean text (parser-hostile content) --------------------------------
  const allText = collectText(doc);
  const issues: string[] = [];
  if (EMOJI_RX.test(allText)) issues.push("emoji/symbols (many parsers garble them)");
  if (PRONOUN_RX.test(bulletTexts.join(" "))) issues.push('first-person pronouns ("I", "my") — use implied first person');
  const overlong = analyzed.filter((a) => a.tooLong).length;
  if (overlong > 0) issues.push(`${overlong} bullet(s) over ~240 chars — split them`);
  checks.push({
    label: "Clean text",
    weight: 1,
    status: issues.length === 0 ? "pass" : "warn",
    detail: issues.length === 0 ? "No parser-hostile characters or phrasing." : `Found: ${issues.join("; ")}.`,
  });

  // ---- Skills coverage -----------------------------------------------------
  const skillsSection = visibleSections.find((s) => s.type === "skills");
  const skillCount = skillsSection
    ? stripHtml(skillsSection.items.map((it) => it.fields.text ?? "").join(","))
        .split(/[,;•|]/)
        .map((x) => x.trim())
        .filter(Boolean).length
    : 0;
  checks.push({
    label: "Skills coverage",
    weight: 1,
    status: skillCount >= 5 ? "pass" : "warn",
    detail:
      skillCount >= 5
        ? `${skillCount} skills listed — good keyword surface for ATS matching.`
        : `Only ${skillCount} skill(s) listed — ATS keyword-matches against this section; aim for 8–15.`,
  });

  // ---- Web presence --------------------------------------------------------
  checks.push({
    label: "Web presence",
    weight: 1,
    status: hasLink ? "pass" : "warn",
    detail: hasLink
      ? "LinkedIn/portfolio link present."
      : "Add a LinkedIn or portfolio link — recruiters expect one.",
  });

  // ---- Length --------------------------------------------------------------
  const words = allText.split(/\s+/).filter(Boolean).length;
  checks.push({
    label: "Length",
    weight: 1,
    status: words < 200 ? "warn" : words > 1100 ? "warn" : "pass",
    detail:
      words < 200
        ? "Looks thin — most resumes run 350–800 words."
        : words > 1100
        ? "Looks long — consider trimming toward 1–2 pages."
        : `~${words} words — a healthy length.`,
  });

  // ---- Content volume ------------------------------------------------------
  checks.push({
    label: "Content present",
    weight: 1,
    status: countBullets(doc) >= 3 ? "pass" : "warn",
    detail: `${countBullets(doc)} accomplishment bullet(s).`,
  });

  // ---- Photo (only when present — docks the score, explains why) ----------
  if (doc.header.photoDataUrl) {
    checks.push({
      label: "Profile photo",
      weight: 2,
      status: "warn",
      detail:
        "Photo present — most ATS parsers (Taleo, Workday, Greenhouse) ignore or misread images. " +
        "Only keep it if the role or region expects one.",
    });
  }

  // Weighted score: pass=1, warn=0.5, fail=0.
  const totalW = checks.reduce((a, c) => a + c.weight, 0);
  const earned = checks.reduce(
    (a, c) => a + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0),
    0
  );
  const score = Math.round((earned / totalW) * 100);
  return { score, checks };
}
