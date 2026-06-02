import type { ResumeDocument } from "@/schema/resume";
import { collectText } from "@/assist/docText";
import { analyzeBullet } from "@/assist/verbs";
import type { JdReport } from "@/assist/jdMatch";
import { chat } from "./client";
import { aiEnabled, loadAiConfig } from "./config";

/**
 * High-level resume capabilities. Each tries the user's LLM if configured and
 * falls back to a no-LLM heuristic otherwise, so behaviour is identical in
 * shape whether or not AI is enabled — the AI version is just richer.
 */

export interface Suggestion {
  text: string;
  source: "ai" | "heuristic";
}

/** Rewrite a single accomplishment bullet to be stronger / quantified. */
export async function improveBullet(text: string): Promise<Suggestion> {
  const cfg = loadAiConfig();
  if (aiEnabled(cfg) && text.trim()) {
    const out = await chat(cfg, {
      system:
        "You rewrite resume bullets. Return ONE concise line: start with a strong " +
        "past-tense action verb, keep the user's facts, add a quantified result only " +
        "if implied. No preamble, no quotes, under 240 characters.",
      user: text,
      maxTokens: 120,
    });
    if (out) return { text: out.replace(/^["'\-\s]+/, "").trim(), source: "ai" };
  }
  // Heuristic fallback: prepend a strong verb / strip weak opener, flag metric.
  const h = analyzeBullet(text);
  let t = text.trim();
  if (h.weakOpener) t = t.slice(h.weakOpener.length).trim().replace(/^[a-z]/, (c) => c.toUpperCase());
  if (!h.startsWithVerb && t) t = `${h.suggestedVerbs[0]} ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  if (!h.hasMetric) t += " — quantify the impact (add a %, number, or $).";
  return { text: t, source: "heuristic" };
}

/** Draft a professional summary from the rest of the resume. */
export async function generateSummary(doc: ResumeDocument): Promise<Suggestion> {
  const cfg = loadAiConfig();
  if (aiEnabled(cfg)) {
    const out = await chat(cfg, {
      system:
        "Write a 2–3 sentence professional resume summary in first-person-implied " +
        "voice (no 'I'). Base it ONLY on the resume content provided. No clichés, " +
        "no fabricated facts. Plain text only.",
      user: collectText(doc).slice(0, 4000),
      maxTokens: 200,
    });
    if (out) return { text: out, source: "ai" };
  }
  // Heuristic fallback: assemble from role + top skills.
  const exp = doc.sections.find((s) => s.type === "experience");
  const role = exp?.items[0]?.fields.role || doc.header.headline || "professional";
  const skills = doc.sections.find((s) => s.type === "skills")?.items[0]?.fields.text ?? "";
  const top = skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 4).join(", ");
  return {
    text: `${role} with hands-on experience${top ? ` in ${top}` : ""}. ` +
      `Add 1–2 sentences on your biggest achievement and what you're looking for.`,
    source: "heuristic",
  };
}

/** Suggest concrete additions to close a JD keyword gap. */
export async function tailorSuggestions(
  doc: ResumeDocument,
  jdText: string,
  report: JdReport
): Promise<Suggestion[]> {
  const cfg = loadAiConfig();
  const missing = report.missing.map((m) => m.term).slice(0, 15);
  if (aiEnabled(cfg) && missing.length) {
    const out = await chat(cfg, {
      system:
        "You help tailor a resume to a job. Given the resume and a list of missing " +
        "keywords from the job description, suggest up to 6 specific, truthful bullet " +
        "edits or additions that would naturally incorporate the relevant keywords. " +
        "Only suggest things consistent with the resume. Return one suggestion per line, " +
        "no numbering.",
      user:
        `RESUME:\n${collectText(doc).slice(0, 2500)}\n\n` +
        `JOB DESCRIPTION:\n${jdText.slice(0, 1500)}\n\n` +
        `MISSING KEYWORDS:\n${missing.join(", ")}`,
      maxTokens: 400,
    });
    if (out)
      return out
        .split("\n")
        .map((l) => l.replace(/^[\d.\-*\s]+/, "").trim())
        .filter(Boolean)
        .map((text) => ({ text, source: "ai" as const }));
  }
  // Heuristic fallback: tell them exactly which missing terms to weave in.
  if (!missing.length) return [{ text: "Great coverage — no major keyword gaps.", source: "heuristic" }];
  return [
    {
      text:
        `Consider adding these JD keywords where truthful: ${missing.slice(0, 10).join(", ")}. ` +
        "Add them to your Skills section or weave into relevant bullets.",
      source: "heuristic",
    },
  ];
}
