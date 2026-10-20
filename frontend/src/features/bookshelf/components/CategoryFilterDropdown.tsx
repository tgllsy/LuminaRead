import React, { useState, useRef, useEffect } from 'react'
import { Tag, ChevronDown, Check, X } from 'lucide-react'

interface CategoryFilterDropdownProps {
  categories: string[]
  activeCategory: string
  onSelectCategory: (category: string) => void
}

export const CategoryFilterDropdown: React.FC<CategoryFilterDropdownProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (categories.length === 0) return null

  const isFiltered = activeCategory !== 'all'
  const displayLabel = isFiltered ? activeCategory : '全部分类'

  return (
    <div className="relative shrink-0 select-none" ref={dropdownRef}>
      <div className="inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
            isFiltered
              ? 'bg-[#1b88ee]/10 border-[#1b88ee]/40 text-[#1b88ee] shadow-2xs'
              : 'bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
          title="按分类细分筛选"
        >
          <Tag className="w-3 h-3 shrink-0 opacity-70" />
          <span className="max-w-[80px] sm:max-w-[110px] truncate">{displayLabel}</span>
          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectCategory('all')
            }}
            title="清除分类筛选"
            className="ml-1 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-52 sm:w-56 max-h-72 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl ring-1 ring-black/5 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            书籍标签分类
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectCategory('all')
              setIsOpen(false)
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left cursor-pointer transition-colors ${
              activeCategory === 'all'
                ? 'bg-[#1b88ee]/10 text-[#1b88ee] font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>全部分类</span>
            {activeCategory === 'all' && <Check className="w-3.5 h-3.5 text-[#1b88ee]" />}
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onSelectCategory(cat)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#1b88ee]/10 text-[#1b88ee] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate pr-2">{cat}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#1b88ee] shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
