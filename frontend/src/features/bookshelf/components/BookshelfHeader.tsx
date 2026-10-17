import React from 'react'
import { Search, Upload, LayoutGrid, List, X } from 'lucide-react'
import type { BookshelfViewMode } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'

interface BookshelfHeaderProps {
  totalBooksCount: number
  statusFilter: string
  viewMode: BookshelfViewMode
  localFilterText: string
  onStatusFilterChange: (status: string) => void
  onViewModeChange: (mode: BookshelfViewMode) => void
  onFilterTextChange: (text: string) => void
  onTriggerUpload: () => void
  onOpenDiscovery?: () => void
  onOpenSourceSettings?: () => void
  onOpenStats?: () => void
  onOpenGlobalSearch?: (query?: string) => void
}

export const BookshelfHeader: React.FC<BookshelfHeaderProps> = ({
  totalBooksCount,
  statusFilter,
  viewMode,
  localFilterText,
  onStatusFilterChange,
  onViewModeChange,
  onFilterTextChange,
  onTriggerUpload,
  onOpenGlobalSearch,
}) => {
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant)
  const toggleChineseVariant = useTypographyStore((s) => s.toggleChineseVariant)
  const isVariantActive = Boolean(chineseVariant && chineseVariant !== 'original')

  const statusTabs = [
    { key: 'all', label: `全部 (${totalBooksCount})` },
    { key: 'reading', label: '在读' },
    { key: 'unread', label: '未读' },
    { key: 'finished', label: '已读完' },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 select-none">
      {/* Quick Status Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Right Controls: Search, Traditional/Simplified Toggle, View Switch, Upload */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-52">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input
            type="text"
            value={localFilterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onOpenGlobalSearch) onOpenGlobalSearch(localFilterText)
            }}
            placeholder="过滤书名/作者..."
            className="w-full pl-8.5 pr-7 py-1.5 text-xs rounded-xl bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] transition-all placeholder:truncate"
          />
          {localFilterText && (
            <button
              type="button"
              onClick={() => onFilterTextChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Traditional/Simplified Toggle */}
        <button
          type="button"
          onClick={() => toggleChineseVariant()}
          title="繁简转换开关"
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            isVariantActive
              ? 'bg-[#1b88ee] border-[#1b88ee] text-white shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 hover:text-[#1b88ee] hover:border-[#1b88ee]/40'
          }`}
        >
          {chineseVariant === 'simplified' ? '简' : chineseVariant === 'traditional' ? '繁' : '繁⇄简'}
        </button>

        {/* Grid / List Switch */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            title="网格视图"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            title="列表视图"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upload CTA */}
        <button
          type="button"
          onClick={onTriggerUpload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b88ee] hover:bg-[#1575ce] active:bg-[#1264b3] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导入</span>
        </button>
      </div>
    </div>
  )
}
