import { useRef } from "react";
import { useResume } from "@/store/resumeStore";
import { ATS_FONTS } from "@/schema/resume";
import { Modal } from "./Modal";
import { IconImage, IconX } from "./Icons";

const ACCENTS = [
  { color: "#1a1a1a", label: "Charcoal"   },
  { color: "#1f3a5f", label: "Navy"        },
  { color: "#0f5132", label: "Forest"      },
  { color: "#5f1f1f", label: "Burgundy"    },
  { color: "#3d2c5f", label: "Plum"        },
  { color: "#5f4b1f", label: "Bronze"      },
];

type Layout = "classic" | "modern" | "compact";

const LAYOUTS: { id: Layout; name: string; desc: string }[] = [
  { id: "classic", name: "Classic",  desc: "Centered header, full-width ruled sections"     },
  { id: "modern",  name: "Modern",   desc: "Accent stripe, bold left-aligned headings"      },
  { id: "compact", name: "Compact",  desc: "Tighter spacing, optimised for 1 page"          },
];

/** Tiny SVG thumbnail representations of each layout. */
function LayoutThumb({ id, accent }: { id: Layout; accent: string }) {
  const c = accent;
  if (id === "classic") return (
    <svg viewBox="0 0 68 88" width="100%" style={{ display:"block" }}>
      <rect width="68" height="88" fill="#fff" />
      <rect x="14" y="6" width="40" height="6" rx="2" fill={c} opacity=".8" />
      <rect x="20" y="14" width="28" height="3" rx="1" fill={c} opacity=".3" />
      <rect x="4" y="22" width="60" height="1.5" fill={c} opacity=".4" />
      {[28,33,38,43,50,55,62].map((y,i) => (
        <rect key={i} x="4" y={y} width={i%3===0?55:42} height="2.5" rx="1" fill="#888" opacity=".18" />
      ))}
      <rect x="4" y="47" width="60" height="1" fill={c} opacity=".3" />
      <rect x="4" y="74" width="60" height="1" fill={c} opacity=".3" />
    </svg>
  );
  if (id === "modern") return (
    <svg viewBox="0 0 68 88" width="100%" style={{ display:"block" }}>
      <rect width="68" height="88" fill="#fff" />
      <rect x="0" y="0" width="4" height="88" fill={c} />
      <rect x="8"  y="8"  width="34" height="6" rx="2" fill={c} opacity=".8" />
      <rect x="8"  y="16" width="24" height="3" rx="1" fill={c} opacity=".3" />
      <rect x="8"  y="28" width="4" height="16" rx="1" fill={c} opacity=".6" />
      <rect x="8"  y="47" width="4" height="12" rx="1" fill={c} opacity=".6" />
      {[30,35,40,50,55,60].map((y,i) => (
        <rect key={i} x="16" y={y} width={i%2===0?46:36} height="2.5" rx="1" fill="#888" opacity=".18" />
      ))}
    </svg>
  );
  // compact
  return (
    <svg viewBox="0 0 68 88" width="100%" style={{ display:"block" }}>
      <rect width="68" height="88" fill="#fff" />
      <rect x="4" y="4" width="36" height="5" rx="1.5" fill={c} opacity=".8" />
      <rect x="4" y="11" width="26" height="2.5" rx="1" fill={c} opacity=".3" />
      <rect x="4" y="18" width="60" height="1" fill={c} opacity=".35" />
      {[22,26,30,34,40,44,48,52,58,62,66,70].map((y,i) => (
        <rect key={i} x="4" y={y} width={i%4===0?56:i%3===0?44:36} height="2" rx="1" fill="#888" opacity=".16" />
      ))}
    </svg>
  );
}

