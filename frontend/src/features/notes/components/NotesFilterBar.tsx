import React, { useState } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import type { NotesSubTab, BookSummary, HighlightItem, AIConversationItem } from '../types'
import { COLOR_META, STYLE_LABELS, AI_MODE_META } from '../constants'

interface NotesFilterBarProps {
  activeSubTab: NotesSubTab
  selectedBookId: string
  searchQuery: string
  colorFilter?: string
  styleFilter?: string
  aiModeFilter?: string
  books: BookSummary[]
  onSelectSubTab: (tab: NotesSubTab) => void
  onSelectBookId: (bookId: string) => void
  onSearchChange: (query: string) => void
  onColorFilterChange?: (color: string) => void
  onStyleFilterChange?: (style: string) => void
  onAiModeFilterChange?: (mode: string) => void
}

export const NotesFilterBar: React.FC<NotesFilterBarProps> = ({
  activeSubTab, selectedBookId, searchQuery,
  colorFilter = 'all', styleFilter = 'all', aiModeFilter = 'all',
  books, onSelectSubTab, onSelectBookId, onSearchChange,
  onColorFilterChange, onStyleFilterChange, onAiModeFilterChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const tabs: Array<{ key: NotesSubTab; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'notes', label: '随想' },
    { key: 'highlights', label: '划线' },
    { key: 'ai', label: 'AI 问答' },
    { key: 'bookmarks', label: '书签' },
  ]
  const showHighlightFilters = activeSubTab === 'all' || activeSubTab === 'notes' || activeSubTab === 'highlights'
  const showAiFilters = activeSubTab === 'all' || activeSubTab === 'ai'
  const hasActiveAdvanced = colorFilter !== 'all' || styleFilter !== 'all' || aiModeFilter !== 'all'

  return (
    <div className="space-y-2.5 mb-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="grid grid-cols-5 sm:flex items-center gap-1 p-1 rounded-xl bg-slate-200/60 w-full sm:w-fit overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key} type="button" onClick={() => onSelectSubTab(tab.key)}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.key ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBookId} onChange={(e) => onSelectBookId(e.target.value)}
            className="pl-2.5 pr-6 py-1.5 text-xs rounded-xl bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 text-slate-700 max-w-[130px] sm:max-w-[160px] truncate"
          >
            <option value="all">全馆藏书</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索笔记或摘录..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button" onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(showHighlightFilters || showAiFilters) && (
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className={`p-1.5 rounded-xl border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                showAdvanced || hasActiveAdvanced
                  ? 'bg-blue-50 border-blue-200 text-[#1b88ee] font-semibold'
                  : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50'
              }`}
              title="展开高级筛选"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">筛选</span>
              {hasActiveAdvanced && <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee]" />}
            </button>
          )}
        </div>
      </div>

      {(showAdvanced || hasActiveAdvanced) && (showHighlightFilters || showAiFilters) && (
        <SecondaryFiltersRow
          showHighlightFilters={showHighlightFilters} showAiFilters={showAiFilters}
          colorFilter={colorFilter} styleFilter={styleFilter} aiModeFilter={aiModeFilter}
          onColorFilterChange={onColorFilterChange} onStyleFilterChange={onStyleFilterChange} onAiModeFilterChange={onAiModeFilterChange}
        />
      )}
    </div>
  )
}

const SecondaryFiltersRow: React.FC<{
  showHighlightFilters: boolean
  showAiFilters: boolean
  colorFilter: string
  styleFilter: string
  aiModeFilter: string
  onColorFilterChange?: (color: string) => void
  onStyleFilterChange?: (style: string) => void
  onAiModeFilterChange?: (mode: string) => void
}> = ({
  showHighlightFilters, showAiFilters, colorFilter, styleFilter, aiModeFilter,
  onColorFilterChange, onStyleFilterChange, onAiModeFilterChange,
}) => (
  <div className="flex flex-wrap items-center gap-3 text-xs">
    {showHighlightFilters && onColorFilterChange && (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onColorFilterChange('all')}
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer ${
            colorFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          全部颜色
        </button>
        {(Object.keys(COLOR_META) as Array<HighlightItem['color']>).map((cKey) => (
          <button
            key={cKey}
            type="button"
            onClick={() => onColorFilterChange(colorFilter === cKey ? 'all' : cKey)}
            title={COLOR_META[cKey].label}
            className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${COLOR_META[cKey].dot} ${
              colorFilter === cKey ? 'ring-2 ring-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
            }`}
          />
        ))}
      </div>
    )}

    {showHighlightFilters && onStyleFilterChange && (
      <select
        value={styleFilter}
        onChange={(e) => onStyleFilterChange(e.target.value)}
        className="px-2.5 py-1 text-[11px] rounded-lg bg-white border border-slate-200/80 text-slate-600"
      >
        <option value="all">全部线型</option>
        {(Object.keys(STYLE_LABELS) as Array<HighlightItem['style_type']>).map((sKey) => (
          <option key={sKey} value={sKey}>
            {STYLE_LABELS[sKey]}
          </option>
        ))}
      </select>
    )}

    {showAiFilters && onAiModeFilterChange && (
      <select
        value={aiModeFilter}
        onChange={(e) => onAiModeFilterChange(e.target.value)}
        className="px-2.5 py-1 text-[11px] rounded-lg bg-white border border-slate-200/80 text-slate-600"
      >
        <option value="all">全部 AI 模式</option>
        {(Object.keys(AI_MODE_META) as Array<AIConversationItem['mode']>).map((mKey) => (
          <option key={mKey} value={mKey}>
            {AI_MODE_META[mKey].shortLabel}
          </option>
        ))}
      </select>
    )}
  </div>
)
