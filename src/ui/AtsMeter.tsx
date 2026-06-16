import { useMemo, useState } from "react";
import { useResume } from "@/store/resumeStore";
import { runAtsCheck } from "@/assist/atsCheck";
import { IconCheck, IconX } from "./Icons";

/** Live ATS / quality meter. Recomputes on every doc change (cheap, no-LLM). */
export function AtsMeter() {
  const doc = useResume((s) => s.doc);
  const [open, setOpen] = useState(false);
  const report = useMemo(() => runAtsCheck(doc), [doc]);

  const color =
    report.score >= 80 ? "var(--ok)" : report.score >= 55 ? "#a16207" : "var(--danger)";

  const verdict =
    report.score >= 80 ? "Strong" : report.score >= 55 ? "Needs work" : "At risk";

  // Sort checks: fail → warn → pass (most actionable first)
  const sortedChecks = useMemo(
    () =>
      [...report.checks].sort((a, b) => {
        const statusOrder = { fail: 0, warn: 1, pass: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }),
    [report.checks]
  );

  // SVG progress ring calculation
  const circumference = 2 * Math.PI * 8; // radius 8
  const strokeDashoffset = circumference - (report.score / 100) * circumference;

  return (
    <div className="ats-wrap">
      <button className="ats-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <svg className="ats-ring" width="20" height="20" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 10 10)"
          />
        </svg>
        ATS {report.score}
      </button>
      {open && (
        <div className="ats-pop" role="dialog" aria-label="ATS report">
          <div className="ats-header">
            <span className="ats-score">ATS Score {report.score}/100</span>
            <span className="ats-verdict" style={{ color }}>
              {verdict}
            </span>
          </div>
          {sortedChecks.map((c) => (
            <div key={c.label} className="ats-row">
              <span className={`ats-status ats-${c.status}`}>
                {c.status === "pass" ? <IconCheck size={11} /> : c.status === "warn" ? "!" : <IconX size={11} />}
              </span>
              <div>
                <div className="ats-row-label">{c.label}</div>
                <div className="ats-row-detail">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
