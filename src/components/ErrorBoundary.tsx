import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="panel panel-pad stack" style={{ maxWidth: 560 }}>
          <h2>Esta página teve um erro</h2>
          <p className="muted">Os teus dados estão guardados. Volta ao início ou recarrega a página.</p>
          <pre className="sub small" style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <div className="row">
            <button className="btn btn-primary" onClick={() => { window.location.hash = '/'; this.setState({ error: null }); }}>Voltar ao início</button>
            <button className="btn" onClick={() => window.location.reload()}>Recarregar</button>
          </div>
        </div>
      </div>
    );
  }
}
