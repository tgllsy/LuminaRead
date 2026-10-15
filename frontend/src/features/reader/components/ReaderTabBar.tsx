import React from 'react'
import { X } from 'lucide-react'
import type { BookSummary } from '../types'

interface ReaderTabBarProps {
  openTabBooks: BookSummary[]
  activeBookId: string
  onSwitchBookTab: (bookId: string) => void
  onCloseBookTab: (bookId: string) => void
}

export const ReaderTabBar: React.FC<ReaderTabBarProps> = ({
  openTabBooks,
  activeBookId,
  onSwitchBookTab,
  onCloseBookTab,
}) => {
  if (openTabBooks.length <= 1) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
      {openTabBooks.map((tb) => {
        const isActive = tb.id === activeBookId
        return (
          <div
            key={tb.id}
            className={`group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors shrink-0 ${
              isActive
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-current/5 hover:bg-current/10 opacity-75 hover:opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={() => onSwitchBookTab(tb.id)}
              className="truncate max-w-[130px] text-left"
              title={`切换至《${tb.title}》`}
            >
              {tb.title}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCloseBookTab(tb.id)
              }}
              className={`p-0.5 rounded-full hover:bg-black/15 transition-opacity ${
                isActive ? 'opacity-80 hover:opacity-100' : 'opacity-40 group-hover:opacity-80'
              }`}
              title="关闭标签"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
