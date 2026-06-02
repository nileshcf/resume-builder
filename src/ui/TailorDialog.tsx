import { useState } from "react";
import { useResume } from "@/store/resumeStore";
import { analyzeJd, type JdReport } from "@/assist/jdMatch";
import { tailorSuggestions, type Suggestion } from "@/ai/capabilities";
import { aiEnabled, loadAiConfig } from "@/ai/config";
import { Modal } from "./Modal";

export function TailorDialog({ onClose }: { onClose: () => void }) {
  const doc = useResume((s) => s.doc);
  const [jd, setJd] = useState("");
  const [report, setReport] = useState<JdReport | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const hasAi = aiEnabled(loadAiConfig());

  function analyze() {
    setSuggestions(null);
    setReport(analyzeJd(doc, jd));
  }

  async function getSuggestions() {
    if (!report) return;
    setLoadingAi(true);
    try {
      setSuggestions(await tailorSuggestions(doc, jd, report));
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <Modal title="Tailor to a job description" onClose={onClose} maxWidth={680}>
          <p className="muted">
            Paste a job posting. Keyword matching runs <b>entirely on your device</b> — the
            job description is never uploaded anywhere.
          </p>
          <textarea
            className="triage-lines"
            rows={6}
            placeholder="Paste the full job description here…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn primary" onClick={analyze} disabled={!jd.trim()}>
              Analyze keyword gap
            </button>
            {report && hasAi && (
              <button className="btn" onClick={getSuggestions} disabled={loadingAi}>
                {loadingAi ? "Thinking…" : "✨ Get AI suggestions"}
              </button>
            )}
          </div>

          {report && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                Keyword coverage: <b>{Math.round(report.coverage * 100)}%</b>
                {!hasAi && (
                  <span className="muted"> · add an API key in Settings for AI-written suggestions</span>
                )}
              </div>

              <div className="kw-group">
                <div className="kw-label">Missing from your resume ({report.missing.length})</div>
                <div className="kw-chips">
                  {report.missing.length === 0 && <span className="muted">None — strong match!</span>}
                  {report.missing.map((t) => (
                    <span key={t.term} className="kw-chip kw-miss" title={`weight ${t.weight}`}>
                      {t.term}
                    </span>
                  ))}
                </div>
              </div>

              <div className="kw-group">
                <div className="kw-label">Already covered ({report.matched.length})</div>
                <div className="kw-chips">
                  {report.matched.map((t) => (
                    <span key={t.term} className="kw-chip kw-match">{t.term}</span>
                  ))}
                </div>
              </div>

              {suggestions && (
                <div className="kw-group">
                  <div className="kw-label">
                    Suggestions {suggestions[0]?.source === "ai" ? "(AI)" : "(heuristic)"}
                  </div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13 }}>
                    {suggestions.map((s, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{s.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
    </Modal>
  );
}
