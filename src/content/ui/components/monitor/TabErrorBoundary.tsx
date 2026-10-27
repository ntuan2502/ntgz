import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  fallbackName?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[TabErrorBoundary] Lỗi render ở tab ${this.props.fallbackName || 'này'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center m-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 shadow-2xs">
          <AlertTriangle className="h-8 w-8 text-rose-600 mb-2" />
          <h4 className="text-xs font-bold text-rose-900">
            Có lỗi hiển thị ở tab {this.props.fallbackName || 'này'}
          </h4>
          <p className="text-[11px] text-rose-700 mt-1 max-w-sm">
            {this.state.error?.message || 'Dữ liệu từ game chưa khớp hoặc đang đồng bộ.'}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={this.handleReset}
            className="mt-3 h-7 px-3 text-xs bg-white text-rose-800 border-rose-300 hover:bg-rose-100/60 rounded-lg gap-1.5 cursor-pointer font-medium"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Thử tải lại tab</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
