import React, { useState } from 'react'
import { Search, LayoutGrid, List, X, SlidersHorizontal, Upload, Compass } from 'lucide-react'
import type { BookshelfViewMode, ReadingLibrary } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'
import { BottomSheet } from '../../../shared/ui'
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
  onTriggerUpload?: () => void
  onOpenDiscovery?: () => void
}

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'reading', label: '在读' },
  { key: 'unread', label: '未读' },
  { key: 'finished', label: '已读完' },
]

interface MobileFilterSheetProps {
  isOpen: boolean
  onClose: () => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  categories: string[]
  activeCategory: string
  onSelectCategory: (category: string) => void
  viewMode: BookshelfViewMode
  onViewModeChange: (mode: BookshelfViewMode) => void
  chineseVariant?: string
  onToggleVariant: () => void
  onTriggerUpload?: () => void
  onOpenDiscovery?: () => void
}

const MobileViewAndActionsSection: React.FC<{
  viewMode: BookshelfViewMode
  onViewModeChange: (mode: BookshelfViewMode) => void
  chineseVariant?: string
  onToggleVariant: () => void
  onClose: () => void
  onTriggerUpload?: () => void
  onOpenDiscovery?: () => void
}> = ({ viewMode, onViewModeChange, chineseVariant, onToggleVariant, onClose, onTriggerUpload, onOpenDiscovery }) => (
  <>
    <div>
      <div className="text-xs font-bold text-slate-500 mb-2">视图与字形显示</div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button" onClick={() => onViewModeChange('grid')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
            viewMode === 'grid' ? 'bg-blue-50 border-[#1b88ee] text-[#1b88ee]' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> 网格视图
        </button>
        <button
          type="button" onClick={() => onViewModeChange('list')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
            viewMode === 'list' ? 'bg-blue-50 border-[#1b88ee] text-[#1b88ee]' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <List className="w-3.5 h-3.5" /> 列表视图
        </button>
        <button
          type="button" onClick={onToggleVariant}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
            chineseVariant && chineseVariant !== 'original' ? 'bg-[#1b88ee] border-[#1b88ee] text-white' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          {chineseVariant === 'simplified' ? '简体显示' : chineseVariant === 'traditional' ? '繁体显示' : '繁⇄简切换'}
        </button>
      </div>
    </div>

    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5">
      {onTriggerUpload && (
        <button
          type="button" onClick={() => { onClose(); onTriggerUpload() }}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-50 text-[#1b88ee] text-xs font-bold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
        >
          <Upload className="w-3.5 h-3.5" /> 导入本地书籍
        </button>
      )}
      {onOpenDiscovery && (
        <button
          type="button" onClick={() => { onClose(); onOpenDiscovery() }}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
        >
          <Compass className="w-3.5 h-3.5" /> 全网搜书源
        </button>
      )}
    </div>
  </>
)

const BookshelfMobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  isOpen, onClose, statusFilter, onStatusFilterChange, categories, activeCategory,
  onSelectCategory, viewMode, onViewModeChange, chineseVariant, onToggleVariant,
  onTriggerUpload, onOpenDiscovery,
}) => (
  <BottomSheet isOpen={isOpen} onClose={onClose} title="书架筛选与视图设置">
    <div className="space-y-4 pb-2">
      <div>
        <div className="text-xs font-bold text-slate-500 mb-2">阅读状态</div>
        <div className="grid grid-cols-4 gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key} type="button" onClick={() => onStatusFilterChange(tab.key)}
              className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
                statusFilter === tab.key ? 'bg-[#1b88ee] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2">分类标签</div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {['all', ...categories].map((cat) => (
              <button
                key={cat} type="button" onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
                  activeCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat === 'all' ? '全部分类' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <MobileViewAndActionsSection
        viewMode={viewMode} onViewModeChange={onViewModeChange}
        chineseVariant={chineseVariant} onToggleVariant={onToggleVariant}
        onClose={onClose} onTriggerUpload={onTriggerUpload} onOpenDiscovery={onOpenDiscovery}
      />
    </div>
  </BottomSheet>
)

