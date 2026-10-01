import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="page-pad">
        <h1>Something went wrong.</h1>
        <p>Your saved stories are still in this browser.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Return to ReelTara
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
