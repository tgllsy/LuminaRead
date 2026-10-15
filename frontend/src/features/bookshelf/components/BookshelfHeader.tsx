import React from 'react'
import {
  Search,
  Upload,
  LayoutGrid,
  List,
  Compass,
  BarChart3,
  X,
} from 'lucide-react'
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
  onOpenDiscovery: () => void
  onOpenSourceSettings?: () => void
  onOpenStats: () => void
  onOpenGlobalSearch?: (query?: string) => void
}

const StatusFilterTabs: React.FC<{
  totalBooksCount: number
  statusFilter: string
  onStatusFilterChange: (status: string) => void
}> = ({ totalBooksCount, statusFilter, onStatusFilterChange }) => (
  <div className="grid grid-cols-4 sm:flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-200/60 backdrop-blur-xs w-full sm:w-fit">
    {[
      { key: 'all', label: `全部 (${totalBooksCount})` },
      { key: 'reading', label: '在读' },
      { key: 'unread', label: '未读' },
      { key: 'finished', label: '读完' },
    ].map((tab) => (
      <button
        key={tab.key}
        type="button"
        onClick={() => onStatusFilterChange(tab.key)}
        className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer truncate ${
          statusFilter === tab.key
            ? 'bg-white text-slate-800 shadow-2xs font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

export const BookshelfHeader: React.FC<BookshelfHeaderProps> = ({
  totalBooksCount,
  statusFilter,
  viewMode,
  localFilterText,
  onStatusFilterChange,
  onViewModeChange,
  onFilterTextChange,
  onTriggerUpload,
  onOpenDiscovery,
  onOpenStats,
  onOpenGlobalSearch,
}) => {
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant)
  const toggleChineseVariant = useTypographyStore((s) => s.toggleChineseVariant)
  const isVariantActive = Boolean(chineseVariant && chineseVariant !== 'original')

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 mb-3.5 sm:mb-5">
      <StatusFilterTabs
        totalBooksCount={totalBooksCount}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex-1 sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
          <input
            type="text"
            value={localFilterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onOpenGlobalSearch) onOpenGlobalSearch(localFilterText)
            }}
            placeholder="搜索书名、作者、标签..."
            className="w-full pl-8 sm:pl-8.5 pr-7 sm:pr-8 py-2 sm:py-1.5 text-xs rounded-xl bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] transition-all placeholder:truncate"
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

        <button
          type="button"
          onClick={() => toggleChineseVariant()}
          title="繁体书与简体书籍互换（点击把繁体转换成中文简体或切换繁体）"
          className={`inline-flex items-center gap-1 px-2.5 py-2 sm:py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            isVariantActive
              ? 'bg-[#1b88ee] border-[#1b88ee] text-white shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 hover:text-[#1b88ee] hover:border-[#1b88ee]/40 hover:bg-blue-50/40'
          }`}
        >
          <span>
            {chineseVariant === 'simplified' ? '简·已转简体' : chineseVariant === 'traditional' ? '繁·已转繁体' : '繁⇄简'}
          </span>
        </button>

        <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 border border-slate-200/40 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            title="网格视图"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            title="列表视图"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onTriggerUpload}
          className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#1b88ee] hover:bg-[#1677d2] active:bg-[#1264b3] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导入书籍</span>
        </button>

        {onOpenGlobalSearch && (
          <button
            type="button"
            onClick={() => onOpenGlobalSearch(localFilterText)}
            title="全文秒搜（全库检索）"
            className="p-2 sm:p-1.5 rounded-xl bg-white border border-slate-200 text-[#1b88ee] hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStats}
          title="阅读记录与统计"
          className="p-2 sm:p-1.5 rounded-xl bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 active:bg-amber-100 transition-colors cursor-pointer shrink-0"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenDiscovery}
          title="全网搜书"
          className="hidden sm:inline-flex p-1.5 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

