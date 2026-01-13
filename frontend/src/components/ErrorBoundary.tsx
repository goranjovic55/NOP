/**
 * ErrorBoundary - Catches React errors and displays them for debugging
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cyber-black p-8 text-white font-mono">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl text-cyber-red mb-4">⚠ Something went wrong</h1>
            
            <div className="bg-cyber-darker border border-cyber-red/50 rounded p-4 mb-4">
              <h2 className="text-cyber-red font-bold mb-2">Error:</h2>
              <pre className="text-sm text-cyber-gray-light overflow-auto whitespace-pre-wrap">
                {this.state.error?.message}
              </pre>
            </div>

            <div className="bg-cyber-darker border border-cyber-gray rounded p-4 mb-4">
              <h2 className="text-cyber-purple font-bold mb-2">Stack Trace:</h2>
              <pre className="text-xs text-cyber-gray-light overflow-auto whitespace-pre-wrap max-h-64">
                {this.state.error?.stack}
              </pre>
            </div>

            {this.state.errorInfo && (
              <div className="bg-cyber-darker border border-cyber-gray rounded p-4">
                <h2 className="text-cyber-blue font-bold mb-2">Component Stack:</h2>
                <pre className="text-xs text-cyber-gray-light overflow-auto whitespace-pre-wrap max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-cyber-purple hover:bg-cyber-purple/80 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
