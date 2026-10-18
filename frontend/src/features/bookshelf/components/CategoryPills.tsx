import React from 'react'

interface CategoryPillsProps {
  statusFilter: string
  totalBooksCount: number
  onStatusFilterChange: (status: string) => void
  categories: string[]
  activeCategory: string
  onSelectCategory: (category: string) => void
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  statusFilter,
  totalBooksCount,
  onStatusFilterChange,
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  const statusTabs = [
    { key: 'all', label: `全部 (${totalBooksCount})` },
    { key: 'reading', label: '在读' },
    { key: 'unread', label: '未读' },
    { key: 'finished', label: '已读完' },
  ]

  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-0.5 [-webkit-overflow-scrolling:touch] text-xs select-none">
      {/* Status Segmented Control */}
      <div className="flex items-center p-0.5 rounded-xl bg-slate-200/60 shrink-0 font-medium">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusFilterChange(tab.key)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
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

      {/* Subtle Separator */}
      {categories.length > 0 && (
        <div className="h-3.5 w-px bg-slate-300/80 shrink-0 hidden sm:block" />
      )}

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
              activeCategory === 'all'
                ? 'bg-[#1b88ee]/10 text-[#1b88ee] font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
          >
            全部分类
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                activeCategory === cat
                  ? 'bg-[#1b88ee]/10 text-[#1b88ee] font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

