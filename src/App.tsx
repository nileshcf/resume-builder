import { Suspense, lazy, useEffect, useState } from "react";
import { useResume } from "./store/resumeStore";
import { saveDocument } from "./store/db";
import { FormPane } from "./editor/FormPane";
import { PreviewStage } from "./preview/PreviewStage";
import { exportPdf } from "./export/pdf";

import { AtsMeter } from "./ui/AtsMeter";
import { CreditFooter } from "./ui/CreditFooter";

// Heavy, rarely-used-on-first-load code is split into separate chunks.
const ImportDialog = lazy(() =>
  import("./import/ImportDialog").then((m) => ({ default: m.ImportDialog }))
);
const SettingsDialog = lazy(() =>
  import("./ui/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
);
const TailorDialog = lazy(() =>
  import("./ui/TailorDialog").then((m) => ({ default: m.TailorDialog }))
);
const DocsDialog = lazy(() =>
  import("./ui/DocsDialog").then((m) => ({ default: m.DocsDialog }))
);
const DesignDialog = lazy(() =>
  import("./ui/DesignDialog").then((m) => ({ default: m.DesignDialog }))
);
const exportDocx = async (...args: Parameters<typeof import("./export/docx").exportDocx>) =>
  (await import("./export/docx")).exportDocx(...args);

export function App() {
  const doc = useResume((s) => s.doc);
  const saveState = useResume((s) => s.saveState);
  const hydrated = useResume((s) => s.hydrated);
  const hydrate = useResume((s) => s.hydrate);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showDesign, setShowDesign] = useState(false);
  const rename = useResume((s) => s.rename);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // (Dialogs handle their own Escape/focus-trap via the shared Modal component.)

  // Flush to IndexedDB on tab close / hide (Scenario D — zero data loss).
  useEffect(() => {
    const flush = () => {
      void saveDocument(useResume.getState().doc);
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  if (!hydrated) return <div style={{ padding: 24 }}>Loading your work…</div>;

  return (
    <div className="app">
      <div className="topbar">
        <h1>Resume Builder</h1>
        <input
          className="doc-title-input"
          value={doc.meta.title}
          onChange={(e) => rename(e.target.value)}
          aria-label="Resume title"
        />
        <button className="btn" onClick={() => setShowDocs(true)}>Variants ▾</button>
        <span className="savechip" data-state={saveState} role="status" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved on this device" : ""}
        </span>
        <AtsMeter />
        <div className="spacer" />
        <button className="btn" onClick={() => setShowDesign(true)}>🎨 Design</button>
        <button className="btn" onClick={() => setShowTailor(true)}>Tailor to job</button>
        <button className="btn" onClick={() => setShowImport(true)}>Import</button>
        <button className="btn" onClick={() => setShowSettings(true)} aria-label="AI settings">⚙ AI</button>
        <button className="btn" onClick={() => exportDocx(doc)}>.docx</button>
        <button className="btn primary" onClick={() => exportPdf(doc)}>Export PDF</button>
      </div>

      <div className="tabbar">
        <button className="btn" onClick={() => setMobileTab("edit")} aria-pressed={mobileTab === "edit"}>Edit</button>
        <button className="btn" onClick={() => setMobileTab("preview")} aria-pressed={mobileTab === "preview"}>Preview</button>
      </div>

      <div className="split">
        <div className={`pane form-pane ${mobileTab === "preview" ? "hide-mobile" : ""}`}>
          <FormPane />
        </div>
        <div className={`pane preview-pane ${mobileTab === "edit" ? "hide-mobile" : ""}`}>
          <PreviewStage doc={doc} />
        </div>
      </div>

      <CreditFooter />

      <Suspense fallback={null}>
        {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
        {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
        {showTailor && <TailorDialog onClose={() => setShowTailor(false)} />}
        {showDocs && <DocsDialog onClose={() => setShowDocs(false)} />}
        {showDesign && <DesignDialog onClose={() => setShowDesign(false)} />}
      </Suspense>
    </div>
  );
}
