import type { CSSProperties } from "react";
import type { ResumeDocument, Section, Item } from "@/schema/resume";
import { fontStack } from "@/theme/fonts";

/**
 * Renders the canonical document to clean, semantic, ATS-safe HTML.
 * No tables, no text boxes, no columns, no images — headings are real <h2>,
 * lists are real <ul>. This same DOM is what gets printed to PDF, so the
 * preview the user approves IS the PDF (perfect preview<->PDF parity).
 */
export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const { theme, header } = doc;
  const paperStyle: CSSProperties = {
    width: theme.pageSize === "A4" ? "210mm" : "8.5in",
    fontFamily: fontStack(theme.fontFamily),
    fontSize: `${theme.baseSizePt}pt`,
    lineHeight: theme.lineHeight,
    paddingTop: `${theme.margins.top}in`,
    paddingRight: `${theme.margins.right}in`,
    paddingBottom: `${theme.margins.bottom}in`,
    paddingLeft: `${theme.margins.left}in`,
    color: "#1a1a1a", // body text stays near-black for readability/ATS
    // @ts-expect-error custom props consumed by styles.css
    "--sec-gap": `${theme.sectionGapPt}pt`,
    "--resume-accent": theme.accentColor,
  };

  const visibleContacts = header.contacts.filter((c) => c.visible && c.value.trim());

  return (
    <div className="paper" style={paperStyle} id="resume-paper">
      <header>
        <h1 className="resume-name">{header.name || "Your Name"}</h1>
        {header.headline && <p className="resume-headline">{header.headline}</p>}
        {visibleContacts.length > 0 && (
          <div className="resume-contacts">
            {visibleContacts
              .map((c) => (c.label ? `${c.label}: ${c.value}` : c.value))
              .join("  •  ")}
          </div>
        )}
      </header>

      {doc.sections
        .filter((s) => s.visible)
        .map((s) => (
          <SectionView key={s.id} section={s} doc={doc} />
        ))}
    </div>
  );
}

function SectionView({ section, doc }: { section: Section; doc: ResumeDocument }) {
  return (
    <section className="resume-section">
      <h2>{section.title}</h2>
      {section.items.map((item) => (
        <ItemView key={item.id} item={item} section={section} doc={doc} />
      ))}
    </section>
  );
}

function ItemView({
  item,
  section,
  doc,
}: {
  item: Item;
  section: Section;
  doc: ResumeDocument;
}) {
  const f = item.fields;

  // Custom sections render through their itemTemplate -> one plain ATS-safe line.
  if (section.type === "custom" && section.customKey) {
    const schema = doc.customSchemas[section.customKey];
    const line = schema
      ? schema.itemTemplate.replace(/\{(\w+)\}/g, (_, k) => f[k] ?? "")
      : Object.values(f).join(" ");
    if (!line.trim()) return null;
    return <p className="resume-item">{line}</p>;
  }

  if (section.type === "summary" || section.type === "skills") {
    if (!f.text?.trim()) return null;
    return <p className="resume-item">{f.text}</p>;
  }

  // experience / education / projects / certifications
  const title = f.role || f.degree || f.title || "";
  const org = f.org || "";
  const dates = [f.start, f.end].filter(Boolean).join(" – ");
  const hasHead = title || org || dates;

  if (!hasHead && item.bullets.every((b) => !b.text.trim())) return null;

  return (
    <div className="resume-item">
      {hasHead && (
        <div className="it-head">
          <span>
            {title}
            {org && <>{title ? ", " : ""}{org}</>}
          </span>
          <span>{dates}</span>
        </div>
      )}
      {f.location && <div style={{ fontStyle: "italic", fontSize: "9.5pt" }}>{f.location}</div>}
      {item.bullets.some((b) => b.text.trim()) && (
        <ul>
          {item.bullets
            .filter((b) => b.text.trim())
            .map((b) => (
              <li key={b.id}>{b.text}</li>
            ))}
        </ul>
      )}
    </div>
  );
}
