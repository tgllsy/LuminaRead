import React from 'react'
import { Search, Database, X } from 'lucide-react'
import { QUICK_KEYWORDS } from '../constants'
import type { FullTextSearchResponse } from '../types'

interface SearchHeaderProps {
  asPage: boolean
  query: string
  onQueryChange: (val: string) => void
  onExecuteSearch: (q: string) => void
  onClose: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  result: FullTextSearchResponse | null
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  asPage,
  query,
  onQueryChange,
  onExecuteSearch,
  onClose,
  inputRef,
  result,
}) => {
  return (
    <div
      className={
        asPage
          ? 'p-5 sm:p-7 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs space-y-4'
          : 'p-4 sm:px-6 bg-white border-b border-slate-200/80 space-y-3.5 shrink-0'
      }
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1b88ee]/10 text-[#1b88ee] flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 leading-snug">
              全库检索
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
              检索章节正文、划线摘录与想法
            </p>
          </div>
        </div>
        {asPage ? (
          <button
            onClick={onClose}
            className="inline-flex px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 items-center gap-1.5 shrink-0 transition-colors"
          >
            <span className="sm:hidden">返回</span>
            <span className="hidden sm:inline">返回书架</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onExecuteSearch(query)
            }
          }}
          placeholder="输入关键词检索全库章节正文或笔记..."
          className="w-full pl-10 pr-24 py-2.5 sm:py-3 rounded-full bg-[#f2f3f5] border border-transparent focus:bg-white focus:border-[#1b88ee]/40 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none transition-all"
        />
        {result && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] text-[11px] font-mono">
            {result.elapsed_ms} ms
          </span>
        )}
      </div>

      {/* Quick tags & stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 shrink-0">热搜词：</span>
          {QUICK_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => {
                onQueryChange(kw)
                onExecuteSearch(kw)
              }}
              className={`px-2.5 py-0.5 rounded-full transition-colors shrink-0 ${
                query === kw
                  ? 'bg-[#1b88ee] text-white font-medium'
                  : 'bg-[#f2f3f5] text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {kw}
            </button>
          ))}
        </div>

        {result && (
          <div className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
            <Database className="w-3.5 h-3.5 text-[#1b88ee] shrink-0" />
            <span>
              命中 {result.books_matched} 本书 · 共 {result.total_matches} 处
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
