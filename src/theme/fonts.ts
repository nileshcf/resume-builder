import type { Theme } from "@/schema/resume";

/**
 * Map each curated ATS font to a fallback stack. Calibri/Garamond aren't on
 * every machine; these stacks degrade to metric-compatible or visually-close
 * substitutes so the on-screen preview (and the PDF printed from it) stays
 * faithful regardless of the viewer's installed fonts.
 */
const STACKS: Record<Theme["fontFamily"], string> = {
  Calibri: `Calibri, Carlito, "Segoe UI", system-ui, sans-serif`,
  Arial: `Arial, "Helvetica Neue", "Liberation Sans", Helvetica, sans-serif`,
  Helvetica: `Helvetica, Arial, "Liberation Sans", sans-serif`,
  Georgia: `Georgia, "Liberation Serif", "Times New Roman", serif`,
  "Times New Roman": `"Times New Roman", "Liberation Serif", Times, serif`,
  Garamond: `Garamond, "EB Garamond", "Cormorant Garamond", Georgia, serif`,
  Cambria: `Cambria, "Crimson Text", Georgia, serif`,
  Verdana: `Verdana, "DejaVu Sans", "Segoe UI", sans-serif`,
  Tahoma: `Tahoma, Verdana, "Segoe UI", sans-serif`,
};

export function fontStack(family: Theme["fontFamily"]): string {
  return STACKS[family] ?? `${family}, serif`;
}
