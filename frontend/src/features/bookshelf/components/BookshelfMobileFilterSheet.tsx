import React from 'react'
import { LayoutGrid, List, Upload, Compass, Tag, Layers, Check } from 'lucide-react'
import type { BookshelfViewMode } from '../types'
import { BottomSheet } from '../../../shared/ui'

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'reading', label: '在读' },
  { key: 'unread', label: '未读' },
  { key: 'finished', label: '已读完' },
]

const VARIANT_TABS: Array<{ key: 'original' | 'simplified' | 'traditional'; label: string }> = [
  { key: 'original', label: '原书字形' },
  { key: 'simplified', label: '简体' },
  { key: 'traditional', label: '繁体' },
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
  onSelectVariant?: (variant: 'original' | 'simplified' | 'traditional') => void
  onTriggerUpload?: () => void
  onOpenDiscovery?: () => void
}

export const BookshelfMobileFilterSheet: React.FC<BookshelfMobileFilterSheetProps> = ({
  isOpen,
  onClose,
  statusFilter,
  onStatusFilterChange,
  categories,
  activeCategory,
  onSelectCategory,
  viewMode,
  onViewModeChange,
  chineseVariant = 'original',
  onToggleVariant,
  onSelectVariant,
  onTriggerUpload,
  onOpenDiscovery,
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="书架视图与筛选"
      subtitle="调整阅读状态、分类过滤与界面排版"
      contentClassName="px-5 py-4 space-y-5"
    >
      {/* 1. 阅读状态筛选 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#1b88ee]" />
            <span>阅读状态</span>
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusFilterChange(tab.key)}
                className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-center active:scale-[0.97] ${
                  active
                    ? 'bg-[#1b88ee] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. 分类标签细分筛选 */}
      {categories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>分类细分</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">共 {categories.length} 个分类</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {['all', ...categories].map((cat) => {
              const isSelected = activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1 active:scale-[0.97] border ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <span>{cat === 'all' ? '全部分类' : cat}</span>
                  {isSelected && <Check className="w-3 h-3 text-sky-400 stroke-[2.5]" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. 视图展示模式 & 繁简转换 */}
      <div className="space-y-3 pt-1 border-t border-slate-100">
        <div>
          <span className="text-xs font-bold text-slate-700 block mb-2">视图模式与书名转字</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-[0.97] ${
                viewMode === 'grid'
                  ? 'bg-blue-50/90 border-[#1b88ee] text-[#1b88ee] shadow-2xs'
                  : 'bg-white border-slate-200/90 text-slate-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>网格卡片</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-[0.97] ${
                viewMode === 'list'
                  ? 'bg-blue-50/90 border-[#1b88ee] text-[#1b88ee] shadow-2xs'
                  : 'bg-white border-slate-200/90 text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
              <span>精简列表</span>
            </button>
          </div>
        </div>

        {/* 繁简字形选择 */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70">
          {VARIANT_TABS.map((v) => {
            const isMatch = chineseVariant === v.key
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  if (onSelectVariant) {
                    onSelectVariant(v.key)
                  } else {
                    onToggleVariant()
                  }
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center active:scale-[0.97] ${
                  isMatch
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. 底部快捷操作 */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5">
        {onTriggerUpload && (
          <button
            type="button"
            onClick={() => {
              onClose()
              onTriggerUpload()
            }}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-50 text-[#1b88ee] border border-blue-200/60 text-xs font-bold cursor-pointer transition-all active:scale-[0.97] shadow-2xs hover:bg-blue-100/70"
          >
            <Upload className="w-4 h-4" />
            <span>导入本地书籍</span>
          </button>
        )}
        {onOpenDiscovery && (
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenDiscovery()
            }}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer transition-all active:scale-[0.97] shadow-xs hover:bg-slate-800"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span>全网搜书源</span>
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
