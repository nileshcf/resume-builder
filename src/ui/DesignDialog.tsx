import { useRef } from "react";
import { useResume } from "@/store/resumeStore";
import { ATS_FONTS } from "@/schema/resume";
import { Modal } from "./Modal";
import { IconImage, IconX, IconCheck } from "./Icons";

const ACCENTS = [
  { color: "#1a1a1a", label: "Charcoal" },
  { color: "#1f3a5f", label: "Navy"     },
  { color: "#0f5132", label: "Forest"   },
  { color: "#5f1f1f", label: "Burgundy" },
  { color: "#3d2c5f", label: "Plum"     },
  { color: "#5f4b1f", label: "Bronze"   },
];

type Layout = "classic" | "modern" | "compact";

/**
 * Which layouts allow a profile photo.
 * Compact is excluded — it's optimised for 1-page density; a photo wastes
 * precious space and adds a guaranteed ATS warning with no layout benefit.
 */
const PHOTO_SUPPORTED: Layout[] = ["classic", "modern"];

const LAYOUTS: {
  id: Layout;
  name: string;
  desc: string;
  atsNote: string;
  supportsPhoto: boolean;
}[] = [
  {
    id: "classic",
    name: "Classic",
    desc: "Centred header, full-width ruled sections",
    atsNote: "Best ATS compatibility",
    supportsPhoto: true,
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Accent stripe, bar-style section headings",
    atsNote: "ATS-safe — semantic HTML only",
    supportsPhoto: true,
  },
  {
    id: "compact",
    name: "Compact",
    desc: "Tighter spacing, optimised for 1 page",
    atsNote: "No photo — maximises content space",
    supportsPhoto: false,
  },
];

// ---- Thumbnails with accurate photo placement ----------------------------

/**
 * Each thumbnail shows the real header structure for the layout:
 * where the photo circle will appear relative to the name/headline block.
 * When `withPhoto` is false the photo placeholder is omitted.
 */
