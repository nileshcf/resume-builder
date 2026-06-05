import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "rb.splitPane.leftPx";
const MIN_PX      = 240;   // form pane never narrower than 240px
const MAX_PX      = 700;   // never wider than 700px
const DEFAULT_PX  = 380;

function clamp(v: number) {
  return Math.min(MAX_PX, Math.max(MIN_PX, v));
}

function read(): number {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) ?? "", 10);
    return isNaN(v) ? DEFAULT_PX : clamp(v);
  } catch {
    return DEFAULT_PX;
  }
}

function write(v: number) {
  try { localStorage.setItem(STORAGE_KEY, String(v)); } catch { /* ignore */ }
}

/**
 * Returns the current left-pane width in px, and a ref to attach to the
 * drag handle element. Works for both mouse and touch.
 */
export function useSplitPane() {
  const [leftPx, setLeftPx] = useState<number>(read);
  const dragging  = useRef(false);
  const startX    = useRef(0);
  const startLeft = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault();
    dragging.current  = true;
    startX.current    = e.clientX;
    startLeft.current = read();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    const next  = clamp(startLeft.current + delta);
    setLeftPx(next);
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const delta = e.clientX - startX.current;
    const next  = clamp(startLeft.current + delta);
    write(next);
  }, []);

  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  return { leftPx, handleRef };
}
