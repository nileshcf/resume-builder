import React, { useLayoutEffect, useRef } from "react";

/**
 * Contenteditable wrapper that:
 *  - Sets innerHTML imperatively (avoids React cursor-reset on re-render).
 *  - Only syncs outward on blur (React stays out of the way during typing).
 *  - Pastes as plain text so external HTML can't pollute the stored value.
 *  - Works as any HTML element via the `as` prop ("h1", "p", "div", "span"…).
 *
 * Used in both the right-pane preview AND the left-pane form fields so
 * both sides share the same formatting capabilities via FormatToolbar.
 */
export interface InlineEditProps {
  value: string;
  onChange: (html: string) => void;
  as?: string;
  className?: string;
  placeholder?: string;
  /** Enter key blurs instead of inserting a newline (for single-line fields). */
  singleLine?: boolean;
}

export function InlineEdit({
  value,
  onChange,
  as = "span",
  className,
  placeholder,
  singleLine = false,
}: InlineEditProps) {
  const ref    = useRef<HTMLElement>(null);
  const active = useRef(false);   // true while this node has focus

  /**
   * Sync external value → DOM only when NOT actively being edited.
   * useLayoutEffect (not useEffect) so the DOM updates before the browser
   * paints — prevents a flash of stale content.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || active.current) return;
    const next = value ?? "";
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value]);

  return React.createElement(as, {
    ref,
    contentEditable:              true,
    suppressContentEditableWarning: true,
    className: `rich-editable${className ? ` ${className}` : ""}`,
    "data-ph": placeholder ?? "",

    onFocus() {
      active.current = true;
    },

    onBlur(e: React.FocusEvent<HTMLElement>) {
      active.current = false;
      let html = e.currentTarget.innerHTML;
      // Normalise: browser inserts <div> / <br> on Enter in multi-line mode;
      // collapse <div> wrappers to bare <br> so storage stays clean.
      html = html
        .replace(/<div><br\s*\/?><\/div>/gi, "<br>")
        .replace(/<div>/gi, "<br>")
        .replace(/<\/div>/gi, "")
        .replace(/^<br\s*\/?>|<br\s*\/?>$/gi, "")   // trim leading/trailing
        .trim();
      if (html === "<br>") html = "";
      if (html !== (value ?? "")) onChange(html);
    },

    // Paste as plain text — never let outside HTML pollute stored markup.
    onPaste(e: React.ClipboardEvent) {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    },

    onKeyDown(e: React.KeyboardEvent) {
      if (singleLine && e.key === "Enter") {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      }
      // Ctrl/Cmd + B/I handled natively by contenteditable — no code needed.
    },
  });
}
