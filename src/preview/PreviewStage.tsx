import { useLayoutEffect, useRef, useState } from "react";
import type { ResumeDocument } from "@/schema/resume";
import { ResumePreview } from "./ResumePreview";
import { PageGuides } from "./PageGuides";

/**
 * Scales the full-size paper down to fit the preview pane width (never up past
 * 1:1), so the page is always fully visible instead of clipped/scrolled. The
 * guide overlay lives inside the scaled wrapper, so page-break lines scale with
 * it. Layout footprint is reserved at the scaled size to avoid dead space.
 */
export function PreviewStage({ doc }: { doc: ResumeDocument }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const compute = () => {
      const el = outer.current;
      const paper = document.getElementById("resume-paper");
      if (!el || !paper) return;
      const avail = el.clientWidth - 48; // pane padding
      const pw = paper.offsetWidth;
      const ph = paper.offsetHeight;
      const s = Math.min(1, avail / pw);
      setScale(s);
      setBox({ w: pw * s, h: ph * s });
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (outer.current) ro.observe(outer.current);
    const paper = document.getElementById("resume-paper");
    if (paper) {
      ro.observe(paper);
      const mo = new MutationObserver(compute);
      mo.observe(paper, { subtree: true, childList: true, characterData: true });
      return () => { ro.disconnect(); mo.disconnect(); };
    }
    return () => ro.disconnect();
  }, [doc]);

  return (
    <div className="preview-stage" ref={outer}>
      <div style={{ width: box.w || undefined, height: box.h || undefined, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div className="paper-wrap">
            <ResumePreview doc={doc} />
            <PageGuides doc={doc} />
          </div>
        </div>
      </div>
    </div>
  );
}
