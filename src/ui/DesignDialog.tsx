import { useResume } from "@/store/resumeStore";
import { ATS_FONTS } from "@/schema/resume";
import { Modal } from "./Modal";

// Curated, ATS-safe accent palette — all dark/high-contrast so text stays
// machine-readable. No light or low-contrast options by design.
const ACCENTS = ["#1a1a1a", "#1f3a5f", "#0f5132", "#5f1f1f", "#3d2c5f", "#5f4b1f"];

export function DesignDialog({ onClose }: { onClose: () => void }) {
  const theme = useResume((s) => s.doc.theme);
  const mutate = useResume((s) => s.mutate);

  const setT = (fn: (t: typeof theme) => void) => mutate((d) => fn(d.theme));

  return (
    <Modal title="Design (ATS-safe)" onClose={onClose} maxWidth={460}>
      <p className="muted">
        Only ATS-friendly choices are offered — curated fonts, bounded sizes and
        margins, dark accents. You can’t pick anything that breaks machine parsing.
      </p>

      <div className="field">
        <label>Font</label>
        <select value={theme.fontFamily} onChange={(e) => setT((t) => (t.fontFamily = e.target.value as typeof theme.fontFamily))}>
          {ATS_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="row">
        <Range label={`Font size — ${theme.baseSizePt}pt`} min={9} max={12} step={0.5}
          value={theme.baseSizePt} onChange={(v) => setT((t) => (t.baseSizePt = v))} />
        <Range label={`Line height — ${theme.lineHeight}`} min={1} max={1.5} step={0.05}
          value={theme.lineHeight} onChange={(v) => setT((t) => (t.lineHeight = v))} />
      </div>

      <div className="row">
        <Range label={`Section gap — ${theme.sectionGapPt}pt`} min={4} max={16} step={1}
          value={theme.sectionGapPt} onChange={(v) => setT((t) => (t.sectionGapPt = v))} />
        <div className="field">
          <label>Page size</label>
          <select value={theme.pageSize} onChange={(e) => setT((t) => (t.pageSize = e.target.value as "Letter" | "A4"))}>
            <option value="Letter">Letter (US)</option>
            <option value="A4">A4</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Margins (inches): {theme.margins.top.toFixed(2)} all sides</label>
        <input type="range" min={0.4} max={1} step={0.05} value={theme.margins.top}
          onChange={(e) => {
            const v = Number(e.target.value);
            setT((t) => { t.margins = { top: v, right: v, bottom: v, left: v }; });
          }} />
      </div>

      <div className="field">
        <label>Accent color</label>
        <div style={{ display: "flex", gap: 8 }}>
          {ACCENTS.map((c) => (
            <button key={c} aria-label={`accent ${c}`}
              onClick={() => setT((t) => (t.accentColor = c))}
              style={{
                width: 28, height: 28, borderRadius: 6, background: c, cursor: "pointer",
                border: theme.accentColor === c ? "3px solid var(--accent)" : "1px solid var(--border)",
              }} />
          ))}
        </div>
      </div>
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
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
