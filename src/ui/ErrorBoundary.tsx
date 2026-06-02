import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches runtime render errors so a bug never white-screens the user out of
 * their work. Their document is already safe in IndexedDB; reloading recovers it.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h2>Something went wrong.</h2>
          <p style={{ color: "#6b7280" }}>
            Your resume is safe — it’s saved in this browser. Reload to pick up where you left off.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
