import type { ResumeDocument } from "@/schema/resume";

/**
 * Strip inline-editor HTML (<b>, <i>, <a>, <br>…) down to plain text.
 * Field values are stored as HTML since the WYSIWYG editor landed, so EVERY
 * analysis path (ATS checks, JD matching, verb hints) must go through this
 * or it will "see" markup. Regex-based (no DOM) so node smoke tests work.
 */
export function stripHtml(s: string): string {
  if (!s) return "";
  if (!/[<&]/.test(s)) return s;
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ") // collapse spaces but keep newlines (AI prompts use them)
    .trim();
}

/**
 * Format a date string according to the specified format.
 * Best-effort parsing: extracts year and month from various formats.
 */
export function formatDate(dateStr: string, format: "asTyped" | "MY" | "Y"): string {
  if (!dateStr || format === "asTyped") return dateStr;

  // Try to extract year (4 digits)
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : "";

  if (format === "Y") {
    return year || dateStr;
  }

  if (format === "MY") {
    // Try to extract month (full name, abbreviation, or number)
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    let month = "";
    for (let i = 0; i < monthNames.length; i++) {
      if (dateStr.toLowerCase().includes(monthNames[i].toLowerCase()) ||
          dateStr.toLowerCase().includes(monthAbbr[i].toLowerCase())) {
        month = monthAbbr[i];
        break;
      }
    }

    // Try numeric month (MM or M)
    if (!month) {
      const numMonthMatch = dateStr.match(/\b(0?[1-9]|1[0-2])\b/);
      if (numMonthMatch) {
        const num = parseInt(numMonthMatch[0], 10);
        if (num >= 1 && num <= 12) {
          month = monthAbbr[num - 1];
        }
      }
    }

    if (year && month) return `${month} ${year}`;
    if (year) return year;
    return dateStr;
  }

  return dateStr;
}

/** All human-readable text in the document, for analysis (ATS, JD match). */
export function collectText(doc: ResumeDocument): string {
  const parts: string[] = [doc.header.name, doc.header.headline];
  for (const s of doc.sections) {
    if (!s.visible) continue;
    parts.push(s.title);
    for (const it of s.items) {
      parts.push(...Object.values(it.fields));
      parts.push(...it.bullets.map((b) => b.text));
    }
  }
  return stripHtml(parts.filter(Boolean).join("\n"));
}

/** Count of visible, non-empty bullets across entry-style sections. */
export function countBullets(doc: ResumeDocument): number {
  let n = 0;
  for (const s of doc.sections) {
    if (!s.visible) continue;
    for (const it of s.items) n += it.bullets.filter((b) => b.text.trim()).length;
  }
  return n;
}
