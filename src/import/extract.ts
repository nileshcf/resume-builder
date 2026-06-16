import * as pdfjs from "pdfjs-dist";
// Vite bundles the worker locally — no CDN, keeps everything client-side/offline.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** One reconstructed line of source text plus formatting hints used by the classifier. */
export interface RawLine {
  text: string;
  fontSize: number; // approximate, for heading detection (0 when unknown, e.g. DOCX)
  bold: boolean;
  page: number;
}

/** Extract lines from a PDF, grouping text items that share a baseline into one line. */
export async function extractPdf(file: File): Promise<RawLine[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const lines: RawLine[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // bucket items by rounded y so same-row fragments merge into one line
    const rows = new Map<number, { x: number; str: string; h: number; bold: boolean }[]>();
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const h = Math.hypot(item.transform[2], item.transform[3]) || item.height || 0;
      const bold = /bold|black|semibold/i.test(item.fontName ?? "");
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: item.str, h, bold });
    }

    // emit lines top-to-bottom (PDF y grows upward, so sort descending)
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, frags]) => {
        frags.sort((a, b) => a.x - b.x);
        const text = frags.map((f) => f.str).join(" ").replace(/\s+/g, " ").trim();
        if (!text) return;
        const fontSize = Math.max(...frags.map((f) => f.h));
        const bold = frags.some((f) => f.bold);
        lines.push({ text, fontSize, bold, page: p });
      });
  }
  return lines;
}

/** Extract lines from a DOCX. Mammoth gives semantic HTML; we keep heading hints. */
export async function extractDocx(file: File): Promise<RawLine[]> {
  const buf = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const dom = new DOMParser().parseFromString(html, "text/html");
  const lines: RawLine[] = [];

  dom.body.querySelectorAll("h1,h2,h3,h4,p,li").forEach((el) => {
    // Sanitize HTML to only allow b, strong, i, em, br tags
    const allowedTags = new Set(["b", "strong", "i", "em", "br"]);
    
    function sanitize(node: Node): string {
      if (node.nodeType === 3) {
        return node.textContent ?? "";
      }
      if (node.nodeType !== 1) return "";
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (!allowedTags.has(tag)) {
        // Skip disallowed tags but keep their children
        return Array.from(node.childNodes).map(sanitize).join("");
      }
      const inner = Array.from(node.childNodes).map(sanitize).join("");
      if (tag === "br") return "<br>";
      return `<${tag}>${inner}</${tag}>`;
    }

    const text = sanitize(el).replace(/\s+/g, " ").trim();
    if (!text) return;
    const isHeading = /^H[1-4]$/.test(el.tagName);
    lines.push({
      text,
      // synthesise a font size so the classifier's formatting heuristics still fire
      fontSize: isHeading ? 16 : 11,
      bold: isHeading || el.querySelector("strong,b") !== null,
      page: 1,
    });
  });
  return lines;
}

export async function extractResume(file: File): Promise<RawLine[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdf(file);
  if (name.endsWith(".docx")) return extractDocx(file);
  throw new Error("Unsupported file. Upload a PDF or DOCX.");
}
