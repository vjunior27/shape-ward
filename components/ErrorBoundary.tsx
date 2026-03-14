import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  message: string;
}

interface Props {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-surface border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-400" size={32} />
          </div>
          <h2 className="text-xl font-display font-bold text-white mb-2">
            Algo deu errado
          </h2>
          <p className="text-gray-400 text-sm mb-6 break-words">
            {this.state.message || "Erro inesperado na aplicação."}
          </p>
          <button
            onClick={this.handleReload}
            className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primaryDark transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
