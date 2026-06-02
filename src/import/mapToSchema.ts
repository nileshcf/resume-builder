import { nanoid } from "nanoid";
import type { ClassifiedBlock } from "./classify";
import type { ResumeDocument, Section, Item, SectionType } from "@/schema/resume";
import { createBlankResume } from "@/schema/factory";

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\(?\+?\d[\d\s().-]{7,}\d)/;
const URL = /\b((https?:\/\/)?(www\.)?[\w-]+\.(com|io|dev|org|net)(\/\S*)?)/i;
// A year, optionally preceded by an actual month name (not any word — that
// greedily swallowed the company name in "Acme Corp 2021").
const YEAR = "(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s*)?\\d{4}";
// matches "2021 - 2023", "Mar 2021 – Present", "2021–present", etc.
const DATE_RANGE = new RegExp(
  `(${YEAR})\\s*(?:[–\\-—]|to)\\s*(${YEAR}|present|current|now)`,
  "i"
);

const stripBullet = (s: string) => s.replace(/^[\s•·\-*▪◦]+/, "").trim();

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
    const existing = contacts.find((c) => c.type === type && !c.value);
    if (existing) {
      existing.value = value;
      if (label) existing.label = label;
    } else {
      contacts.push({ id: nanoid(), type, value, label, visible: true });
    }
  };
  const email = joined.match(EMAIL)?.[0];
  if (email) setContact("email", email);
  const phone = joined.match(PHONE)?.[0];
  if (phone) setContact("phone", phone.trim());
  // Strip the email before hunting for a URL, else its domain (e.g. "email.com")
  // gets mistaken for a personal link.
  const url = joined.replace(EMAIL, "").match(URL)?.[0];
  if (url) setContact("link", url, "Link");
}

/** Parse entry-style content (experience/education/projects) into items. */
function parseEntries(lines: string[], isEducation = false): Item[] {
  const titleKey = isEducation ? "degree" : "role";
  const items: Item[] = [];
  let current: Item | null = null;

  const push = () => {
    if (current && (Object.keys(current.fields).length || current.bullets.length)) items.push(current);
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
    current.bullets.push({ id: nanoid(), text: stripBullet(line), tailoredFromJD: null });
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
