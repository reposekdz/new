import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component tree:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = () => {
    if (confirm("This will clear your local workspace cache. Are you sure?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            
            {/* Header */}
            <div className="bg-red-950/30 border-b border-red-900/30 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-red-900/20 rounded-full text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Critical System Failure</h2>
                <p className="text-xs text-red-300">The application encountered an unrecoverable error.</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-400 leading-relaxed">
                OmniGen has crashed. This is usually caused by a malformed file state or a rendering glitch. 
                You can try reloading the workspace.
              </p>

              {this.state.error && (
                <div className="bg-black/50 rounded-lg p-3 border border-zinc-800 overflow-x-auto">
                  <code className="text-[10px] font-mono text-red-300 block whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                  </code>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-zinc-950/50 border-t border-zinc-800 px-6 py-4 flex gap-3">
              <button 
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <RefreshCw size={14} /> Reload Workspace
              </button>
              <button 
                onClick={this.handleHardReset}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 border border-zinc-700 text-zinc-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                title="Clear Local Storage and Reset"
              >
                <Trash2 size={14} /> Reset
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;