import type { ResumeDocument } from "@/schema/resume";

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
  return parts.filter(Boolean).join("\n");
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
