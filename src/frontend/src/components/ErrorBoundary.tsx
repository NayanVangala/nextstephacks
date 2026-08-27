import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * 末之守。一隅之敗,不可使全物俱亡。
 *
 * Without a boundary, any exception thrown during render or in a layout effect
 * unmounts the entire React tree and leaves the user a blank white page with no
 * explanation. That already happened here: MapLibre's constructor throws when
 * WebGL2 is missing, and the whole tool — profile picker, text itinerary,
 * reports — went with it.
 *
 * This is the last line, not the first. Failures that can be anticipated should
 * be caught where they happen and degraded locally; this only guarantees that an
 * unanticipated one still leaves something on screen a person can act on.
 */
interface 之狀 {
  誤: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, 之狀> {
  state: 之狀 = { 誤: null };

  static getDerivedStateFromError(誤: Error): 之狀 {
    return { 誤 };
  }

  componentDidCatch(誤: Error, 詳: ErrorInfo) {
    // 無遙測之服,故但錄於 console —— 使人可copy而以告之。
    console.error("界面之敗:", 誤, 詳.componentStack);
  }

  render() {
    if (!this.state.誤) return this.props.children;
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Something in this page broke.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This is a bug on our side, not something you did. Reloading usually
          clears it. Routing runs entirely on your device, so nothing you entered
          was sent anywhere.
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper"
        >
          Reload the page
        </button>
        <pre className="mt-8 overflow-x-auto rounded-lg border border-line bg-panel p-3 text-xs text-muted-foreground">
          {this.state.誤.message}
        </pre>
      </main>
    );
  }
}
