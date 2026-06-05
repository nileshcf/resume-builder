import { useEffect, useRef, useState } from "react";

/**
 * Floating format toolbar. Appears above selected text inside ANY element
 * that has the `rich-editable` CSS class — covers both the right-pane preview
 * and the left-pane form fields. Uses document.execCommand which, despite being
 * "deprecated", is universally supported for contenteditable and will remain so.
 *
 * Placement: position:fixed above the selection's bounding rect. Fixed coords
 * correctly account for CSS transforms (e.g. PreviewStage scale).
 */

interface TS { show: boolean; x: number; y: number; bold: boolean; italic: boolean; inLink: boolean }

export function FormatToolbar() {
  const [s, setS] = useState<TS>({ show: false, x: 0, y: 0, bold: false, italic: false, inLink: false });
  const [linkMode, setLinkMode] = useState(false);
  const [linkVal,  setLinkVal]  = useState("");
  const barRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onSel() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setS(p => ({ ...p, show: false })); setLinkMode(false); return;
      }
      const range    = sel.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const node     = ancestor.nodeType === 1 ? (ancestor as Element) : ancestor.parentElement;
      if (!node?.closest(".rich-editable")) {
        setS(p => ({ ...p, show: false })); setLinkMode(false); return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect.width) { setS(p => ({ ...p, show: false })); return; }

      setS({
        show: true,
        x:    rect.left + rect.width / 2,
        y:    rect.top,
        bold:   document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        inLink: !!node.closest("a"),
      });
    }
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  if (!s.show) return null;

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    setS(p => ({
      ...p,
      bold:   document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      inLink: cmd === "unlink" ? false : p.inLink,
    }));
  }

  function openLink() {
    const sel = window.getSelection();
    const existing = sel?.anchorNode?.parentElement?.closest("a");
    setLinkVal(existing?.getAttribute("href") ?? "https://");
    setLinkMode(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function applyLink() {
    const url = linkVal.trim();
    if (url && url !== "https://") exec("createLink", url);
    else exec("unlink");
    setLinkMode(false);
  }

  return (
    <div
      ref={barRef}
      className="format-toolbar"
      style={{ left: s.x, top: s.y, transform: "translate(-50%, calc(-100% - 10px))" }}
      onMouseDown={e => e.preventDefault()} // keep focus in editable
    >
      {!linkMode ? (
        <>
          <button
            className={`fmt-btn${s.bold ? " active" : ""}`}
            onClick={() => exec("bold")}
            title="Bold (Ctrl+B)"
          ><b>B</b></button>

          <button
            className={`fmt-btn fmt-italic${s.italic ? " active" : ""}`}
            onClick={() => exec("italic")}
            title="Italic (Ctrl+I)"
          ><i>I</i></button>

          <div className="fmt-sep" />

          <button
            className={`fmt-btn${s.inLink ? " active" : ""}`}
            onClick={openLink}
            title="Add / edit link"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M6.5 9.5a3.54 3.54 0 005 0l2-2a3.54 3.54 0 00-5-5L7.5 3.5" />
              <path d="M9.5 6.5a3.54 3.54 0 00-5 0l-2 2a3.54 3.54 0 005 5l1-1" />
            </svg>
          </button>

          {s.inLink && (
            <button className="fmt-btn" onClick={() => exec("unlink")} title="Remove link">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M6.5 9.5a3.54 3.54 0 005 0l2-2a3.54 3.54 0 00-5-5L7.5 3.5" />
                <path d="M9.5 6.5a3.54 3.54 0 00-5 0l-2 2a3.54 3.54 0 005 5l1-1" />
                <line x1="3" y1="3" x2="13" y2="13" />
              </svg>
            </button>
          )}
        </>
      ) : (
        /* Link input mode */
        <div className="fmt-link-row" onMouseDown={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            className="fmt-link-input"
            value={linkVal}
            onChange={e => setLinkVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") { setLinkMode(false); }
            }}
            placeholder="https://"
            autoFocus
          />
          <button className="fmt-btn" onClick={applyLink} title="Apply">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8l4 4 8-8"/></svg>
          </button>
          <button className="fmt-btn" onClick={() => setLinkMode(false)} title="Cancel">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
