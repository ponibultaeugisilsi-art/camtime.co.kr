import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage = error.message;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        displayMessage = `데이터 처리 중 권한 또는 연결 문제가 발생했습니다 (${parsed.operationType} · ${parsed.path ?? 'unknown'})`;
      }
    } catch {
      // Non-JSON error message
    }
    return { hasError: true, message: displayMessage };
  }

  componentDidCatch(error: Error) {
    console.error('Uncaught application error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#121110] text-[#1C1917] dark:text-[#F5F2EB] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#221F1C] border border-[#E5DEC9] dark:border-[#322E29] rounded-xl p-8">
            <p className="text-xs font-mono-tabular tracking-widest text-[#78716C] dark:text-[#8E867B] mb-2">
              ARCHIVE RECOVERY
            </p>
            <h1 className="font-editorial text-2xl font-semibold mb-3">
              일시적인 오류가 발생했습니다
            </h1>
            <p className="text-sm text-[#57534E] dark:text-[#B8B0A4] leading-relaxed mb-6">
              {this.state.message || '요청을 처리하는 과정에서 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium bg-[#1C1917] dark:bg-[#F5F2EB] text-[#FBF9F5] dark:text-[#121110] rounded-lg hover:bg-[#1E3A8A] dark:hover:bg-[#93B4FF] transition-colors cursor-pointer"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
