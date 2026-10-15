import React from 'react'
import { Search, Compass, SlidersHorizontal, Library, X } from 'lucide-react'
import { SOURCE_TABS, FORMAT_FILTERS, LANG_FILTERS } from '../constants'

interface BookSearchHeaderProps {
  asPage?: boolean
  query: string
  sourceFilter: string
  formatFilter: string
  langFilter: string
  searching: boolean
  resultsCount: number
  onQueryChange: (q: string) => void
  onSourceChange: (source: string) => void
  onFormatChange: (format: string) => void
  onLangChange: (lang: string) => void
  onSubmitSearch: () => void
  onOpenSourceSettings: () => void
  onClose: () => void
}

export const BookSearchHeader: React.FC<BookSearchHeaderProps> = ({
  asPage,
  query,
  sourceFilter,
  formatFilter,
  langFilter,
  searching,
  resultsCount,
  onQueryChange,
  onSourceChange,
  onFormatChange,
  onLangChange,
  onSubmitSearch,
  onOpenSourceSettings,
  onClose,
}) => {
  return (
    <div
      className={
        asPage
          ? 'bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-8 shadow-2xs space-y-4 sm:space-y-5 min-w-0 max-w-full'
          : 'px-4 py-4 sm:px-7 sm:py-6 bg-white border-b border-slate-100 space-y-4 shrink-0 min-w-0 max-w-full'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-[#1b88ee]/10 text-[#1b88ee] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                找书 · 全网书源中心
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-[#1b88ee]/10 text-[#1b88ee] font-semibold truncate max-w-full">
                Z-Library · Anna&apos;s Archive · 公版书库
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate sm:whitespace-normal">
              检索书名、作者或 ISBN，一键下载入库并生成目录
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSourceSettings}
            className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1b88ee]" />
            <span>书源配置</span>
          </button>

          {asPage ? (
            <button
              onClick={onClose}
              className="hidden sm:inline-flex px-3.5 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Library className="w-3.5 h-3.5" />
              <span>返回书架</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmitSearch()
        }}
        className="flex gap-2 sm:gap-2.5 min-w-0"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="搜索书名、作者或 ISBN..."
            className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-[#f4f5f7] focus:bg-white rounded-full border border-transparent focus:border-[#1b88ee] text-xs sm:text-sm text-slate-800 focus:outline-none transition-all"
          />
        </div>
        <button
          type="submit"
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs shrink-0 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>搜索</span>
        </button>
      </form>

      <div className="space-y-3 pt-1 min-w-0">
        <div className="w-full min-w-0 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          <div className="flex items-center gap-1.5 pb-1 sm:pb-0 w-max">
            {SOURCE_TABS.map((tab) => {
              const active = sourceFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSourceChange(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1b88ee] text-white font-semibold shadow-2xs'
                      : 'bg-[#f4f5f7] text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center bg-[#f4f5f7] p-0.5 rounded-full overflow-x-auto max-w-full">
            {LANG_FILTERS.map((lng) => (
              <button
                key={lng.id}
                type="button"
                onClick={() => onLangChange(lng.id)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all shrink-0 cursor-pointer ${
                  langFilter === lng.id
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lng.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[#f4f5f7] p-0.5 rounded-full overflow-x-auto max-w-full">
            {FORMAT_FILTERS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onFormatChange(fmt)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono uppercase transition-all shrink-0 cursor-pointer ${
                  formatFilter === fmt
                    ? 'bg-white text-[#1b88ee] font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!searching && resultsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500 pt-1 border-t border-slate-100 min-w-0">
          <span className="truncate max-w-full">
            共实时检索到 <strong className="text-[#1b88ee] font-semibold">{resultsCount}</strong> 本匹配图书
            {query.trim() ? `（关键词：${query.trim()}）` : ''}
          </span>
          <span className="text-[11px] text-slate-400 shrink-0">
            按书名相关度与可读性排序
          </span>
        </div>
      )}
    </div>
  )
}
