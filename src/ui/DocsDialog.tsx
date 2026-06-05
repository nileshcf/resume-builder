import { useEffect, useState } from "react";
import { useResume } from "@/store/resumeStore";
import { listDocuments, listVersions, type VersionSnapshot } from "@/store/db";
import type { ResumeDocument } from "@/schema/resume";
import { Modal } from "./Modal";
import { IconTrash, IconCopy, IconPlus } from "./Icons";

const when = (iso: string) => new Date(iso).toLocaleString();

export function DocsDialog({ onClose }: { onClose: () => void }) {
  const doc = useResume((s) => s.doc);
  const newResume = useResume((s) => s.newResume);
  const duplicate = useResume((s) => s.duplicateAsVariant);
  const switchDoc = useResume((s) => s.switchDoc);
  const removeDoc = useResume((s) => s.removeDoc);
  const saveVersion = useResume((s) => s.saveVersion);
  const restoreVersion = useResume((s) => s.restoreVersion);

  const [docs, setDocs] = useState<ResumeDocument[]>([]);
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);

  async function refresh() {
    setDocs(await listDocuments());
    setVersions(await listVersions(doc.id));
  }
  useEffect(() => {
    void refresh();
    // re-list whenever the active doc identity or its timestamp changes
  }, [doc.id, doc.meta.updatedAt]);

  return (
    <Modal title="Variants & version history" onClose={onClose} maxWidth={620}>
          <div className="kw-label">Your resumes ({docs.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {docs.map((d) => (
              <div key={d.id} className={`doc-row ${d.id === doc.id ? "doc-active" : ""}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-title">
                    {d.meta.title}
                    {d.meta.basedOnVariant && <span className="badge">variant</span>}
                    {d.id === doc.id && <span className="badge badge-active">editing</span>}
                  </div>
                  <div className="doc-sub">updated {when(d.meta.updatedAt)}</div>
                </div>
                {d.id !== doc.id && (
                  <button className="btn" onClick={() => switchDoc(d.id)}>Open</button>
                )}
                <button className="icon-btn" title="Delete"
                  onClick={() => {
                    if (confirm(`Delete "${d.meta.title}"? This can't be undone.`)) {
                      void removeDoc(d.id).then(refresh);
                    }
                  }}>
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap:"wrap" }}>
            <button className="btn sm" onClick={() => newResume().then(refresh)}>
              <IconPlus size={13} /> New resume
            </button>
            <button className="btn sm" onClick={() => duplicate().then(refresh)}>
              <IconCopy size={13} /> Duplicate as variant
            </button>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="kw-label">History for “{doc.meta.title}” ({versions.length})</div>
            <button className="btn" onClick={() => saveVersion("manual save").then(refresh)}>
              Save version now
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {versions.length === 0 && (
              <span className="muted">No versions yet — they appear as you edit (auto every few minutes) or on save.</span>
            )}
            {versions.map((v) => (
              <div key={v.id} className="doc-row">
                <div style={{ flex: 1 }}>
                  <div className="doc-title">{v.label}</div>
                  <div className="doc-sub">{when(v.takenAt)}</div>
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    if (confirm("Restore this version? Your current state is snapshotted first.")) {
                      void restoreVersion(v.doc).then(refresh);
                    }
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
    </Modal>
  );
}
