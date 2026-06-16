import type { ResumeDocument } from "@/schema/resume";
import { collectText, stripHtml } from "./docText";

/**
 * No-LLM job-description tailoring. Tokenizes the JD, extracts the terms that
 * matter (weighting known skills + multi-word phrases + frequency), and diffs
 * them against the resume text. Runs ENTIRELY in the browser — the pasted JD
 * never touches a network. This is the privacy-safe default (Scenario F).
 */

const STOPWORDS = new Set(
  ("a an the and or but for nor so yet of to in on at by with from as is are be been being " +
    "we you they our your their will would should can could may might must have has had do does " +
    "this that these those it its will role job work team teams company looking ideal candidate " +
    "responsibilities requirements experience years year strong ability able including etc and/or " +
    "plus preferred required must-have nice good great excellent please apply join us who what")
    .split(/\s+/)
);

// Multi-word skills worth detecting as a unit (extend freely).
const PHRASES = [
  "machine learning", "data science", "ci/cd", "unit testing", "rest api", "rest apis",
  "object oriented", "test driven", "version control", "agile", "scrum", "public cloud",
  "distributed systems", "design patterns", "code review", "data structures",
];

const TECH = new Set(
  ("javascript typescript python java go golang rust c++ c# ruby php swift kotlin scala " +
    "react vue angular svelte node nodejs express nextjs django flask fastapi spring rails " +
    "postgres postgresql mysql mongodb redis kafka rabbitmq elasticsearch graphql grpc " +
    "aws azure gcp docker kubernetes terraform ansible jenkins github gitlab " +
    "pandas numpy pytorch tensorflow sql nosql linux bash kubernetes microservices " +
    "figma jira agile scrum tableau powerbi excel salesforce")
    .split(/\s+/)
);

export interface JdTerm {
  term: string;
  weight: number; // higher = more important in the JD
  inResume: boolean;
  suggestedBullet?: string; // closest existing bullet to weave this term into
}

export interface JdReport {
  matched: JdTerm[];
  missing: JdTerm[];
  coverage: number; // 0–1, weighted
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#./\- ]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** Calculate token overlap between two strings (0–1). */
function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  return intersection.size / Math.max(tokensA.size, tokensB.size);
}

/** Collect all bullets from the resume for matching. */
function collectBullets(doc: ResumeDocument): string[] {
  const bullets: string[] = [];
  for (const s of doc.sections.filter(s => s.visible)) {
    for (const it of s.items) {
      for (const b of it.bullets) {
        const text = stripHtml(b.text).trim();
        if (text) bullets.push(text);
      }
    }
  }
  return bullets;
}

export function analyzeJd(doc: ResumeDocument, jdText: string): JdReport {
  const resumeNorm = normalize(collectText(doc));
  const jdNorm = normalize(jdText);
  const bullets = collectBullets(doc);

  const weights = new Map<string, number>();
  const bump = (term: string, w: number) =>
    weights.set(term, (weights.get(term) ?? 0) + w);

  // 1) multi-word phrases (weighted high — specific signals)
  for (const p of PHRASES) {
    const count = jdNorm.split(p).length - 1;
    if (count > 0) bump(p, count * 3);
  }

  // 2) single tokens; tech terms weighted higher than generic words
  for (const tok of tokenize(jdText)) {
    bump(tok, TECH.has(tok) ? 3 : 1);
  }

  const terms: JdTerm[] = [...weights.entries()]
    .map(([term, weight]) => ({
      term,
      weight,
      inResume: resumeNorm.includes(term),
    }))
    // keep meaningful ones: anything tech/phrase, or repeated generic words
    .filter((t) => t.weight >= 3 || PHRASES.includes(t.term) || t.weight >= 2)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 40);

  // For missing terms, find the closest bullet match
  const termsWithSuggestions = terms.map(t => {
    if (t.inResume || bullets.length === 0) return t;
    let bestBullet: string | undefined;
    let bestScore = 0;
    for (const b of bullets) {
      const score = tokenOverlap(t.term, b);
      if (score > bestScore && score > 0.1) { // minimum threshold for relevance
        bestScore = score;
        bestBullet = b.length > 60 ? b.substring(0, 60) + "…" : b;
      }
    }
    return { ...t, suggestedBullet: bestBullet };
  });

  const totalW = terms.reduce((a, t) => a + t.weight, 0) || 1;
  const matchedW = terms.filter((t) => t.inResume).reduce((a, t) => a + t.weight, 0);

  return {
    matched: termsWithSuggestions.filter((t) => t.inResume),
    missing: termsWithSuggestions.filter((t) => !t.inResume),
    coverage: matchedW / totalW,
  };
}
