import React from 'react'
import { LayoutGrid, List, Upload, Compass } from 'lucide-react'
import type { BookshelfViewMode } from '../types'
import { BottomSheet } from '../../../shared/ui'

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'reading', label: '在读' },
  { key: 'unread', label: '未读' },
  { key: 'finished', label: '已读完' },
]

export interface BookshelfMobileFilterSheetProps {
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

export const BookshelfMobileFilterSheet: React.FC<BookshelfMobileFilterSheetProps> = ({
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