export function DesignDialog({ onClose }: { onClose: () => void }) {
  const theme  = useResume(s => s.doc.theme);
  const header = useResume(s => s.doc.header);
  const mutate = useResume(s => s.mutate);
  const photoRef = useRef<HTMLInputElement>(null);

  const setT = (fn: (t: typeof theme) => void) => mutate(d => fn(d.theme));

  function handlePhoto(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      mutate(d => { d.header.photoDataUrl = url; });
    };
    reader.readAsDataURL(file);
  }

  return (
    <Modal title="Design & Layout" onClose={onClose} maxWidth={500}>
      {/* ---- Layout picker --------------------------------------------- */}
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Layout</label>
        <div className="layout-grid">
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              className={`layout-card ${theme.layout === l.id ? "active" : ""}`}
              onClick={() => setT(t => { t.layout = l.id; })}
              aria-pressed={theme.layout === l.id}
            >
              <div className="lc-thumb">
                <LayoutThumb id={l.id} accent={theme.accentColor} />
              </div>
              <div className="lc-name">{l.name}</div>
              <div className="lc-desc">{l.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Profile photo --------------------------------------------- */}
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Profile photo (optional)</label>
        <div
          className="photo-upload-wrap"
          onClick={() => photoRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === "Enter" && photoRef.current?.click()}
        >
          {header.photoDataUrl ? (
            <>
              <img className="photo-preview-thumb" src={header.photoDataUrl} alt="Profile" />
              <span className="photo-upload-hint">Click to change</span>
            </>
          ) : (
            <>
              <IconImage size={28} />
              <span className="photo-upload-hint">Click to upload a photo (JPG, PNG, WebP)</span>
            </>
          )}
        </div>
        {header.photoDataUrl && (
          <button
            className="btn sm danger"
            style={{ marginTop: 6, alignSelf: "flex-start" }}
            onClick={() => mutate(d => { d.header.photoDataUrl = null; })}
          >
            <IconX size={13} /> Remove photo
          </button>
        )}
        <div className="ats-photo-warn">
          ⚠ Many ATS parsers ignore or misread images — only add a photo if the
          role / region expects it (e.g. some EU/Asian markets).
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }}
        />
      </div>

      {/* ---- Font & size ----------------------------------------------- */}
      <div className="field">
        <label>Font</label>
        <select
          value={theme.fontFamily}
          onChange={e => setT(t => { t.fontFamily = e.target.value as typeof theme.fontFamily; })}
        >
          {ATS_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="row">
        <Range label={`Size — ${theme.baseSizePt}pt`} min={9} max={12} step={0.5}
          value={theme.baseSizePt} onChange={v => setT(t => { t.baseSizePt = v; })} />
        <Range label={`Line height — ${theme.lineHeight}`} min={1} max={1.5} step={0.05}
          value={theme.lineHeight} onChange={v => setT(t => { t.lineHeight = v; })} />
      </div>

      <div className="row">
        <Range label={`Section gap — ${theme.sectionGapPt}pt`} min={4} max={16} step={1}
          value={theme.sectionGapPt} onChange={v => setT(t => { t.sectionGapPt = v; })} />
        <div className="field">
          <label>Page size</label>
          <select value={theme.pageSize}
            onChange={e => setT(t => { t.pageSize = e.target.value as "Letter"|"A4"; })}>
            <option value="Letter">Letter (US)</option>
            <option value="A4">A4</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Margins — {theme.margins.top.toFixed(2)}" all sides</label>
        <input type="range" min={0.4} max={1} step={0.05} value={theme.margins.top}
          onChange={e => {
            const v = Number(e.target.value);
            setT(t => { t.margins = { top:v, right:v, bottom:v, left:v }; });
          }} />
      </div>

      {/* ---- Accent ---------------------------------------------------- */}
      <div className="field">
        <label>Accent color</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {ACCENTS.map(({ color, label }) => (
            <button
              key={color}
              aria-label={label}
              title={label}
              onClick={() => setT(t => { t.accentColor = color; })}
              style={{
                width:32, height:32, borderRadius:8, background:color, cursor:"pointer",
                border: theme.accentColor === color
                  ? "3px solid var(--accent)"
                  : "2px solid transparent",
                boxShadow: theme.accentColor === color ? "0 0 0 2px #fff inset" : undefined,
                transition:"transform .12s",
              }}
            />
          ))}
        </div>
      </div>

      <p className="muted" style={{ marginTop:14 }}>
        Only ATS-safe options are offered — curated fonts, bounded sizes and margins,
        dark high-contrast accents.
      </p>
    </Modal>
  );
}

function Range({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}