const DesktopFilterControls: React.FC<{
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  categories: string[]
  activeCategory: string
  onSelectCategory: (category: string) => void
  viewMode: BookshelfViewMode
  onViewModeChange: (mode: BookshelfViewMode) => void
  chineseVariant?: string
  isVariantActive: boolean
  onToggleVariant: () => void
}> = ({
  statusFilter, onStatusFilterChange, categories, activeCategory,
  onSelectCategory, viewMode, onViewModeChange, chineseVariant, isVariantActive, onToggleVariant,
}) => (
  <>
    <div className="hidden md:flex items-center p-0.5 rounded-xl bg-slate-200/60 shrink-0 text-xs font-medium">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.key} type="button" onClick={() => onStatusFilterChange(tab.key)}
          className={`px-2.5 py-1 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer whitespace-nowrap active:scale-[0.97] ${
            statusFilter === tab.key ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>

    <div className="hidden md:block">
      <CategoryFilterDropdown categories={categories} activeCategory={activeCategory} onSelectCategory={onSelectCategory} />
    </div>

    <button
      type="button" onClick={onToggleVariant} title="繁简字体切换"
      className={`hidden md:inline-flex px-2 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shrink-0 active:scale-[0.97] ${
        isVariantActive ? 'bg-[#1b88ee] border-[#1b88ee] text-white shadow-2xs' : 'bg-white border-slate-200/90 text-slate-600 hover:text-[#1b88ee] hover:border-[#1b88ee]/40'
      }`}
    >
      {chineseVariant === 'simplified' ? '简' : chineseVariant === 'traditional' ? '繁' : '繁⇄简'}
    </button>

    <div className="hidden md:flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
      <button
        type="button" onClick={() => onViewModeChange('grid')} title="网格视图"
        className={`p-1.5 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
      <button
        type="button" onClick={() => onViewModeChange('list')} title="列表视图"
        className={`p-1.5 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <List className="w-3.5 h-3.5" />
      </button>
    </div>
  </>
)

export const BookshelfHeader: React.FC<BookshelfHeaderProps> = ({
  libraries, activeLibraryId, totalBooksCount, onSelectLibrary,
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
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-3 select-none">
      <div className="min-w-0 flex-1 overflow-hidden">
        <LibraryTabBar
          libraries={libraries} activeLibraryId={activeLibraryId} totalBooksCount={totalBooksCount}
          onSelectLibrary={onSelectLibrary} onOpenCreateModal={onOpenCreateModal}
          onOpenEditModal={onOpenEditModal} onDeleteLibrary={onDeleteLibrary}
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-between sm:justify-end">
        <div className="relative flex-1 md:flex-none md:w-40 lg:w-44 min-w-0 md:order-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0 pointer-events-none" />
          <input
            type="text" value={localFilterText} onChange={(e) => onFilterTextChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && onOpenGlobalSearch) onOpenGlobalSearch(localFilterText) }}
            placeholder="过滤书名/作者 (回车全文搜)..."
            className="w-full pl-7.5 pr-6 py-1.5 text-xs rounded-xl bg-white/90 border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] transition-all placeholder:text-slate-400"
          />
          {localFilterText && (
            <button type="button" onClick={() => onFilterTextChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button" onClick={() => setMobileSheetOpen(true)}
          className={`md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shrink-0 active:scale-[0.97] ${
            hasActiveMobileFilter ? 'bg-blue-50 border-[#1b88ee]/40 text-[#1b88ee]' : 'bg-white/90 border-slate-200/90 text-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>筛选</span>
          {hasActiveMobileFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee]" />}
        </button>

        <DesktopFilterControls
          statusFilter={statusFilter} onStatusFilterChange={onStatusFilterChange}
          categories={categories} activeCategory={activeCategory} onSelectCategory={onSelectCategory}
          viewMode={viewMode} onViewModeChange={onViewModeChange}
          chineseVariant={chineseVariant} isVariantActive={isVariantActive} onToggleVariant={() => toggleChineseVariant()}
        />
      </div>

      <BookshelfMobileFilterSheet
        isOpen={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)}
        statusFilter={statusFilter} onStatusFilterChange={onStatusFilterChange}
        categories={categories} activeCategory={activeCategory} onSelectCategory={onSelectCategory}
        viewMode={viewMode} onViewModeChange={onViewModeChange}
        chineseVariant={chineseVariant} onToggleVariant={toggleChineseVariant}
        onTriggerUpload={onTriggerUpload} onOpenDiscovery={onOpenDiscovery}
      />
    </div>
  )
}