function LayoutThumb({
  id,
  accent,
  withPhoto,
}: {
  id: Layout;
  accent: string;
  withPhoto: boolean;
}) {
  const c = accent;

  if (id === "classic") {
    // Photo: top-right, circular. Name block: left of header.
    return (
      <svg viewBox="0 0 68 88" width="100%" style={{ display: "block" }}>
        <rect width="68" height="88" fill="#fff" rx="2" />

        {/* Header row */}
        {withPhoto ? (
          <>
            {/* Name + headline on the left */}
            <rect x="4" y="5"  width="38" height="6" rx="2" fill={c} opacity=".85" />
            <rect x="4" y="13" width="26" height="2.5" rx="1" fill={c} opacity=".3" />
            <rect x="4" y="17" width="32" height="2" rx="1" fill="#999" opacity=".2" />
            {/* Photo circle — top right */}
            <circle cx="56" cy="13" r="8" fill="#e5e7eb" />
            <circle cx="56" cy="13" r="8" fill="none" stroke={c} strokeWidth="1" opacity=".4" />
            {/* tiny head silhouette hint */}
            <circle cx="56" cy="11" r="2.5" fill={c} opacity=".25" />
            <ellipse cx="56" cy="17" rx="4" ry="2.5" fill={c} opacity=".15" />
          </>
        ) : (
          <>
            <rect x="14" y="5"  width="40" height="6" rx="2" fill={c} opacity=".85" />
            <rect x="20" y="13" width="28" height="2.5" rx="1" fill={c} opacity=".3" />
            <rect x="10" y="17" width="48" height="2" rx="1" fill="#999" opacity=".2" />
          </>
        )}

        {/* Divider */}
        <rect x="4" y="22" width="60" height="1" fill={c} opacity=".35" />

        {/* Content lines — 2 section groups */}
        <rect x="4" y="26" width="30" height="2" rx="1" fill={c} opacity=".5" />
        {[30,34,38,42].map((y, i) => (
          <rect key={i} x="4" y={y} width={i % 2 === 0 ? 55 : 42} height="2" rx="1" fill="#888" opacity=".15" />
        ))}

        <rect x="4" y="47" width="60" height="1" fill={c} opacity=".25" />
        <rect x="4" y="51" width="30" height="2" rx="1" fill={c} opacity=".5" />
        {[55,59,63,67].map((y, i) => (
          <rect key={i} x="4" y={y} width={i % 2 === 0 ? 50 : 38} height="2" rx="1" fill="#888" opacity=".15" />
        ))}

        <rect x="4" y="72" width="60" height="1" fill={c} opacity=".25" />
        {[76,80].map((y, i) => (
          <rect key={i} x="4" y={y} width={i === 0 ? 45 : 30} height="2" rx="1" fill="#888" opacity=".15" />
        ))}
      </svg>
    );
  }

  if (id === "modern") {
    // Accent stripe left edge. Photo: small square beside name (left of header).
    return (
      <svg viewBox="0 0 68 88" width="100%" style={{ display: "block" }}>
        <rect width="68" height="88" fill="#fff" rx="2" />
        {/* Accent stripe */}
        <rect x="0" y="0" width="4" height="88" rx="1" fill={c} />

        {/* Header */}
        {withPhoto ? (
          <>
            {/* Photo — small rounded square beside name */}
            <rect x="8" y="6" width="14" height="14" rx="3" fill="#e5e7eb" />
            <rect x="8" y="6" width="14" height="14" rx="3" fill="none" stroke={c} strokeWidth="1" opacity=".4" />
            <circle cx="15" cy="11" r="3" fill={c} opacity=".2" />
            <ellipse cx="15" cy="17" rx="5" ry="2" fill={c} opacity=".12" />
            {/* Name + headline right of photo */}
            <rect x="25" y="7"  width="34" height="5" rx="1.5" fill={c} opacity=".85" />
            <rect x="25" y="14" width="24" height="2.5" rx="1" fill={c} opacity=".3" />
          </>
        ) : (
          <>
            <rect x="8"  y="7"  width="38" height="5" rx="1.5" fill={c} opacity=".85" />
            <rect x="8"  y="14" width="26" height="2.5" rx="1" fill={c} opacity=".3" />
          </>
        )}

        {/* Divider under header */}
        <rect x="8" y="23" width="56" height="1" fill={c} opacity=".2" />

        {/* Section 1 — bar heading */}
        <rect x="8" y="27" width="3" height="10" rx="1" fill={c} opacity=".7" />
        {[28,32,36].map((y, i) => (
          <rect key={i} x="14" y={y} width={i === 0 ? 46 : 36} height="2.5" rx="1" fill="#888" opacity=".18" />
        ))}

        {/* Section 2 */}
        <rect x="8" y="44" width="3" height="10" rx="1" fill={c} opacity=".7" />
        {[45,49,53].map((y, i) => (
          <rect key={i} x="14" y={y} width={i === 1 ? 40 : 48} height="2.5" rx="1" fill="#888" opacity=".18" />
        ))}

        {/* Section 3 */}
        <rect x="8" y="61" width="3" height="10" rx="1" fill={c} opacity=".7" />
        {[62,66,70].map((y, i) => (
          <rect key={i} x="14" y={y} width={i === 0 ? 42 : 32} height="2.5" rx="1" fill="#888" opacity=".18" />
        ))}
      </svg>
    );
  }

  // compact — no photo ever
  return (
    <svg viewBox="0 0 68 88" width="100%" style={{ display: "block" }}>
      <rect width="68" height="88" fill="#fff" rx="2" />

      {/* Compact header — name small, all left-aligned */}
      <rect x="4" y="4"  width="32" height="4.5" rx="1.5" fill={c} opacity=".85" />
      <rect x="4" y="10" width="22" height="2"   rx="1"   fill={c} opacity=".3" />
      <rect x="4" y="14" width="60" height="1"   fill={c} opacity=".3" />

      {/* Tight content — more lines in same space */}
      {[18,21,24,27,30,34,37,40,43,47,50,53,56,60,63,66,70,73,76,80].map((y, i) => (
        <rect key={i} x="4" y={y} width={i%5===0?32:i%3===0?52:i%2===0?44:36} height="2" rx="1" fill="#888" opacity=".14" />
      ))}
      {/* Section dividers */}
      {[33,46,59,72].map(y => (
        <rect key={y} x="4" y={y} width="60" height=".8" fill={c} opacity=".2" />
      ))}
    </svg>
  );
}

// ---- Main component -------------------------------------------------------

