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

  return (
    <div className="ats-wrap">
      <button className="ats-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ats-dot" style={{ background: color }} />
        ATS {report.score}
      </button>
      {open && (
        <div className="ats-pop" role="dialog" aria-label="ATS report">
          {report.checks.map((c) => (
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
