import { nanoid } from "nanoid";
import type { ClassifiedBlock } from "./classify";
import type { ResumeDocument, Section, Item, SectionType } from "@/schema/resume";
import { createBlankResume } from "@/schema/factory";

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\(?\+?\d[\d\s().-]{7,}\d)/;
const URL = /\b((https?:\/\/)?(www\.)?[\w-]+\.(com|io|dev|org|net|co|app)(\/\S*)?)/i;
// Location pattern: "City, ST" or "City, Country" (2+ words with comma)
const LOCATION = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/;
// A year, optionally preceded by an actual month name (not any word — that
// greedily swallowed the company name in "Acme Corp 2021").
const YEAR = "(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s*)?\\d{4}";
// matches "2021 - 2023", "Mar 2021 – Present", "2021–present", etc.
const DATE_RANGE = new RegExp(
  `(${YEAR})\\s*(?:[–\\-—]|to)\\s*(${YEAR}|present|current|now)`,
  "i"
);

const stripBullet = (s: string) => s.replace(/^[\s•·\-*▪◦]+/, "").trim();

// Check if a line starts with a bullet glyph
const startsWithBullet = (s: string) => /^[\s•·\-*▪◦]/.test(s);

// Check if a line ends with sentence-final punctuation
const endsWithSentencePunctuation = (s: string) => /[.!?]$/.test(s.trim());

/** Parse a contact/header block into the document header. */
function fillHeader(doc: ResumeDocument, lines: string[]) {
  const joined = lines.join("  ");
  doc.header.name = lines[0]?.trim() ?? "";
  // line 2 is often a headline if it isn't itself contact data
  if (lines[1] && !EMAIL.test(lines[1]) && !PHONE.test(lines[1])) {
    doc.header.headline = lines[1].trim();
  }
  const contacts = doc.header.contacts;
  const setContact = (type: "email" | "phone" | "location" | "link", value: string, label?: string) => {
    const existing = contacts.find((c) => c.type === type && c.value === value);
    if (existing) {
      if (label) existing.label = label;
    } else {
      contacts.push({ id: nanoid(), type, value, label, visible: true });
    }
  };

  // Split header text on delimiters to handle multiple contacts
  const tokens = joined.split(/[|•·\n]/).map(t => t.trim()).filter(Boolean);

  for (const token of tokens) {
    // Check for email
    const email = token.match(EMAIL)?.[0];
    if (email) {
      setContact("email", email);
      continue;
    }

    // Check for phone
    const phone = token.match(PHONE)?.[0];
    if (phone) {
      setContact("phone", phone.trim());
      continue;
    }

    // Check for URL (including linkedin.com, github.com)
    const url = token.match(URL)?.[0];
    if (url) {
      // Label by domain
      let label = "Link";
      const domain = url.toLowerCase();
      if (domain.includes("linkedin")) label = "LinkedIn";
      else if (domain.includes("github")) label = "GitHub";
      else if (domain.includes("portfolio")) label = "Portfolio";
      setContact("link", url, label);
      continue;
    }

    // Check for location (City, ST or City, Country pattern)
    const loc = token.match(LOCATION)?.[0];
    if (loc) {
      setContact("location", loc);
      continue;
    }
  }
}

/** Parse entry-style content (experience/education/projects) into items. */
function parseEntries(lines: string[], isEducation = false): Item[] {
  const titleKey = isEducation ? "degree" : "role";
  const items: Item[] = [];
  let current: Item | null = null;
  let pendingBullet: string | null = null; // for merging wrapped lines

  const push = () => {
    if (current) {
      // Flush any pending bullet
      if (pendingBullet) {
        current.bullets.push({ id: nanoid(), text: pendingBullet.trim(), tailoredFromJD: null });
        pendingBullet = null;
      }
      if (Object.keys(current.fields).length || current.bullets.length) items.push(current);
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dm = line.match(DATE_RANGE);

    // A line carrying a date range starts a new entry (its header line).
    if (dm) {
      push();
      const headPart = line.replace(DATE_RANGE, "").replace(/[|,–\-—]\s*$/, "").trim();
      const [role, org] = headPart.split(/\s+[|–—\-]\s+|,\s+|\s+at\s+/i);
      current = {
        id: nanoid(),
        fields: {
          [titleKey]: (role ?? headPart).trim(),
          org: (org ?? "").trim(),
          start: dm[1].trim(),
          end: dm[2].trim(),
        },
        bullets: [],
      };
      continue;
    }

    // Otherwise it's a bullet/detail for the current entry (open one if needed).
    if (!current) current = { id: nanoid(), fields: {}, bullets: [] };

    const stripped = stripBullet(line);
    const isBulletStart = startsWithBullet(line);

    // If line starts with a bullet glyph, start a new bullet
    if (isBulletStart) {
      // Flush any pending bullet first
      if (pendingBullet) {
        current.bullets.push({ id: nanoid(), text: pendingBullet.trim(), tailoredFromJD: null });
        pendingBullet = null;
      }
      pendingBullet = stripped;
    } else if (pendingBullet && !endsWithSentencePunctuation(pendingBullet)) {
      // Merge with previous bullet if it doesn't end with punctuation
      pendingBullet += " " + stripped;
    } else {
      // Start a new bullet
      if (pendingBullet) {
        current.bullets.push({ id: nanoid(), text: pendingBullet.trim(), tailoredFromJD: null });
        pendingBullet = null;
      }
      pendingBullet = stripped;
    }
  }
  push();
  return items.length ? items : [{ id: nanoid(), fields: {}, bullets: [] }];
}

/**
 * Build a fresh ResumeDocument from the user-confirmed triage blocks.
 * Nothing is silently dropped — blocks the user left as "unknown" become
 * hidden custom sections so their text is preserved for later review.
 */
export function mapToSchema(blocks: ClassifiedBlock[]): ResumeDocument {
  const doc = createBlankResume();
  doc.sections = []; // replace starter scaffold with imported content
  doc.meta.title = "Imported Resume";

  for (const b of blocks) {
    if (b.guessedType === "header") {
      fillHeader(doc, b.lines);
      continue;
    }

    const type: SectionType = b.guessedType === "unknown" ? "custom" : b.guessedType;
    const section: Section = {
      id: nanoid(),
      type,
      title: b.guessedTitle || "Section",
      visible: b.guessedType !== "unknown", // unknown -> hidden "review later"
      locked: false,
      items: [],
    };

    if (type === "summary") {
      section.items = [{ id: nanoid(), fields: { text: b.lines.join(" ") }, bullets: [] }];
    } else if (type === "skills") {
      section.items = [{ id: nanoid(), fields: { text: b.lines.join(", ") }, bullets: [] }];
    } else if (type === "custom") {
      section.customKey = (b.guessedTitle || "section").toLowerCase().replace(/\s+/g, "_");
      doc.customSchemas[section.customKey] = {
        fields: [{ key: "text", label: "Text", type: "text" }],
        itemTemplate: "{text}",
      };
      section.items = b.lines.map((l) => ({ id: nanoid(), fields: { text: l }, bullets: [] }));
    } else {
      section.items = parseEntries(b.lines, type === "education");
    }

    doc.sections.push(section);
  }

  if (doc.sections.length === 0) doc.sections = createBlankResume().sections;
  return doc;
}
