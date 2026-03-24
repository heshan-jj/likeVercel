import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary p-8 text-center">
          <div className="max-w-md w-full bg-bg-secondary border border-red-500/20 rounded-[32px] p-10 shadow-2xl space-y-6">
            <div className="p-5 bg-red-500/10 rounded-full w-fit mx-auto">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight mb-2">Something went wrong</h2>
              <p className="text-text-muted text-xs font-medium leading-relaxed">
                An unexpected error occurred in the application. The error has been logged.
              </p>
              {this.state.error && (
                <pre className="mt-4 text-left text-[10px] bg-bg-primary border border-border-light rounded-xl p-4 text-red-400 overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-xl"
            >
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
