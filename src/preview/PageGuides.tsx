import { useEffect, useState } from "react";
import type { ResumeDocument } from "@/schema/resume";

/**
 * Live pagination guides (Scenario C). Measures the rendered #resume-paper and
 * overlays dashed page-break lines + a page count, approximating where the
 * printed PDF will break.
 *
 * Why measurement, not live Paged.js: Paged.js re-flows the DOM into page
 * boxes, which is expensive on every keystroke and fights React's control of
 * the same nodes. Since our PDF is produced by the browser's own print engine
 * from this exact DOM, a measurement overlay gives accurate guides cheaply while
 * the print engine remains the source of truth for the actual breaks.
 */
const DPI = 96; // CSS px per inch

export function PageGuides({ doc }: { doc: ResumeDocument }) {
  const [breaks, setBreaks] = useState<number[]>([]);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const paper = document.getElementById("resume-paper");
    if (!paper) return;

    const compute = () => {
      const { margins, pageSize } = doc.theme;
      const pageH = (pageSize === "A4" ? 11.69 : 11) * DPI;
      const topM = margins.top * DPI;
      const botM = margins.bottom * DPI;
      const usable = Math.max(1, pageH - topM - botM);

      // Paper padding contributes the single top+bottom margin; the rest is content.
      const contentH = paper.scrollHeight - topM - botM;
      const count = Math.max(1, Math.ceil(contentH / usable));

      const ys: number[] = [];
      for (let k = 1; k < count; k++) ys.push(topM + k * usable);
      setBreaks(ys);
      setPages(count);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(paper);
    // content edits change height without resizing the box width → also watch DOM
    const mo = new MutationObserver(compute);
    mo.observe(paper, { subtree: true, childList: true, characterData: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [doc]);

  return (
    <>
      <div className="page-count" aria-live="polite">
        {pages} page{pages > 1 ? "s" : ""}
      </div>
      {breaks.map((y, i) => (
        <div key={i} className="page-guide" style={{ top: `${y}px` }}>
          <span>page {i + 2}</span>
        </div>
      ))}
    </>
  );
}
