import React, { useState } from 'react'
import { Search, LayoutGrid, List, X, SlidersHorizontal } from 'lucide-react'
import type { BookshelfViewMode, ReadingLibrary } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'
import { LibraryTabBar } from './LibraryTabBar'
import { CategoryFilterDropdown } from './CategoryFilterDropdown'
import { BookshelfMobileFilterSheet } from './BookshelfMobileFilterSheet'

interface BookshelfHeaderProps {
  libraries: ReadingLibrary[]
  activeLibraryId: string
  totalBooksCount: number
  filteredCount?: number
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
  onTriggerUpload?: () => void
  onOpenDiscovery?: () => void
}

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'reading', label: '在读' },
  { key: 'unread', label: '未读' },
  { key: 'finished', label: '已读完' },
]

export const BookshelfHeader: React.FC<BookshelfHeaderProps> = ({
  libraries, activeLibraryId, totalBooksCount, filteredCount, onSelectLibrary,
  onOpenCreateModal, onOpenEditModal, onDeleteLibrary,
  statusFilter, onStatusFilterChange, categories, activeCategory, onSelectCategory,
  viewMode, localFilterText, onViewModeChange, onFilterTextChange,
  onOpenGlobalSearch, onTriggerUpload, onOpenDiscovery,
}) => {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant)
  const toggleChineseVariant = useTypographyStore((s) => s.toggleChineseVariant)
  const isVariantActive = Boolean(chineseVariant && chineseVariant !== 'original')
  const hasActiveMobileFilter = statusFilter !== 'all' || activeCategory !== 'all' || isVariantActive

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 select-none">
      {/* Tier 1: 藏书馆库切换 + 宽幅书架本地搜索栏（移动端分上下两层避免挤压截断） */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3 min-w-0">
        <div className="min-w-0 w-full md:flex-1 overflow-hidden">
          <LibraryTabBar
            libraries={libraries} activeLibraryId={activeLibraryId} totalBooksCount={totalBooksCount}
            onSelectLibrary={onSelectLibrary} onOpenCreateModal={onOpenCreateModal}
            onOpenEditModal={onOpenEditModal} onDeleteLibrary={onDeleteLibrary}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:flex-initial md:w-72 lg:w-80 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={localFilterText}
              onChange={(e) => onFilterTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onOpenGlobalSearch) onOpenGlobalSearch(localFilterText)
              }}
              placeholder="过滤书名 / 作者..."
              className="w-full pl-8.5 pr-7 py-1.5 sm:py-2 text-xs rounded-xl bg-white/95 border border-slate-200/90 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] transition-all placeholder:text-slate-400"
            />
            {localFilterText && (
              <button
                type="button"
                onClick={() => onFilterTextChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="清空输入"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className={`md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shrink-0 active:scale-[0.97] ${
              hasActiveMobileFilter ? 'bg-blue-50 border-[#1b88ee]/40 text-[#1b88ee]' : 'bg-white/95 border-slate-200/90 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>筛选</span>
            {hasActiveMobileFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee]" />}
          </button>
        </div>
      </div>

      {/* Tier 2: 细分筛选、分类标签、统计指示与视图工具栏 (大屏专属第二层，呼吸感充裕) */}
      <div className="hidden md:flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-200/60 shrink-0 font-medium">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusFilterChange(tab.key)}
                className={`px-3 py-1 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer whitespace-nowrap active:scale-[0.97] ${
                  statusFilter === tab.key ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200/80 mx-0.5 shrink-0" />

          <CategoryFilterDropdown
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={onSelectCategory}
          />

          <span className="text-[11px] text-slate-400 font-medium pl-1 truncate">
            共 {totalBooksCount} 本书
            {filteredCount !== undefined && filteredCount !== totalBooksCount && (
              <span className="text-[#1b88ee] font-semibold ml-1">· 已筛选 {filteredCount} 本</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => toggleChineseVariant()}
            title="点击轮换书名简体/繁体字形"
            className={`px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shrink-0 active:scale-[0.97] ${
              isVariantActive
                ? 'bg-[#1b88ee] border-[#1b88ee] text-white shadow-2xs'
                : 'bg-white border-slate-200/90 text-slate-600 hover:text-[#1b88ee] hover:border-[#1b88ee]/40 shadow-2xs'
            }`}
          >
            {chineseVariant === 'simplified' ? '简' : chineseVariant === 'traditional' ? '繁' : '繁⇄简'}
          </button>

          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              title="网格视图"
              className={`p-1.5 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              title="列表视图"
              className={`p-1.5 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <BookshelfMobileFilterSheet
        isOpen={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        chineseVariant={chineseVariant}
        onToggleVariant={toggleChineseVariant}
        onTriggerUpload={onTriggerUpload}
        onOpenDiscovery={onOpenDiscovery}
      />
    </div>
  )
}
