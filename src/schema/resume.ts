import { z } from "zod";

/**
 * Canonical Resume schema (v1).
 * This is the single source of truth. The live preview, the PDF, and the DOCX
 * are all PROJECTIONS of this object — never the other way around.
 *
 * ATS-FIRST is enforced by construction here: `theme` only allows a curated set
 * of fonts/sizes/margins, and there is no field anywhere that lets a user emit
 * a table, text box, column, or image into a section body.
 */

// ---- ATS-safe theme (strict mode, per product decision) --------------------

export const ATS_FONTS = [
  "Calibri",
  "Arial",
  "Georgia",
  "Helvetica",
  "Times New Roman",
  "Garamond",
  "Cambria",
  "Verdana",
  "Tahoma",
] as const;

export const ThemeSchema = z.object({
  fontFamily: z.enum(ATS_FONTS).default("Calibri"),
  baseSizePt: z.number().min(9).max(12).default(10.5),
  lineHeight: z.number().min(1).max(1.5).default(1.15),
  sectionGapPt: z.number().min(4).max(16).default(8),
  // margins in inches; bounded so content never collides with ATS scan zones
  margins: z
    .object({
      top: z.number().min(0.4).max(1).default(0.6),
      right: z.number().min(0.4).max(1).default(0.6),
      bottom: z.number().min(0.4).max(1).default(0.6),
      left: z.number().min(0.4).max(1).default(0.6),
    })
    .default({ top: 0.6, right: 0.6, bottom: 0.6, left: 0.6 }),
  // accent restricted to dark, high-contrast tones — keeps text machine-readable
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#1a1a1a"),
  pageSize: z.enum(["Letter", "A4"]).default("Letter"),
  /**
   * Layout variant. Purely visual — same semantic HTML, different CSS class on
   * #resume-paper so ATS-safety is never affected.
   *   classic  — centred name header, full-width ruled sections
   *   modern   — name + accent sidebar stripe, left-aligned header
   *   compact  — tighter spacing, smaller name, optimised for 1-page
   */
  layout: z.enum(["classic", "modern", "compact"]).default("classic"),
  /**
   * Date format for entry dates. Best-effort parsing from stored strings.
   *   asTyped — use the exact string as typed by the user (default)
   *   MY      — "Mar 2021" format (month abbreviation + year)
   *   Y       — "2021" format (year only)
   */
  dateFormat: z.enum(["asTyped", "MY", "Y"]).default("asTyped"),
});
export type Theme = z.infer<typeof ThemeSchema>;

// ---- Header ----------------------------------------------------------------

export const ContactSchema = z.object({
  id: z.string(),
  type: z.enum(["email", "phone", "location", "link"]),
  label: z.string().optional(), // e.g. "GitHub" for a link
  value: z.string(),
  visible: z.boolean().default(true),
});
export type Contact = z.infer<typeof ContactSchema>;

export const HeaderSchema = z.object({
  name: z.string().default(""),
  headline: z.string().default(""),
  contacts: z.array(ContactSchema).default([]),
  /**
   * Optional profile photo. Stored as a data-URL (base64) so it's portable,
   * offline, and never uploaded to any server. ATS caveat is shown in the UI.
   * null = no photo.
   */
  photoDataUrl: z.string().nullable().default(null),
});
export type Header = z.infer<typeof HeaderSchema>;

// ---- Sections --------------------------------------------------------------

export const SECTION_TYPES = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "custom",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const BulletSchema = z.object({
  id: z.string(),
  text: z.string().default(""),
  tailoredFromJD: z.string().nullable().default(null),
});
export type Bullet = z.infer<typeof BulletSchema>;

/**
 * A section item is an open key/value bag plus a typed bullets array.
 * Which keys are meaningful depends on the section type (or, for custom
 * sections, on the document's `customSchemas`). Keeping it open lets custom
 * sections reuse the exact same render path as built-in ones.
 */
export const ItemSchema = z.object({
  id: z.string(),
  fields: z.record(z.string(), z.string()).default({}),
  bullets: z.array(BulletSchema).default([]),
});
export type Item = z.infer<typeof ItemSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  type: z.enum(SECTION_TYPES),
  title: z.string(), // user-editable display label, e.g. "Work Experience"
  customKey: z.string().optional(), // -> customSchemas[customKey] for type==="custom"
  visible: z.boolean().default(true),
  locked: z.boolean().default(false), // template-required, can't be deleted
  items: z.array(ItemSchema).default([]),
});
export type Section = z.infer<typeof SectionSchema>;

// ---- Custom section field definitions (Scenario B) -------------------------

export const CustomFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "url", "year", "date"]).default("text"),
});

export const CustomSchemaSchema = z.object({
  fields: z.array(CustomFieldSchema),
  // template string used to render each item to a single ATS-safe line,
  // e.g. "{authors} ({year}). {title}. {venue}."
  itemTemplate: z.string(),
});
export type CustomSchema = z.infer<typeof CustomSchemaSchema>;

// ---- Document --------------------------------------------------------------

export const ResumeDocumentSchema = z.object({
  schemaVersion: z.literal("1.0").default("1.0"),
  id: z.string(),
  profileId: z.string(),
  meta: z.object({
    title: z.string().default("Untitled Resume"),
    templateId: z.string().default("ats-classic"),
    locale: z.string().default("en-US"),
    createdAt: z.string(),
    updatedAt: z.string(),
    basedOnVariant: z.string().nullable().default(null),
  }),
  theme: ThemeSchema,
  header: HeaderSchema,
  sections: z.array(SectionSchema).default([]),
  customSchemas: z.record(z.string(), CustomSchemaSchema).default({}),
});
export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>;
