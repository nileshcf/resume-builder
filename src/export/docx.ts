import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import type { ResumeDocument, Section, Item } from "@/schema/resume";

/**
 * DOCX export — the editable twin of the PDF. This is the APPROXIMATION layer:
 * same content, headings, order, and font-by-name as the PDF, plus native Word
 * keep-with-next / keep-lines / widow controls so page breaks behave like the
 * PDF. Residual visual drift (line-break positions) is confined here, never in
 * the PDF the user visually approved.
 */
export async function exportDocx(doc: ResumeDocument) {
  const { theme, header } = doc;
  const sizeHalfPt = Math.round(theme.baseSizePt * 2); // docx uses half-points
  const font = theme.fontFamily;
  const accent = theme.accentColor.replace("#", "").toUpperCase();

  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [new TextRun({ text: header.name || "Your Name", bold: true, size: 40, font, color: accent })],
    })
  );
  if (header.headline)
    children.push(new Paragraph({ children: [new TextRun({ text: header.headline, size: 22, font })] }));

  const contacts = header.contacts
    .filter((c) => c.visible && c.value.trim())
    .map((c) => (c.label ? `${c.label}: ${c.value}` : c.value))
    .join("  •  ");
  if (contacts)
    children.push(new Paragraph({ children: [new TextRun({ text: contacts, size: 19, font })] }));

  for (const section of doc.sections.filter((s) => s.visible)) {
    children.push(sectionHeading(section.title, font, accent));
    for (const item of section.items) {
      children.push(...itemParagraphs(item, section, doc, font, sizeHalfPt));
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(theme.margins.top),
              right: convertInchesToTwip(theme.margins.right),
              bottom: convertInchesToTwip(theme.margins.bottom),
              left: convertInchesToTwip(theme.margins.left),
              // widowControl is applied per-paragraph below
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, `${doc.meta.title || "resume"}.docx`);
}

function sectionHeading(title: string, font: string, accent: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true, // never strand a heading at page bottom (Scenario C)
    spacing: { before: 160, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 1 } },
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 22, font, color: accent })],
  });
}

function itemParagraphs(
  item: Item,
  section: Section,
  doc: ResumeDocument,
  font: string,
  sizeHalfPt: number
): Paragraph[] {
  const f = item.fields;
  const out: Paragraph[] = [];

  if (section.type === "custom" && section.customKey) {
    const schema = doc.customSchemas[section.customKey];
    const line = schema
      ? schema.itemTemplate.replace(/\{(\w+)\}/g, (_, k) => f[k] ?? "")
      : Object.values(f).join(" ");
    if (line.trim())
      out.push(new Paragraph({ widowControl: true, children: [new TextRun({ text: line, size: sizeHalfPt, font })] }));
    return out;
  }

  if (section.type === "summary" || section.type === "skills") {
    if (f.text?.trim())
      out.push(new Paragraph({ widowControl: true, children: [new TextRun({ text: f.text, size: sizeHalfPt, font })] }));
    return out;
  }

  const title = f.role || f.degree || f.title || "";
  const org = f.org || "";
  const dates = [f.start, f.end].filter(Boolean).join(" – ");
  const headText = [title, org].filter(Boolean).join(", ");

  if (headText || dates) {
    out.push(
      new Paragraph({
        keepNext: true, // keep entry header with its first bullet
        keepLines: true,
        tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.3) }],
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({ text: headText, bold: true, size: sizeHalfPt, font }),
          new TextRun({ text: `\t${dates}`, size: sizeHalfPt, font }),
        ],
      })
    );
  }

  for (const b of item.bullets.filter((x) => x.text.trim())) {
    out.push(
      new Paragraph({
        bullet: { level: 0 },
        widowControl: true,
        children: [new TextRun({ text: b.text, size: sizeHalfPt, font })],
      })
    );
  }
  return out;
}
