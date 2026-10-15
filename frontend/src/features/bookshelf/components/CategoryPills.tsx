import React from 'react'

interface CategoryPillsProps {
  categories: string[]
  activeCategory: string
  onSelectCategory: (category: string) => void
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  if (categories.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-2.5 sm:mb-3.5 text-xs [-webkit-overflow-scrolling:touch]">
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.97] ${
          activeCategory === 'all'
            ? 'bg-[#1b88ee]/10 text-[#1b88ee] font-semibold'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
      >
        全部分类
      </button>

      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelectCategory(cat)}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.97] ${
            activeCategory === cat
              ? 'bg-[#1b88ee]/10 text-[#1b88ee] font-semibold'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
