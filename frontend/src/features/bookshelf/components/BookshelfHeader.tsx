import React from 'react'
import { Search, LayoutGrid, List, X } from 'lucide-react'
import type { BookshelfViewMode, ReadingLibrary } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'
import { LibraryTabBar } from './LibraryTabBar'
import { CategoryFilterDropdown } from './CategoryFilterDropdown'

interface BookshelfHeaderProps {
  libraries: ReadingLibrary[]
  activeLibraryId: string
  totalBooksCount: number
  onSelectLibrary: (libId: string) => void
  onOpenCreateModal: () => void
  onOpenEditModal: (e: React.MouseEvent, lib: ReadingLibrary) => void
  onDeleteLibrary: (e: React.MouseEvent, lib: ReadingLibrary) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  categories: string[]
  activeCategory: string
  onSelectCategory: (category: string) => void
  viewMode: BookshelfViewMode
  localFilterText: string
  onViewModeChange: (mode: BookshelfViewMode) => void
  onFilterTextChange: (text: string) => void
  onOpenGlobalSearch?: (query?: string) => void
}

export const BookshelfHeader: React.FC<BookshelfHeaderProps> = ({
  libraries,
  activeLibraryId,
  totalBooksCount,
  onSelectLibrary,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteLibrary,
  statusFilter,
  onStatusFilterChange,
  categories,
  activeCategory,
  onSelectCategory,
  viewMode,
  localFilterText,
  onViewModeChange,
  onFilterTextChange,
  onOpenGlobalSearch,
}) => {
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant)
  const toggleChineseVariant = useTypographyStore((s) => s.toggleChineseVariant)
  const isVariantActive = Boolean(chineseVariant && chineseVariant !== 'original')

  const statusTabs = [
    { key: 'all', label: `全部` },
    { key: 'reading', label: '在读' },
    { key: 'unread', label: '未读' },
    { key: 'finished', label: '已读完' },
  ]

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3 select-none">
      {/* Left: Library Tabs (主书库药丸切换) */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <LibraryTabBar
          libraries={libraries}
          activeLibraryId={activeLibraryId}
          totalBooksCount={totalBooksCount}
          onSelectLibrary={onSelectLibrary}
          onOpenCreateModal={onOpenCreateModal}
          onOpenEditModal={onOpenEditModal}
          onDeleteLibrary={onDeleteLibrary}
        />
      </div>

      {/* Right: Consolidated Toolset (状态分段 + 分类轻量下拉 + 搜索 + 繁简 + 视图) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
        {/* Status Segmented Control */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-200/60 shrink-0 text-xs font-medium">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusFilterChange(tab.key)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Category Lightweight Dropdown */}
        <CategoryFilterDropdown
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
        />

        {/* Instant Search Filter */}
        <div className="relative w-32 sm:w-40 lg:w-44 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0 pointer-events-none" />
          <input
            type="text"
            value={localFilterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onOpenGlobalSearch) onOpenGlobalSearch(localFilterText)
            }}
            placeholder="过滤书名/作者..."
            className="w-full pl-7.5 pr-6 py-1 sm:py-1.5 text-xs rounded-xl bg-white border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] transition-all placeholder:text-slate-400"
          />
          {localFilterText && (
            <button
              type="button"
              onClick={() => onFilterTextChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Traditional/Simplified Toggle */}
        <button
          type="button"
          onClick={() => toggleChineseVariant()}
          title="繁简字体切换"
          className={`px-2 py-1 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-95 ${
            isVariantActive
              ? 'bg-[#1b88ee] border-[#1b88ee] text-white shadow-2xs'
              : 'bg-white border-slate-200/90 text-slate-600 hover:text-[#1b88ee] hover:border-[#1b88ee]/40'
          }`}
        >
          {chineseVariant === 'simplified' ? '简' : chineseVariant === 'traditional' ? '繁' : '繁⇄简'}
        </button>

        {/* View Mode Switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            title="网格视图"
            className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            title="列表视图"
            className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
