import type { ResumeDocument } from "@/schema/resume";

/**
 * PDF export = print the EXACT DOM the user already approved in the preview.
 * Because the preview and the PDF are produced by the same browser layout
 * engine, preview<->PDF parity is perfect. We inject @page rules so margins
 * and page size match the canonical theme, then trigger the print dialog
 * (user picks "Save as PDF"). 100% client-side, free, zero PII leaves device.
 */
export function exportPdf(doc: ResumeDocument) {
  const paper = document.getElementById("resume-paper");
  if (!paper) return;

  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Pop-up blocked. Allow pop-ups to export the PDF.");
    return;
  }

  const { theme } = doc;
  const size = theme.pageSize === "A4" ? "A4" : "letter";

  // Pull the app's resume CSS so the printed output matches the preview.
  const styleHrefs = Array.from(document.styleSheets)
    .map((s) => s.href)
    .filter((h): h is string => !!h);

  win.document.write(`<!doctype html><html><head>
    <meta charset="utf-8" />
    <title>${doc.meta.title}</title>
    ${styleHrefs.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}
    <style>
      @page {
        size: ${size};
        margin: ${theme.margins.top}in ${theme.margins.right}in ${theme.margins.bottom}in ${theme.margins.left}in;
      }
      html, body { background: #fff; margin: 0; }
      /* paper margins are now page margins; drop the on-screen ones + shadow */
      .paper {
        box-shadow: none; width: auto; min-height: 0;
        padding: 0 !important;
      }
      /* widow/orphan + keep-with rules so page breaks match DOCX behaviour */
      .resume-section { break-inside: avoid-page; }
      .resume-item { break-inside: avoid; }
      .resume-section h2 { break-after: avoid; }
      p, li { orphans: 2; widows: 2; }
    </style>
  </head><body>${paper.outerHTML}</body></html>`);

  win.document.close();
  // Give stylesheets a tick to load before printing.
  win.onload = () => {
    win.focus();
    win.print();
  };
}