export function DesignDialog({ onClose }: { onClose: () => void }) {
  const theme  = useResume(s => s.doc.theme);
  const header = useResume(s => s.doc.header);
  const mutate = useResume(s => s.mutate);
  const photoRef = useRef<HTMLInputElement>(null);

  const currentLayout = (theme.layout ?? "classic") as Layout;
  const layoutSupportsPhoto = PHOTO_SUPPORTED.includes(currentLayout);

  const setT = (fn: (t: typeof theme) => void) => mutate(d => fn(d.theme));

  function switchLayout(id: Layout) {
    setT(t => { t.layout = id; });
    // Auto-clear photo if switching to a layout that doesn't support it
    if (!PHOTO_SUPPORTED.includes(id) && header.photoDataUrl) {
      mutate(d => { d.header.photoDataUrl = null; });
    }
  }

  function handlePhoto(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      mutate(d => { d.header.photoDataUrl = e.target?.result as string; });
    };
    reader.readAsDataURL(file);
  }

  return (
    <Modal title="Design & Layout" onClose={onClose} maxWidth={520}>

      {/* ---- Layout picker -------------------------------------------- */}
      <div className="field" style={{ marginBottom: 18 }}>
        <label>Layout</label>
        <div className="layout-grid">
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              className={`layout-card ${currentLayout === l.id ? "active" : ""}`}
              onClick={() => switchLayout(l.id)}
              aria-pressed={currentLayout === l.id}
            >
              {/* Thumbnail — shows photo placement when a photo is set */}
              <div className="lc-thumb">
                <LayoutThumb
                  id={l.id}
                  accent={theme.accentColor}
                  withPhoto={l.supportsPhoto && !!header.photoDataUrl}
                />
              </div>

              <div className="lc-name">{l.name}</div>
              <div className="lc-desc">{l.desc}</div>

              {/* ATS badge */}
              <div className={`lc-ats-badge ${l.supportsPhoto ? "lc-ats-photo" : "lc-ats-clean"}`}>
                {l.supportsPhoto ? "📷 Photo optional" : "✦ No photo"}
              </div>

              <div className="lc-ats-note">
                <IconCheck size={10} />
                {l.atsNote}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Profile photo (only shown for layouts that support it) ------- */}
      {layoutSupportsPhoto && (
        <div className="field photo-section" style={{ marginBottom: 18 }}>
          <label>
            Profile photo
            <span className="field-label-sub"> — optional, {currentLayout === "classic" ? "top-right of header" : "beside your name"}</span>
          </label>

          <div
            className="photo-upload-wrap"
            onClick={() => photoRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && photoRef.current?.click()}
          >
            {header.photoDataUrl ? (
              <>
                <img
                  className="photo-preview-thumb"
                  src={header.photoDataUrl}
                  alt="Profile preview"
                />
                <span className="photo-upload-hint">Click to change photo</span>
              </>
            ) : (
              <>
                <IconImage size={26} />
                <span className="photo-upload-hint">Click to upload — JPG, PNG, or WebP</span>
              </>
            )}
          </div>

          {header.photoDataUrl && (
            <button
              className="btn sm danger"
              style={{ marginTop: 6, alignSelf: "flex-start" }}
              onClick={() => mutate(d => { d.header.photoDataUrl = null; })}
            >
              <IconX size={12} /> Remove photo
            </button>
          )}

          <div className="ats-photo-warn">
            ⚠ Most ATS parsers (Taleo, Workday, Greenhouse) ignore or misread photos —
            adding one will lower your ATS score. Only use if the role or region expects it
            (common in some EU, Middle East and Asian markets).
          </div>

          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }}
          />
        </div>
      )}

      {/* Note for compact — explain why photo is absent */}
      {!layoutSupportsPhoto && (
        <div className="compact-no-photo-note">
          <IconCheck size={13} />
          Compact layout has no photo option — this maximises content space and
          gives the best possible ATS score.
        </div>
      )}

      {/* ---- Font & size ------------------------------------------------ */}
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
            onChange={e => setT(t => { t.pageSize = e.target.value as "Letter" | "A4"; })}>
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
            setT(t => { t.margins = { top: v, right: v, bottom: v, left: v }; });
          }} />
      </div>

      {/* ---- Accent colour ---------------------------------------------- */}
      <div className="field">
        <label>Accent colour</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ACCENTS.map(({ color, label }) => (
            <button key={color} aria-label={label} title={label}
              onClick={() => setT(t => { t.accentColor = color; })}
              style={{
                width: 32, height: 32, borderRadius: 8, background: color, cursor: "pointer",
                border: theme.accentColor === color ? "3px solid var(--accent)" : "2px solid transparent",
                boxShadow: theme.accentColor === color ? "0 0 0 2px #fff inset" : undefined,
                transition: "transform .12s",
              }}
            />
          ))}
        </div>
      </div>

      <p className="muted" style={{ marginTop: 14, lineHeight: 1.5 }}>
        Only ATS-safe options are offered — curated fonts, bounded sizes and margins,
        dark high-contrast accents. Structural ATS-safety (semantic headings, no tables or
        columns) is guaranteed regardless of which layout you choose.
      </p>
    </Modal>
  );
}

function Range({
  label, value, min, max, step, onChange,
}: {
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
