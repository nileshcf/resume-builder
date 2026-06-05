import { Suspense, lazy, useEffect, useState } from "react";
import { useResume } from "./store/resumeStore";
import { saveDocument } from "./store/db";
import { PreviewStage } from "./preview/PreviewStage";
import { FormPane } from "./editor/FormPane";
import { AtsMeter } from "./ui/AtsMeter";
import { CreditFooter } from "./ui/CreditFooter";
import {
  IconAI, IconDownload, IconUpload, IconPalette,
  IconTarget, IconHistory, IconMenu, IconX, IconSave, IconZap,
} from "./ui/Icons";
import { exportPdf } from "./export/pdf";
import { useSplitPane } from "./hooks/useSplitPane";

const ImportDialog  = lazy(() => import("./import/ImportDialog").then(m  => ({ default: m.ImportDialog  })));
const SettingsDialog= lazy(() => import("./ui/SettingsDialog") .then(m  => ({ default: m.SettingsDialog })));
const TailorDialog  = lazy(() => import("./ui/TailorDialog")   .then(m  => ({ default: m.TailorDialog   })));
const DocsDialog    = lazy(() => import("./ui/DocsDialog")     .then(m  => ({ default: m.DocsDialog     })));
const DesignDialog  = lazy(() => import("./ui/DesignDialog")   .then(m  => ({ default: m.DesignDialog   })));

const exportDocx = async (...args: Parameters<typeof import("./export/docx").exportDocx>) =>
  (await import("./export/docx")).exportDocx(...args);

export function App() {
  const doc      = useResume(s => s.doc);
  const saveState= useResume(s => s.saveState);
  const hydrated = useResume(s => s.hydrated);
  const hydrate  = useResume(s => s.hydrate);
  const rename   = useResume(s => s.rename);

  const [mobileTab,   setMobileTab]   = useState<"edit"|"preview">("edit");
  const { leftPx, handleRef } = useSplitPane();
  const [showImport,  setShowImport]  = useState(false);
  const [showSettings,setShowSettings]= useState(false);
  const [showTailor,  setShowTailor]  = useState(false);
  const [showDocs,    setShowDocs]    = useState(false);
  const [showDesign,  setShowDesign]  = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    const flush = () => void saveDocument(useResume.getState().doc);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  if (!hydrated) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12 }}>
        <IconZap size={28} />
        <span style={{ fontSize:14, color:"#6b7280" }}>Loading your work…</span>
      </div>
    );
  }

  // Actions grouped for reuse in both topbar and mobile menu
  const actions = (
    <>
      <button className="btn" onClick={() => { setShowDesign(true); setMenuOpen(false); }} aria-label="Design">
        <IconPalette size={15} /><span className="btn-label">Design</span>
      </button>
      <button className="btn" onClick={() => { setShowTailor(true); setMenuOpen(false); }} aria-label="Tailor to job">
        <IconTarget size={15} /><span className="btn-label">Tailor</span>
      </button>
      <button className="btn" onClick={() => { setShowImport(true); setMenuOpen(false); }} aria-label="Import resume">
        <IconUpload size={15} /><span className="btn-label">Import</span>
      </button>
      <button className="btn" onClick={() => { setShowSettings(true); setMenuOpen(false); }} aria-label="AI settings">
        <IconAI size={15} /><span className="btn-label">AI</span>
      </button>
      <button className="btn" onClick={() => exportDocx(doc)} aria-label="Download DOCX">
        <IconDownload size={15} /><span className="btn-label">.docx</span>
      </button>
      <button className="btn primary" onClick={() => exportPdf(doc)} aria-label="Export PDF">
        <IconSave size={15} /><span className="btn-label">Export PDF</span>
      </button>
    </>
  );

  return (
    <div className="app">
      {/* ---- Topbar ---------------------------------------------------- */}
      <div className="topbar">
        <div className="topbar-brand">
          <IconZap size={18} />
          <h1>Resume Builder</h1>
        </div>

        <input
          className="doc-title-input"
          value={doc.meta.title}
          onChange={e => rename(e.target.value)}
          aria-label="Resume title"
        />

        <button
          className="btn sm"
          onClick={() => setShowDocs(true)}
          aria-label="Variants and history"
        >
          <IconHistory size={14} /><span className="btn-label">Variants</span>
        </button>

        <span className="savechip" data-state={saveState} role="status" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved" : ""}
        </span>

        <AtsMeter />
        <div className="spacer" />

        {/* Desktop actions */}
        <div className="topbar-actions" style={{ display:"flex", gap:6, alignItems:"center" }}>
          {actions}
        </div>

        {/* Mobile hamburger */}
        <button
          className="icon-btn mobile-menu-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          style={{ display:"none" }}
        >
          {menuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {actions}
        </div>
      )}

      {/* ---- Tabbar (mobile) ------------------------------------------- */}
      <div className="tabbar">
        <button
          className="btn"
          onClick={() => setMobileTab("edit")}
          aria-pressed={mobileTab === "edit"}
        >
          Edit
        </button>
        <button
          className="btn"
          onClick={() => setMobileTab("preview")}
          aria-pressed={mobileTab === "preview"}
        >
          Preview
        </button>
      </div>

      {/* ---- Main split ------------------------------------------------- */}
      <div
        className="split"
        style={{ gridTemplateColumns: `${leftPx}px 6px 1fr` }}
      >
        <div className={`pane form-pane ${mobileTab === "preview" ? "hide-mobile" : ""}`}>
          <FormPane />
        </div>

        {/* Drag handle — hidden on mobile (tabbed layout, no split) */}
        <div
          ref={handleRef}
          className="split-handle"
          role="separator"
          aria-label="Resize panes"
          aria-orientation="vertical"
        />

        <div className={`pane preview-pane ${mobileTab === "edit" ? "hide-mobile" : ""}`}>
          <PreviewStage doc={doc} />
        </div>
      </div>

      <CreditFooter />

      {/* ---- Dialogs ---------------------------------------------------- */}
      <Suspense fallback={null}>
        {showImport   && <ImportDialog   onClose={() => setShowImport(false)}   />}
        {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
        {showTailor   && <TailorDialog   onClose={() => setShowTailor(false)}   />}
        {showDocs     && <DocsDialog     onClose={() => setShowDocs(false)}     />}
        {showDesign   && <DesignDialog   onClose={() => setShowDesign(false)}   />}
      </Suspense>
    </div>
  );
}
