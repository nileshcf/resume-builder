import { useState } from "react";
import { extractResume } from "./extract";
import { classify, type ClassifiedBlock } from "./classify";
import { mapToSchema } from "./mapToSchema";
import { useResume } from "@/store/resumeStore";
import { snapshot } from "@/store/db";
import type { SectionType } from "@/schema/resume";
import { Modal } from "@/ui/Modal";

type Stage = "upload" | "parsing" | "triage" | "error";

const TYPE_OPTIONS: { value: ClassifiedBlock["guessedType"]; label: string }[] = [
  { value: "header", label: "Header / Contact" },
  { value: "summary", label: "Summary" },
  { value: "experience", label: "Experience" },
  { value: "education", label: "Education" },
  { value: "skills", label: "Skills" },
  { value: "projects", label: "Projects" },
  { value: "certifications", label: "Certifications" },
  { value: "custom", label: "Custom section" },
  { value: "unknown", label: "Review later (hidden)" },
];

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [blocks, setBlocks] = useState<ClassifiedBlock[]>([]);
  const [error, setError] = useState("");
  const loadDoc = useResume((s) => s.loadDoc);
  const currentDoc = useResume((s) => s.doc);

  async function handleFile(file: File) {
    setStage("parsing");
    try {
      const lines = await extractResume(file);
      const result = classify(lines);
      if (result.length === 0) throw new Error("Couldn't read any text from this file.");
      setBlocks(result);
      setStage("triage");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
      setStage("error");
    }
  }

  function update(id: string, patch: Partial<ClassifiedBlock>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
  }

  function build() {
    // Snapshot whatever the user had before clobbering it with the import.
    void snapshot(currentDoc, "before import");
    const doc = mapToSchema(blocks);
    loadDoc(doc);
    onClose();
  }

  const lowCount = blocks.filter((b) => b.confidence === "low").length;

  return (
    <Modal title="Import a resume" onClose={onClose} maxWidth={720}>
        {stage === "upload" && (
          <div>
            <p className="muted">
              Upload a PDF or DOCX. Everything is parsed <b>in your browser</b> — the file
              never leaves your device.
            </p>
            <label className="dropzone">
              <input
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span>📄 Click to choose a PDF or DOCX</span>
            </label>
          </div>
        )}

        {stage === "parsing" && <div>Reading your resume…</div>}

        {stage === "error" && (
          <div>
            <p style={{ color: "var(--danger)" }}>{error}</p>
            <button className="btn" onClick={() => setStage("upload")}>Try another file</button>
          </div>
        )}

        {stage === "triage" && (
          <div>
            <p className="muted">
              We detected these sections. Fix anything we got wrong — change a section's
              type, edit its heading, move it up/down, or edit the text directly. Nothing is
              discarded.
              {lowCount > 0 && (
                <b style={{ color: "#a16207" }}> {lowCount} section(s) need your help.</b>
              )}
            </p>

            {blocks.map((b) => (
              <div
                key={b.id}
                className="triage-block"
                data-conf={b.confidence}
              >
                <div className="triage-head">
                  <span className={`conf conf-${b.confidence}`}>{b.confidence}</span>
                  <input
                    className="triage-title"
                    value={b.guessedTitle}
                    onChange={(e) => update(b.id, { guessedTitle: e.target.value })}
                  />
                  <select
                    value={b.guessedType}
                    onChange={(e) =>
                      update(b.id, {
                        guessedType: e.target.value as SectionType | "header" | "unknown",
                      })
                    }
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button className="icon-btn" onClick={() => move(b.id, -1)} aria-label="Move up">↑</button>
                  <button className="icon-btn" onClick={() => move(b.id, 1)} aria-label="Move down">↓</button>
                  <button className="icon-btn" onClick={() => remove(b.id)} aria-label="Delete">🗑</button>
                </div>
                <textarea
                  className="triage-lines"
                  rows={Math.min(8, Math.max(2, b.lines.length))}
                  value={b.lines.join("\n")}
                  onChange={(e) => update(b.id, { lines: e.target.value.split("\n") })}
                />
              </div>
            ))}

            <div className="modal-foot">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={build}>Looks good — build resume</button>
            </div>
          </div>
        )}
    </Modal>
  );
}
