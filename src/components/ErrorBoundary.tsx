import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { getFriendlyNetworkErrorMessage, isRateLimitError } from '../utils/networkGuard';

interface ErrorBoundaryState {
  hasError: boolean;
  isRateLimit: boolean;
  friendlyMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      isRateLimit: false,
      friendlyMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const rateLimited = isRateLimitError(error);
    return {
      hasError: true,
      isRateLimit: rateLimited,
      friendlyMessage: getFriendlyNetworkErrorMessage(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SantaMaze ErrorBoundary] Caught runtime error:', {
      message: error?.message,
      name: error?.name,
      componentStack: errorInfo?.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      isRateLimit: false,
      friendlyMessage: '',
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="w-full h-full flex items-center justify-center p-6 bg-slate-100 dark:bg-[#091224] text-slate-900 dark:text-slate-100"
      >
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1933] border border-amber-500/40 dark:border-amber-300/35 p-6 shadow-2xl text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-600 dark:text-amber-300">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">
            {this.state.isRateLimit ? 'Taking a Quick Holiday Breather' : 'Sleigh Hiccup Detected'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {this.state.friendlyMessage}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your saved progress, coins, and unlocked levels are safe.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm cursor-pointer shadow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#16284d] dark:hover:bg-[#1e3566] border border-slate-300 dark:border-slate-500/40 text-xs font-bold cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
