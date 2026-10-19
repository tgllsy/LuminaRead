import React, { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, BookOpen } from 'lucide-react'
import type { BookSummary } from '../types'

interface ReaderLoadingFallbackProps {
  isHidden?: boolean
  fallbackBook?: BookSummary
  loadError: string | null
  onRetry: () => void
  onBackToShelf?: () => void
}

export const ReaderLoadingFallback: React.FC<ReaderLoadingFallbackProps> = ({
  isHidden = false,
  fallbackBook,
  loadError,
  onRetry,
  onBackToShelf,
}) => {
  const [showSoftTimeout, setShowSoftTimeout] = useState(false)

  useEffect(() => {
    if (loadError) return
    const timer = window.setTimeout(() => {
      setShowSoftTimeout(true)
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [loadError])

  if (isHidden) return null

  const bookTitle = fallbackBook?.title || '书籍正文'
  const bookAuthor = fallbackBook?.author || ''

  return (
    <div className="min-h-dvh w-full bg-[#f8fafc] text-slate-700 flex flex-col justify-between relative select-none overflow-hidden">
      {/* 顶部安全返回栏：任何时刻均可一键逃生返回书架 */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-between z-20">
        <button
          type="button"
          onClick={onBackToShelf}
          aria-label="返回书架"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs border border-slate-200/80 backdrop-blur-md transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回书架</span>
        </button>
        <span className="text-[11px] font-medium text-slate-400 tracking-wider">
          阅境 · 排版就绪中
        </span>
      </header>

      {/* 中心沉浸式呼吸装载区 */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="relative mb-6">
          {/* 呼吸微光背景 */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/10 via-sky-400/15 to-indigo-500/10 rounded-full blur-xl animate-pulse pointer-events-none" />
          <div className="relative w-16 h-16 rounded-2xl bg-white shadow-xl shadow-slate-200/60 border border-slate-100 flex items-center justify-center">
            {loadError ? (
              <AlertCircle className="w-8 h-8 text-rose-500 animate-in zoom-in-75 duration-300" />
            ) : (
              <BookOpen className="w-7 h-7 text-sky-600 animate-pulse" />
            )}
            {!loadError && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight line-clamp-2 px-4">
            {loadError ? '书籍内容装载异常' : `正在打开《${bookTitle}》`}
          </h2>
          {bookAuthor && !loadError && (
            <p className="text-xs text-slate-400 font-normal">
              {bookAuthor}
            </p>
          )}
          <p className="text-xs text-slate-500 font-medium">
            {loadError ? (
              <span className="text-rose-600 font-medium">{loadError}</span>
            ) : showSoftTimeout ? (
              <span className="text-amber-600 font-medium">网络响应稍慢，正在努力装载中...</span>
            ) : (
              '正在装载排版流与章节分词...'
            )}
          </p>
        </div>

        {/* 错误状态或软超时提示按钮 */}
        {(loadError || showSoftTimeout) && (
          <div className="mt-8 flex flex-wrap gap-2.5 justify-center items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md shadow-slate-900/10 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重试加载</span>
            </button>
            <button
              type="button"
              onClick={onBackToShelf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs active:scale-95 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回书架</span>
            </button>
          </div>
        )}
      </main>

      {/* 底部装饰文案 */}
      <footer className="w-full text-center pb-6 text-[11px] text-slate-400 font-mono tracking-wider">
        LuminaRead High-Speed Cache & Offline Engine
      </footer>
    </div>
  )
}
