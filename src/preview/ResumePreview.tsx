import React, { createContext, useContext, type CSSProperties } from "react";
import type { ResumeDocument, Section, Item } from "@/schema/resume";
import { fontStack } from "@/theme/fonts";
import { useResume } from "@/store/resumeStore";
import { InlineEdit } from "./InlineEdit";
import { formatDate } from "@/assist/docText";

/** Provides the store mutate function to all nested inline editors. */
const MutateCtx = createContext<(fn: (d: ResumeDocument) => void) => void>(() => {});

export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const mutate = useResume(s => s.mutate);
  const { theme, header } = doc;
  const layout = theme.layout ?? "classic";

  const paperStyle: CSSProperties = {
    width:      theme.pageSize === "A4" ? "210mm" : "8.5in",
    fontFamily: fontStack(theme.fontFamily),
    fontSize:   layout === "compact" ? `${Math.max(9, theme.baseSizePt - 0.5)}pt` : `${theme.baseSizePt}pt`,
    lineHeight: layout === "compact" ? Math.max(1, theme.lineHeight - 0.05) : theme.lineHeight,
    paddingTop:    `${theme.margins.top}in`,
    paddingRight:  `${theme.margins.right}in`,
    paddingBottom: `${theme.margins.bottom}in`,
    paddingLeft:   `${theme.margins.left}in`,
    color: "#1a1a1a",
    // @ts-expect-error custom props
    "--sec-gap":      `${layout === "compact" ? Math.max(4, theme.sectionGapPt - 3) : theme.sectionGapPt}pt`,
    "--resume-accent": theme.accentColor,
  };

  const visibleContacts = header.contacts.filter(c => c.visible && c.value.trim());

  return (
    <MutateCtx.Provider value={mutate}>
      <div className={`paper layout-${layout}`} style={paperStyle} id="resume-paper" data-layout={layout}>
        {layout === "modern" && <div className="modern-stripe" aria-hidden="true" />}

        <header className="resume-header">
          {header.photoDataUrl && (
            <img className="resume-photo" src={header.photoDataUrl} alt={header.name || "Profile photo"} />
          )}
          <div className="resume-header-text">
            <InlineEdit
              as="h1"
              className="resume-name"
              value={header.name}
              onChange={html => mutate(d => { d.header.name = html; })}
              placeholder="Your Name"
              singleLine
            />
            <InlineEdit
              as="p"
              className="resume-headline"
              value={header.headline}
              onChange={html => mutate(d => { d.header.headline = html; })}
              placeholder="Job title / headline"
              singleLine
            />
            {visibleContacts.length > 0 && (
              <div className="resume-contacts">
                {visibleContacts.map((c, i) => (
                  <React.Fragment key={c.id}>
                    {i > 0 && <span>  •  </span>}
                    {c.label && <span>{c.label}: </span>}
                    {c.type === "link" && c.value.startsWith("http") ? (
                      <a href={c.value} target="_blank" rel="noopener noreferrer" className="rich-editable">
                        {c.value}
                      </a>
                    ) : (
                      <InlineEdit
                        as="span"
                        value={c.value}
                        onChange={html => {
                          const plain = html.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, m =>
                            ({ "&amp;":"&","&lt;":"<","&gt;":">","&nbsp;":" " }[m] ?? m)
                          );
                          mutate(d => { d.header.contacts[i].value = plain; });
                        }}
                        singleLine
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </header>

        {doc.sections.filter(s => s.visible).map(s => (
          <SectionView key={s.id} section={s} doc={doc} />
        ))}
      </div>
    </MutateCtx.Provider>
  );
}

function SectionView({ section, doc }: { section: Section; doc: ResumeDocument }) {
  const mutate = useContext(MutateCtx);
  return (
    <section className="resume-section">
      <InlineEdit
        as="h2"
        value={section.title}
        onChange={html => mutate(d => {
          const s = d.sections.find(x => x.id === section.id);
          if (s) s.title = html.replace(/<[^>]+>/g, "");
        })}
        singleLine
      />
      {section.items.map(item => (
        <ItemView key={item.id} item={item} section={section} doc={doc} />
      ))}
    </section>
  );
}

function ItemView({ item, section, doc }: { item: Item; section: Section; doc: ResumeDocument }) {
  const mutate = useContext(MutateCtx);
  const f = item.fields;

  const setField = (key: string, html: string) => mutate(d => {
    const s  = d.sections.find(x => x.id === section.id);
    const it = s?.items.find(x => x.id === item.id);
    if (it) it.fields[key] = html;
  });
  const setBullet = (bid: string, html: string) => mutate(d => {
    const s  = d.sections.find(x => x.id === section.id);
    const it = s?.items.find(x => x.id === item.id);
    const b  = it?.bullets.find(x => x.id === bid);
    if (b) b.text = html;
  });

  if (section.type === "custom" && section.customKey) {
    const schema = doc.customSchemas[section.customKey];
    const line   = schema
      ? schema.itemTemplate.replace(/\{(\w+)\}/g, (_, k) => f[k] ?? "")
      : Object.values(f).join(" ");
    if (!line.trim()) return null;
    // Custom-section items are rendered via the itemTemplate for export composition.
    // Editing is done from the left-pane FormPane (not inline in preview) to avoid
    // complexity with template-based rendering and to maintain consistency with how
    // custom schemas are configured.
    return <p className="resume-item" dangerouslySetInnerHTML={{ __html: line }} />;
  }

  if (section.type === "summary" || section.type === "skills") {
    return (
      <InlineEdit
        as="p"
        className="resume-item"
        value={f.text ?? ""}
        onChange={html => setField("text", html)}
        placeholder="Click to add text…"
      />
    );
  }

  const roleKey = section.type === "education" ? "degree" : "role";
  const titleVal = f[roleKey] || f.title || "";
  const org      = f.org || "";
  const dates    = [f.start, f.end].filter(Boolean).map(d => formatDate(d, doc.theme.dateFormat)).join(" – ");
  const hasHead  = titleVal || org || dates;

  if (!hasHead && item.bullets.every(b => !b.text.trim())) return null;

  return (
    <div className="resume-item">
      {hasHead && (
        <div className="it-head">
          <span>
            <InlineEdit
              as="span"
              value={titleVal}
              onChange={html => setField(roleKey, html)}
              placeholder={section.type === "education" ? "Degree" : "Role / Title"}
              singleLine
            />
            {(titleVal || org) && (
              <>
                {titleVal && org && <span style={{ fontWeight: 400 }}>,&nbsp;</span>}
                <InlineEdit
                  as="span"
                  value={org}
                  onChange={html => setField("org", html)}
                  placeholder="Company / School"
                  singleLine
                  className="it-org"
                />
              </>
            )}
          </span>
          <span className="it-dates">{dates}</span>
        </div>
      )}
      {f.location && (
        <div className="it-location">
          <InlineEdit
            as="span"
            value={f.location}
            onChange={html => setField("location", html)}
            singleLine
          />
        </div>
      )}
      {item.bullets.some(b => b.text.trim()) && (
        <ul>
          {item.bullets.filter(b => b.text.trim()).map(b => (
            <li key={b.id}>
              <InlineEdit
                as="span"
                value={b.text}
                onChange={html => setBullet(b.id, html)}
                placeholder="Accomplishment…"
                singleLine
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
