import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-2">Terjadi kesalahan pada aplikasi</h2>
            <p className="text-sm text-muted-foreground mb-4">Maaf, ada masalah saat memuat aplikasi. Silakan refresh atau hubungi admin.</p>
            <pre className="text-xs bg-muted p-3 rounded text-left overflow-auto">{String(this.state.error)}</pre>
            <div className="mt-4">
              <button onClick={() => location.reload()} className="px-4 py-2 bg-primary text-white rounded">Muat Ulang</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
