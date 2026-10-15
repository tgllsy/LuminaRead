import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  onReset?: () => void
  name?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, errorInfo)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.state.error || new Error('Unknown Error'), this.reset)
        : this.props.fallback
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[240px] bg-red-50/50 rounded-2xl border border-red-100 my-4">
        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          {this.props.name ? `[${this.props.name}] 模块渲染异常` : '页面模块加载出现异常'}
        </h3>
        <p className="text-xs text-slate-500 max-w-md mb-4 break-words">
          {this.state.error?.message || '发生未知渲染错误，请重试'}
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重新加载模块
        </button>
      </div>
    )
  }
}
