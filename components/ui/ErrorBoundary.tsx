"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  label?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[MioOS${this.props.label ? ` / ${this.props.label}` : ""}] Error boundary caught:`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="max-w-sm w-full p-6 rounded-2xl border border-accent-red/20 bg-accent-red/5 text-center">
            <AlertCircle className="w-8 h-8 text-accent-red mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              {this.props.label ? `${this.props.label} Error` : "Something went wrong"}
            </h3>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed font-mono">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-all border border-accent-red/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
