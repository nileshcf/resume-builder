import { useState } from "react";
import { nanoid } from "nanoid";
import { useResume } from "@/store/resumeStore";
import type { Section, Item } from "@/schema/resume";
import { analyzeBullet } from "@/assist/verbs";
import { improveBullet, generateSummary } from "@/ai/capabilities";
import {
  IconChevronUp, IconChevronDown, IconEye, IconEyeOff,
  IconTrash, IconPlus, IconZap, IconCheck,
} from "@/ui/Icons";
import { InlineEdit } from "@/preview/InlineEdit";

export function FormPane() {
  const doc        = useResume(s => s.doc);
  const mutate     = useResume(s => s.mutate);
  const addSection = useResume(s => s.addSection);
  const removeSection   = useResume(s => s.removeSection);
  const toggleVisible   = useResume(s => s.toggleSectionVisible);
  const reorder         = useResume(s => s.reorderSection);

  return (
    <div>
      {/* Header / contact */}
      <div className="card">
        <div className="card-head">
          <span style={{ fontWeight:600, fontSize:13, flex:1 }}>Header</span>
        </div>
        <div className="card-body">
          <div className="field">
            <label>Full name</label>
            <input value={doc.header.name}
              onChange={e => mutate(d => { d.header.name = e.target.value; })} />
          </div>
          <div className="field">
            <label>Headline / Title</label>
            <input value={doc.header.headline}
              onChange={e => mutate(d => { d.header.headline = e.target.value; })} />
          </div>
          {doc.header.contacts.map((c, i) => (
            <div className="field" key={c.id}>
              <label>{c.label || c.type}</label>
              <input value={c.value}
                onChange={e => mutate(d => { d.header.contacts[i].value = e.target.value; })} />
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic sections */}
      {doc.sections.map(section => (
        <SectionCard
          key={section.id}
          section={section}
          onToggle={() => toggleVisible(section.id)}
          onRemove={() => removeSection(section.id)}
          onUp={()    => reorder(section.id, -1)}
          onDown={()  => reorder(section.id,  1)}
        />
      ))}

      {/* Add section buttons */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingTop:4 }}>
        {[
          ["experience",    "Experience"],
          ["projects",      "Projects"],
          ["certifications","Certifications"],
        ].map(([type, label]) => (
          <button key={type} className="btn sm"
            onClick={() => addSection(type as any, label)}>
            <IconPlus size={13} />{label}
          </button>
        ))}
        <button className="btn sm" onClick={() => addCustom(addSection, mutate)}>
          <IconPlus size={13} />Custom section
        </button>
      </div>
    </div>
  );
}

function addCustom(addSection: (t: any, title: string) => void, mutate: (fn: any) => void) {
  const name = prompt("Custom section name (e.g. Publications)");
  if (!name) return;
  const key = name.toLowerCase().replace(/\s+/g, "_");
  addSection("custom", name);
  mutate((d: any) => {
    const sec = d.sections[d.sections.length - 1];
    sec.customKey = key;
    d.customSchemas[key] = {
      fields: [
        { key:"authors", label:"Authors", type:"text" },
        { key:"year",    label:"Year",    type:"year" },
        { key:"title",   label:"Title",   type:"text" },
        { key:"venue",   label:"Venue",   type:"text" },
      ],
      itemTemplate: "{authors} ({year}). {title}. {venue}.",
    };
  });
}

function SectionCard({ section, onToggle, onRemove, onUp, onDown }: {
  section: Section; onToggle:()=>void; onRemove:()=>void; onUp:()=>void; onDown:()=>void;
}) {
  const mutate    = useResume(s => s.mutate);
  const addItem   = useResume(s => s.addItem);
  const removeItem= useResume(s => s.removeItem);

  const setTitle = (v: string) => mutate(d => {
    const s = d.sections.find(x => x.id === section.id);
    if (s) s.title = v;
  });

  return (
    <div className="card" style={{ opacity: section.visible ? 1 : 0.6 }}>
      <div className="card-head">
        <input className="title" value={section.title} onChange={e => setTitle(e.target.value)} />
        <button className="icon-btn" title="Move up"    aria-label="Move section up"   onClick={onUp}>
          <IconChevronUp size={15} />
        </button>
        <button className="icon-btn" title="Move down"  aria-label="Move section down" onClick={onDown}>
          <IconChevronDown size={15} />
        </button>
        <button className="icon-btn" title={section.visible ? "Hide" : "Show"}
          aria-label={section.visible ? "Hide section" : "Show section"} onClick={onToggle}>
          {section.visible ? <IconEye size={15} /> : <IconEyeOff size={15} />}
        </button>
        {!section.locked && (
          <button className="icon-btn" title="Delete section" aria-label="Delete section" onClick={onRemove}>
            <IconTrash size={15} />
          </button>
        )}
      </div>
      <div className="card-body">
        {section.items.map(item => (
          <ItemEditor key={item.id} section={section} item={item}
            onRemove={() => removeItem(section.id, item.id)} />
        ))}
        <button className="btn sm" onClick={() => addItem(section.id)}>
          <IconPlus size={13} /> Add entry
        </button>
      </div>
    </div>
  );
}

function ItemEditor({ section, item, onRemove }: {
  section: Section; item: Item; onRemove: () => void;
}) {
  // All hooks MUST be at the top — no conditional hook calls ever.
  const mutate      = useResume(s => s.mutate);
  const doc         = useResume(s => s.doc);
  const customSchema = section.type === "custom" && section.customKey
    ? doc.customSchemas[section.customKey]
    : null;

  const setField = (key: string, v: string) => mutate(d => {
    const s  = d.sections.find(x => x.id === section.id);
    const it = s?.items.find(x => x.id === item.id);
    if (it) it.fields[key] = v;
  });
  const setBullet = (bid: string, v: string) => mutate(d => {
    const s  = d.sections.find(x => x.id === section.id);
    const it = s?.items.find(x => x.id === item.id);
    const b  = it?.bullets.find(x => x.id === bid);
    if (b) b.text = v;
  });
  const addBullet = () => mutate(d => {
    const s  = d.sections.find(x => x.id === section.id);
    const it = s?.items.find(x => x.id === item.id);
    it?.bullets.push({ id: nanoid(), text:"", tailoredFromJD: null });
  });

  // summary / skills
  if (section.type === "summary" || section.type === "skills") {
    return (
      <TextSection isSummary={section.type === "summary"}
        value={item.fields.text ?? ""} onChange={v => setField("text", v)} />
    );
  }

  // custom
  if (section.type === "custom" && section.customKey) {
    return (
      <div className="item">
        {customSchema?.fields.map(fld => (
          <div className="field" key={fld.key}>
            <label>{fld.label}</label>
            <input value={item.fields[fld.key] ?? ""} onChange={e => setField(fld.key, e.target.value)} />
          </div>
        ))}
        <button className="btn sm danger" style={{ marginTop:6 }} onClick={onRemove}>
          <IconTrash size={13} /> Remove
        </button>
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
          <input value={item.fields[isEdu ? "degree" : "role"] ?? ""}
            onChange={e => setField(isEdu ? "degree" : "role", e.target.value)} />
        </div>
        <div className="field">
          <label>{isEdu ? "School" : "Company"}</label>
          <input value={item.fields.org ?? ""} onChange={e => setField("org", e.target.value)} />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Start</label>
          <input placeholder="2021-03" value={item.fields.start ?? ""}
            onChange={e => setField("start", e.target.value)} />
        </div>
        <div className="field">
          <label>End</label>
          <input placeholder="present" value={item.fields.end ?? ""}
            onChange={e => setField("end", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Location</label>
        <input value={item.fields.location ?? ""} onChange={e => setField("location", e.target.value)} />
      </div>
      {item.bullets.map(b => (
        <BulletRow key={b.id} text={b.text} onChange={v => setBullet(b.id, v)} />
      ))}
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <button className="btn sm" onClick={addBullet}>
          <IconPlus size={13} /> Bullet
        </button>
        <button className="btn sm danger" onClick={onRemove}>
          <IconTrash size={13} /> Remove
        </button>
      </div>
    </div>
  );
}

function TextSection({ isSummary, value, onChange }: {
  isSummary: boolean; value: string; onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const doc = useResume(s => s.doc);
  const plain = value.replace(/<[^>]+>/g, "");

  async function generate() {
    setBusy(true);
    try { const r = await generateSummary(doc); onChange(r.text); }
    catch (e) { alert(e instanceof Error ? e.message : "Generate failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="field">
      <div className="rich-field-hint">Select text for formatting options</div>
      <InlineEdit
        as="div"
        className="rich-field"
        value={value}
        onChange={onChange}
        placeholder={isSummary ? "2–3 line professional summary…" : "JavaScript, React, Node.js, …"}
      />
      {isSummary && (
        <div className="bullet-foot">
          <span className="bullet-tips">
            {plain.trim() ? "" : "Tip: fill experience first, then generate."}
          </span>
          <button className="link-btn" onClick={generate} disabled={busy}>
            <IconZap size={13} />
            {busy ? "Generating…" : "Generate summary"}
          </button>
        </div>
      )}
    </div>
  );
}

function BulletRow({ text, onChange }: { text: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const plain = text.replace(/<[^>]+>/g, "");
  const hint  = analyzeBullet(plain);

  async function improve() {
    if (!plain.trim()) return;
    setBusy(true);
    try { const r = await improveBullet(plain); onChange(r.text); }
    catch (e) { alert(e instanceof Error ? e.message : "Improve failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="field">
      <InlineEdit
        as="div"
        className="rich-field rich-field-sm"
        value={text}
        onChange={onChange}
        singleLine
        placeholder="Accomplishment… start with a verb, add a % or $"
      />
      <div className="bullet-foot">
        <div className="bullet-tags">
          {plain.trim() && (
            <>
              <span className={`tag ${hint.startsWithVerb ? "tag-ok" : "tag-warn"}`}>
                {hint.startsWithVerb ? <><IconCheck size={10} /> verb</> : "weak opener"}
              </span>
              <span className={`tag ${hint.hasMetric ? "tag-ok" : "tag-warn"}`}>
                {hint.hasMetric ? <><IconCheck size={10} /> metric</> : "no metric"}
              </span>
            </>
          )}
        </div>
        <button className="link-btn" onClick={improve} disabled={busy || !plain.trim()}>
          <IconZap size={12} />
          {busy ? "Improving…" : "Improve"}
        </button>
      </div>
      {hint.tips.length > 0 && text.trim() && (
        <div className="bullet-tips">{hint.tips[0]}</div>
      )}
    </div>
  );
}
