import { useState } from "react";
import { nanoid } from "nanoid";
import { useResume } from "@/store/resumeStore";
import type { Section, Item } from "@/schema/resume";
import { analyzeBullet } from "@/assist/verbs";
import { improveBullet, generateSummary } from "@/ai/capabilities";

export function FormPane() {
  const doc = useResume((s) => s.doc);
  const mutate = useResume((s) => s.mutate);
  const addSection = useResume((s) => s.addSection);
  const removeSection = useResume((s) => s.removeSection);
  const toggleVisible = useResume((s) => s.toggleSectionVisible);
  const reorder = useResume((s) => s.reorderSection);

  return (
    <div>
      {/* Header / contact */}
      <div className="card">
        <div className="card-head">
          <span className="title">Header</span>
        </div>
        <div className="card-body">
          <div className="field">
            <label>Full name</label>
            <input
              value={doc.header.name}
              onChange={(e) => mutate((d) => (d.header.name = e.target.value))}
            />
          </div>
          <div className="field">
            <label>Headline</label>
            <input
              value={doc.header.headline}
              onChange={(e) => mutate((d) => (d.header.headline = e.target.value))}
            />
          </div>
          {doc.header.contacts.map((c, i) => (
            <div className="field" key={c.id}>
              <label>{c.label || c.type}</label>
              <input
                value={c.value}
                onChange={(e) => mutate((d) => (d.header.contacts[i].value = e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {doc.sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          onToggle={() => toggleVisible(section.id)}
          onRemove={() => removeSection(section.id)}
          onUp={() => reorder(section.id, -1)}
          onDown={() => reorder(section.id, 1)}
        />
      ))}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => addSection("experience", "Experience")}>+ Experience</button>
        <button className="btn" onClick={() => addSection("projects", "Projects")}>+ Projects</button>
        <button className="btn" onClick={() => addSection("certifications", "Certifications")}>+ Certifications</button>
        <button className="btn" onClick={() => addCustom(addSection, mutate)}>+ Custom section</button>
      </div>
    </div>
  );
}

/** Scenario B: create a custom section + its field schema + ATS-safe template. */
function addCustom(
  addSection: (t: any, title: string) => void,
  mutate: (fn: any) => void
) {
  const name = prompt("Custom section name (e.g. Publications)");
  if (!name) return;
  const key = name.toLowerCase().replace(/\s+/g, "_");
  addSection("custom", name);
  mutate((d: any) => {
    const sec = d.sections[d.sections.length - 1];
    sec.customKey = key;
    d.customSchemas[key] = {
      fields: [
        { key: "authors", label: "Authors", type: "text" },
        { key: "year", label: "Year", type: "year" },
        { key: "title", label: "Title", type: "text" },
        { key: "venue", label: "Venue", type: "text" },
      ],
      itemTemplate: "{authors} ({year}). {title}. {venue}.",
    };
  });
}

function SectionCard({
  section,
  onToggle,
  onRemove,
  onUp,
  onDown,
}: {
  section: Section;
  onToggle: () => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const mutate = useResume((s) => s.mutate);
  const addItem = useResume((s) => s.addItem);
  const removeItem = useResume((s) => s.removeItem);

  const setTitle = (v: string) =>
    mutate((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      if (s) s.title = v;
    });

  return (
    <div className="card" style={{ opacity: section.visible ? 1 : 0.55 }}>
      <div className="card-head">
        <input className="title" value={section.title} onChange={(e) => setTitle(e.target.value)} />
        <button className="icon-btn" title="Move up" onClick={onUp}>↑</button>
        <button className="icon-btn" title="Move down" onClick={onDown}>↓</button>
        <button className="icon-btn" title="Show/hide" onClick={onToggle}>
          {section.visible ? "👁" : "🚫"}
        </button>
        {!section.locked && (
          <button className="icon-btn" title="Delete" onClick={onRemove}>🗑</button>
        )}
      </div>
      <div className="card-body">
        {section.items.map((item) => (
          <ItemEditor
            key={item.id}
            section={section}
            item={item}
            onRemove={() => removeItem(section.id, item.id)}
          />
        ))}
        <button className="btn" onClick={() => addItem(section.id)}>+ Add entry</button>
      </div>
    </div>
  );
}

function ItemEditor({
  section,
  item,
  onRemove,
}: {
  section: Section;
  item: Item;
  onRemove: () => void;
}) {
  const mutate = useResume((s) => s.mutate);

  const setField = (key: string, v: string) =>
    mutate((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      const it = s?.items.find((x) => x.id === item.id);
      if (it) it.fields[key] = v;
    });

  const setBullet = (bid: string, v: string) =>
    mutate((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      const it = s?.items.find((x) => x.id === item.id);
      const b = it?.bullets.find((x) => x.id === bid);
      if (b) b.text = v;
    });

  const addBullet = () =>
    mutate((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      const it = s?.items.find((x) => x.id === item.id);
      it?.bullets.push({ id: nanoid(), text: "", tailoredFromJD: null });
    });

  // simple text sections
  if (section.type === "summary" || section.type === "skills") {
    return (
      <TextSection
        isSummary={section.type === "summary"}
        value={item.fields.text ?? ""}
        onChange={(v) => setField("text", v)}
      />
    );
  }

  // custom section: render its declared fields
  const doc = useResume((s) => s.doc);
  if (section.type === "custom" && section.customKey) {
    const schema = doc.customSchemas[section.customKey];
    return (
      <div className="item">
        {schema?.fields.map((fld) => (
          <div className="field" key={fld.key}>
            <label>{fld.label}</label>
            <input value={item.fields[fld.key] ?? ""} onChange={(e) => setField(fld.key, e.target.value)} />
          </div>
        ))}
        <button className="icon-btn" onClick={onRemove}>Remove entry</button>
      </div>
    );
  }

  // experience / education / projects / certifications
  const isEdu = section.type === "education";
  return (
    <div className="item">
      <div className="row">
        <div className="field">
          <label>{isEdu ? "Degree" : "Role / Title"}</label>
          <input
            value={item.fields[isEdu ? "degree" : "role"] ?? ""}
            onChange={(e) => setField(isEdu ? "degree" : "role", e.target.value)}
          />
        </div>
        <div className="field">
          <label>{isEdu ? "School" : "Company"}</label>
          <input value={item.fields.org ?? ""} onChange={(e) => setField("org", e.target.value)} />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Start</label>
          <input placeholder="2021-03" value={item.fields.start ?? ""} onChange={(e) => setField("start", e.target.value)} />
        </div>
        <div className="field">
          <label>End</label>
          <input placeholder="present" value={item.fields.end ?? ""} onChange={(e) => setField("end", e.target.value)} />
        </div>
      </div>
      {item.bullets.map((b) => (
        <BulletRow key={b.id} text={b.text} onChange={(v) => setBullet(b.id, v)} />
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={addBullet}>+ Bullet</button>
        <button className="icon-btn" onClick={onRemove}>Remove entry</button>
      </div>
    </div>
  );
}

/** Summary / skills free-text, with a Generate button for the summary. */
function TextSection({
  isSummary,
  value,
  onChange,
}: {
  isSummary: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const doc = useResume((s) => s.doc);

  async function generate() {
    setBusy(true);
    try {
      const r = await generateSummary(doc);
      onChange(r.text);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Generate failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <textarea
        rows={3}
        placeholder={isSummary ? "2–3 line summary…" : "JavaScript, React, Node.js, …"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {isSummary && (
        <div className="bullet-foot">
          <span className="bullet-tips">{value.trim() ? "" : "Tip: draft from your experience & skills."}</span>
          <button className="link-btn" onClick={generate} disabled={busy}>
            {busy ? "…" : "✨ Generate summary"}
          </button>
        </div>
      )}
    </div>
  );
}

/** A bullet textarea with live no-LLM quality hints + an Improve action. */
function BulletRow({ text, onChange }: { text: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const hint = analyzeBullet(text);

  async function improve() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const result = await improveBullet(text);
      onChange(result.text);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Improve failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <textarea
        rows={2}
        placeholder="Accomplishment… (start with a verb, add a number)"
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="bullet-foot">
        <div className="bullet-tags">
          {text.trim() && (
            <>
              <span className={`tag ${hint.startsWithVerb ? "tag-ok" : "tag-warn"}`}>
                {hint.startsWithVerb ? "✓ action verb" : "weak opener"}
              </span>
              <span className={`tag ${hint.hasMetric ? "tag-ok" : "tag-warn"}`}>
                {hint.hasMetric ? "✓ quantified" : "no metric"}
              </span>
            </>
          )}
        </div>
        <button className="link-btn" onClick={improve} disabled={busy || !text.trim()}>
          {busy ? "…" : "✨ Improve"}
        </button>
      </div>
      {hint.tips.length > 0 && text.trim() && (
        <div className="bullet-tips">{hint.tips[0]}</div>
      )}
    </div>
  );
}
