import type { ResumeDocument } from "@/schema/resume";
import { collectText, countBullets } from "./docText";
import { analyzeBullet } from "./verbs";

/**
 * No-LLM ATS / quality meter. Runs offline on every edit (cheap).
 * Note: the structural ATS guarantees (semantic headings, no tables/columns/
 * images, safe fonts) are enforced by the SCHEMA itself — this meter therefore
 * focuses on content quality and completeness, which the schema can't enforce.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface AtsCheck {
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface AtsReport {
  score: number; // 0–100
  checks: AtsCheck[];
}

export function runAtsCheck(doc: ResumeDocument): AtsReport {
  const checks: AtsCheck[] = [];
  const contacts = doc.header.contacts.filter((c) => c.visible && c.value.trim());
  const hasEmail = contacts.some((c) => c.type === "email");
  const hasPhone = contacts.some((c) => c.type === "phone");
  const types = new Set(doc.sections.filter((s) => s.visible).map((s) => s.type));

  checks.push({
    label: "Name & contact",
    status: doc.header.name.trim() && hasEmail ? "pass" : "fail",
    detail: !doc.header.name.trim()
      ? "Add your name."
      : !hasEmail
      ? "Add an email — ATS systems key off it."
      : hasPhone
      ? "Name, email, and phone present."
      : "Consider adding a phone number.",
  });

  checks.push({
    label: "Core sections",
    status: types.has("experience") && types.has("education") ? "pass" : "warn",
    detail: [
      types.has("experience") ? null : "Experience",
      types.has("education") ? null : "Education",
      types.has("skills") ? null : "Skills",
    ]
      .filter(Boolean)
      .map((m) => `Missing ${m}`)
      .join("; ") || "Experience, Education, and Skills present.",
  });

  // Bullet quality across entry sections
  const bulletTexts: string[] = [];
  for (const s of doc.sections) {
    if (!s.visible) continue;
    for (const it of s.items) bulletTexts.push(...it.bullets.map((b) => b.text).filter((t) => t.trim()));
  }
  const analyzed = bulletTexts.map(analyzeBullet);
  const quantified = analyzed.filter((a) => a.hasMetric).length;
  const weak = analyzed.filter((a) => a.weakOpener || !a.startsWithVerb).length;

  checks.push({
    label: "Quantified impact",
    status: bulletTexts.length === 0 ? "warn" : quantified / bulletTexts.length >= 0.4 ? "pass" : "warn",
    detail: bulletTexts.length === 0
      ? "Add accomplishment bullets with metrics."
      : `${quantified}/${bulletTexts.length} bullets include a number. Aim for ~half.`,
  });

  checks.push({
    label: "Strong verbs",
    status: bulletTexts.length === 0 ? "warn" : weak === 0 ? "pass" : weak <= 2 ? "warn" : "fail",
    detail: weak === 0 && bulletTexts.length > 0
      ? "Every bullet opens with an action verb."
      : `${weak} bullet(s) start weakly ("responsible for", etc.).`,
  });

  // Rough length signal (no real pagination here — just a content-volume heuristic)
  const words = collectText(doc).split(/\s+/).filter(Boolean).length;
  checks.push({
    label: "Length",
    status: words < 200 ? "warn" : words > 1100 ? "warn" : "pass",
    detail: words < 200
      ? "Looks thin — most resumes run 350–800 words."
      : words > 1100
      ? "Looks long — consider trimming toward 1–2 pages."
      : `~${words} words — a healthy length.`,
  });

  checks.push({
    label: "Content present",
    status: countBullets(doc) >= 3 ? "pass" : "warn",
    detail: `${countBullets(doc)} accomplishment bullet(s).`,
  });

  // Photo: many ATS parsers (Taleo, Workday, Greenhouse) skip or garble images.
  // Flag it as a warn — not fail, because some markets/roles expect it.
  if (doc.header.photoDataUrl) {
    checks.push({
      label: "Profile photo",
      status: "warn",
      detail:
        "Photo present — most ATS parsers ignore or misread images. " +
        "Only keep it if the role or region expects one (e.g. some EU/Asian markets).",
    });
  }

  // Score: pass=full, warn=half, fail=0, averaged.
  const pts: number[] = checks.map((c) => (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0));
  const score = Math.round((pts.reduce((a, b) => a + b, 0) / checks.length) * 100);
  return { score, checks };
}
