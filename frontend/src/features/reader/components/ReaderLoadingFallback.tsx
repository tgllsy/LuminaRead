import React from 'react'
import type { BookSummary } from '../types'

interface ReaderLoadingFallbackProps {
  isHidden?: boolean
  fallbackBook?: BookSummary
  loadError: string | null
  onRetry: () => void
  onBackToShelf: () => void
}

export const ReaderLoadingFallback: React.FC<ReaderLoadingFallbackProps> = ({
  isHidden = false,
  fallbackBook,
  loadError,
  onRetry,
  onBackToShelf,
}) => {
  return (
    <div
      className={`${
        isHidden ? 'hidden' : 'min-h-screen flex flex-col items-center justify-center'
      } bg-slate-50 text-slate-600 text-sm p-6 text-center gap-4`}
    >
      <div className="font-semibold text-slate-800 text-base">
        {fallbackBook ? `正在打开《${fallbackBook.title}》...` : '正在加载书籍排版引擎...'}
      </div>
      {loadError && (
        <div className="space-y-3 max-w-sm">
          <p className="text-xs text-rose-600">{loadError}</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              重试加载
            </button>
            <button
              type="button"
              onClick={onBackToShelf}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
            >
              返回书架
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
