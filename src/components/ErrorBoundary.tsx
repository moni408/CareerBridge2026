import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let errorDetails = this.state.error?.message || "";

      // Try to parse JSON error from Firestore
      try {
        if (errorDetails.startsWith('{')) {
          const parsed = JSON.parse(errorDetails);
          if (parsed.error) {
            errorMessage = parsed.error;
            if (errorMessage.includes('permission')) {
              errorMessage = "You don't have permission to perform this action. Please check your account status.";
            }
          }
        }
      } catch (e) {
        // Not a JSON error, keep original
      }

      return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-base-100 rounded-[2.5rem] shadow-2xl border border-base-content/5 p-10 text-center">
            <div className="w-20 h-20 bg-error/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-10 h-10 text-error" />
            </div>
            <h2 className="text-3xl font-black text-base-content mb-4 tracking-tight">Something went wrong</h2>
            <p className="text-base-content/60 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            
            {errorDetails && !errorDetails.startsWith('{') && (
              <div className="bg-base-content/5 rounded-2xl p-4 mb-8 text-left overflow-hidden">
                <p className="text-xs font-mono text-base-content/40 break-all">{errorDetails}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 py-4 px-6 bg-primary text-primary-content rounded-2xl font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 py-4 px-6 bg-base-100 border-2 border-base-content/5 text-base-content/60 rounded-2xl font-bold text-sm hover:bg-base-content/5 transition-all text-base-content"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
