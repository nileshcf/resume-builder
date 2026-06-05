/**
 * Lightweight inline SVG icon set. No icon-font, no npm dep.
 * All icons are 16×16 viewport, stroke-based so they scale with font-size.
 * Colour inherits via `currentColor` so they always match surrounding text.
 */

type IconProps = { size?: number; className?: string; "aria-hidden"?: boolean };
const mk =
  (path: string) =>
  ({ size = 16, className, "aria-hidden": ah = true }: IconProps) =>
    (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden={ah}
      >
        <path d={path} />
      </svg>
    );

export const IconChevronDown = mk("M4 6l4 4 4-4");
export const IconChevronUp   = mk("M12 10l-4-4-4 4");
export const IconEye         = mk("M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5zM8 10a2 2 0 100-4 2 2 0 000 4z");
export const IconEyeOff      = mk("M2 2l12 12M6.5 6.5A2 2 0 0010 10M8 3c4.5 0 7 5 7 5a12.5 12.5 0 01-2.1 2.9M1 8s1 2 3 3.5");
export const IconTrash       = mk("M3 4h10M6 4V2h4v2M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4");
export const IconMove        = mk("M8 2v12M2 8h12M5 5L2 8l3 3M11 5l3 3-3 3");
export const IconPlus        = mk("M8 2v12M2 8h12");
export const IconX           = mk("M3 3l10 10M13 3L3 13");
export const IconSettings    = mk("M8 5a3 3 0 100 6 3 3 0 000-6zM8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4");
export const IconDownload    = mk("M8 2v9M4 7l4 4 4-4M2 14h12");
export const IconUpload      = mk("M8 14V5M4 9l4-4 4 4M2 2h12");
export const IconPalette     = mk("M12 2a6 6 0 010 12c-1.1 0-2-.9-2-2s.9-2 2-2a6 6 0 000-12zM6 8a1 1 0 100-2 1 1 0 000 2zM9 5a1 1 0 100-2 1 1 0 000 2zM5 11a1 1 0 100-2 1 1 0 000 2z");
export const IconBriefcase   = mk("M5 4V2h6v2M2 4h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1z");
export const IconStar        = mk("M8 1l1.9 3.8L14 5.7l-3 2.9.7 4.1L8 10.6l-3.7 2.1.7-4.1L2 5.7l4.1-.9L8 1z");
export const IconCopy        = mk("M4 4H2a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-2M6 1h8a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1z");
export const IconHistory     = mk("M1 8a7 7 0 1014 0M1 8V4M1 8l3-1M8 5v4l2.5 2.5");
export const IconAI          = mk("M3 8h2M11 8h2M8 3v2M8 11v2M5 5l1.4 1.4M9.6 9.6l1.4 1.4M5 11l1.4-1.4M9.6 6.4l1.4-1.4M8 10a2 2 0 100-4 2 2 0 000 4z");
export const IconImage       = mk("M1 3a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V3zM1 11l4-4 3 3 2-2 4 4M11 6a1 1 0 100-2 1 1 0 000 2z");
export const IconLayout      = mk("M1 1h14v14H1zM1 5h14M6 5v10");
export const IconTarget      = mk("M14 8A6 6 0 112 8a6 6 0 0112 0zM10 8a2 2 0 11-4 0 2 2 0 014 0zM8 8h.01");
export const IconMenu        = mk("M2 4h12M2 8h12M2 12h12");
export const IconCheck       = mk("M2 8l4 4 8-8");
export const IconSave        = mk("M4 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V5l-4-4H4zM4 1v4h7M4 9h8M4 12h8");
export const IconZap         = mk("M9 1L4 9h5l-2 6 7-8H9l2-6z");
