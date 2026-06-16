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
  ExternalHyperlink,
} from "docx";
import { saveAs } from "file-saver";
import type { ResumeDocument, Section, Item } from "@/schema/resume";
import { stripHtml, formatDate } from "@/assist/docText";

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
  const nameRuns = htmlToRuns(header.name || "Your Name", font, 40, true);
  children.push(
    new Paragraph({
      children: nameRuns.map(r => new TextRun({ ...r, color: accent })),
    })
  );
  if (header.headline)
    children.push(new Paragraph({ children: htmlToRuns(header.headline, font, 22) }));

  const contacts = header.contacts
    .filter((c) => c.visible && c.value.trim())
    .map((c) => {
      const value = c.type === "location" ? stripHtml(c.value) : c.value;
      return c.label ? `${c.label}: ${value}` : value;
    })
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

/**
 * Parse simple HTML (b, strong, i, em, a, br) into DOCX TextRun objects so
 * formatting from the inline editor carries through to the exported Word file.
 * Uses the browser DOM for parsing (this code only runs in-browser anyway).
 */
function htmlToRuns(html: string, font: string, size: number, forceBold?: boolean): (TextRun | ExternalHyperlink)[] {
  if (!html?.trim()) return [new TextRun({ text: "", size, font })];
  const div = document.createElement("div");
  div.innerHTML = html;
  const runs: (TextRun | ExternalHyperlink)[] = [];

  function walk(node: Node, bold: boolean, italic: boolean, href?: string) {
    if (node.nodeType === 3) {
      const t = node.textContent ?? "";
      if (t) {
        const run = new TextRun({ text: t, bold: forceBold || bold || undefined, italics: italic || undefined, size, font });
        if (href) {
          runs.push(new ExternalHyperlink({ children: [run], link: href }));
        } else {
          runs.push(run);
        }
      }
      return;
    }
    if (node.nodeType !== 1) return;
    const el  = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") { runs.push(new TextRun({ text: "\n", size, font })); return; }
    const b2 = bold   || tag === "b" || tag === "strong";
    const i2 = italic || tag === "i" || tag === "em";
    const h2 = href || (tag === "a" ? (el as HTMLAnchorElement).href : undefined);
    for (const child of Array.from(node.childNodes)) walk(child, b2, i2, h2);
  }

  walk(div, false, false);
  return runs.length ? runs : [new TextRun({ text: div.textContent ?? "", size, font })];
}

function sectionHeading(title: string, font: string, accent: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true, // never strand a heading at page bottom (Scenario C)
    spacing: { before: 160, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 1 } },
    children: [new TextRun({ text: stripHtml(title).toUpperCase(), bold: true, size: 22, font, color: accent })],
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
      out.push(new Paragraph({ widowControl: true, children: htmlToRuns(f.text, font, sizeHalfPt) }));
    return out;
  }

  const title = f.role || f.degree || f.title || "";
  const org = f.org || "";
  const dates = [f.start, f.end].filter(Boolean).map(d => formatDate(d, doc.theme.dateFormat)).join(" – ");

  if (title || org || dates) {
    const titleRuns = title ? htmlToRuns(title, font, sizeHalfPt, true) : [];
    const orgRuns = org ? htmlToRuns(org, font, sizeHalfPt) : [];
    const separator = title && org ? [new TextRun({ text: ", ", bold: true, size: sizeHalfPt, font })] : [];
    const headRuns = [...titleRuns, ...separator, ...orgRuns];

    out.push(
      new Paragraph({
        keepNext: true, // keep entry header with its first bullet
        keepLines: true,
        tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.3) }],
        alignment: AlignmentType.LEFT,
        children: [
          ...headRuns,
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
        children: htmlToRuns(b.text, font, sizeHalfPt),
      })
    );
  }
  return out;
}
