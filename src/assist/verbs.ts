/**
 * No-LLM writing assistance. Pure heuristics, runs offline.
 * Used to coach bullet quality and suggest stronger phrasing without any AI.
 */

export const ACTION_VERBS = [
  "Led", "Built", "Designed", "Architected", "Launched", "Shipped", "Delivered",
  "Reduced", "Increased", "Improved", "Optimized", "Automated", "Streamlined",
  "Scaled", "Migrated", "Refactored", "Implemented", "Developed", "Created",
  "Drove", "Owned", "Spearheaded", "Established", "Negotiated", "Mentored",
  "Coordinated", "Analyzed", "Resolved", "Accelerated", "Generated", "Saved",
  "Cut", "Grew", "Boosted", "Eliminated", "Consolidated", "Pioneered",
];

// Phrases that weaken a bullet — recruiters skim past these.
const WEAK_OPENERS = [
  "responsible for", "worked on", "helped with", "helped to", "assisted with",
  "assisted in", "duties included", "tasked with", "in charge of", "involved in",
  "participated in",
];

const METRIC = /(\d+(\.\d+)?\s?(%|percent|x|k|m|bn?|million|billion)?|\$\s?\d)/i;

export interface BulletHint {
  startsWithVerb: boolean;
  hasMetric: boolean;
  weakOpener: string | null;
  tooLong: boolean;
  /** human-readable nudges, empty when the bullet looks good */
  tips: string[];
  /** suggested stronger verbs to open with (heuristic) */
  suggestedVerbs: string[];
}

export function analyzeBullet(text: string): BulletHint {
  const t = text.trim();
  const lower = t.toLowerCase();
  const firstWord = t.split(/\s+/)[0] ?? "";

  const startsWithVerb = ACTION_VERBS.some(
    (v) => v.toLowerCase() === firstWord.toLowerCase().replace(/[^a-z]/gi, "")
  );
  const hasMetric = METRIC.test(t);
  const weakOpener = WEAK_OPENERS.find((w) => lower.startsWith(w)) ?? null;
  const tooLong = t.length > 240;

  const tips: string[] = [];
  if (weakOpener) tips.push(`Drop "${weakOpener}" — open with an action verb instead.`);
  else if (!startsWithVerb && t.length > 0)
    tips.push("Start with a strong action verb (e.g. Led, Built, Reduced).");
  if (!hasMetric && t.length > 0)
    tips.push("Quantify the impact — add a number, %, or $ figure.");
  if (tooLong) tips.push("Tighten this to one line (~under 240 chars).");

  return {
    startsWithVerb,
    hasMetric,
    weakOpener,
    tooLong,
    tips,
    suggestedVerbs: pickVerbs(t),
  };
}

/** Deterministically pick 3 verbs (seeded by text length so it's stable, no RNG). */
function pickVerbs(seedText: string): string[] {
  const start = seedText.length % ACTION_VERBS.length;
  return [0, 7, 14].map((o) => ACTION_VERBS[(start + o) % ACTION_VERBS.length]);
}
