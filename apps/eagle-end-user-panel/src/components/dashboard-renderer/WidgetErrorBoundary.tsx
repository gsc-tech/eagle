import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
    widgetName?: string;
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[WidgetErrorBoundary] ${this.props.widgetName ?? "Unknown"}:`, error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-destructive">Widget crashed</p>
                {this.props.widgetName && (
                    <p className="text-xs text-destructive/70">{this.props.widgetName}</p>
                )}
                <p className="text-xs text-muted-foreground max-w-[200px] break-words">
                    {this.state.error?.message ?? "An unexpected error occurred"}
                </p>
                <button
                    onClick={this.handleRetry}
                    className="mt-1 text-xs px-3 py-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }
}