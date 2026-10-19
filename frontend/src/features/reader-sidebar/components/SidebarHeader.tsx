import React from 'react'
import {
  ListOrdered,
  Search,
  Highlighter,
  Bookmark,
  X,
  Pin,
  PinOff,
} from 'lucide-react'
import type { BookSummary, SidebarDrawerTab } from '../types'

interface SidebarHeaderProps {
  book: BookSummary
  tocCount: number
  highlightsCount: number
  bookmarksCount: number
  isPinned?: boolean
  canPin?: boolean
  onTogglePin?: () => void
  dockSide?: 'left' | 'right' | 'none'
  onToggleDockSide?: (side: 'left' | 'right' | 'none') => void
  onClose: () => void
  activeTab: SidebarDrawerTab
  onTabChange: (tab: 'toc' | 'search' | 'notes' | 'bookmarks') => void
  isDark: boolean
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  book,
  tocCount,
  highlightsCount,
  bookmarksCount,
  isPinned = false,
  canPin = false,
  onTogglePin,
  dockSide,
  onToggleDockSide,
  onClose,
  activeTab,
  onTabChange,
  isDark,
}) => {
  const tabs = [
    { id: 'toc' as const, label: '目录', icon: ListOrdered },
    { id: 'search' as const, label: '检索', icon: Search },
    {
      id: 'notes' as const,
      label: `笔记${highlightsCount > 0 ? ` (${highlightsCount})` : ''}`,
      icon: Highlighter,
    },
    {
      id: 'bookmarks' as const,
      label: `书签${bookmarksCount > 0 ? ` (${bookmarksCount})` : ''}`,
      icon: Bookmark,
    },
  ]

  const normalizedActiveTab = activeTab === 'highlights' ? 'notes' : activeTab
  const effectiveDock = dockSide ?? (isPinned ? 'right' : 'none')

  return (
    <div
      className={`px-5 pt-4 sm:pt-5 pb-3 border-b space-y-3.5 shrink-0 ${
        isDark ? 'bg-[#1c1c1e] border-white/8' : 'bg-white border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-12 rounded-md shrink-0 shadow-xs flex items-center justify-center text-[9px] text-white font-serif font-bold overflow-hidden relative"
            style={{ backgroundColor: book.cover_color || '#1b88ee' }}
          >
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{book.title.slice(0, 2)}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-[15px] font-bold truncate">
              {book.title}
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {book.author} · 共 {tocCount} 章 · {highlightsCount} 条笔记
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canPin && (
            <div className="hidden lg:flex items-center bg-current/5 rounded-full p-0.5 text-xs">
              <button
                type="button"
                onClick={() => (onToggleDockSide ? onToggleDockSide('left') : onTogglePin?.())}
                title={effectiveDock === 'left' ? '取消左侧订住，转为浮动' : '将目录固定在左侧常驻'}
                className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all ${
                  effectiveDock === 'left'
                    ? 'bg-[#1b88ee] text-white font-semibold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span className="text-[11px]">订左侧</span>
              </button>
              <button
                type="button"
                onClick={() => (onToggleDockSide ? onToggleDockSide('right') : onTogglePin?.())}
                title={effectiveDock === 'right' ? '取消右侧订住，转为浮动' : '将目录固定在右侧常驻'}
                className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all ${
                  effectiveDock === 'right'
                    ? 'bg-[#1b88ee] text-white font-semibold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span className="text-[11px]">订右侧</span>
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            title="关闭菜单"
            className={`p-1.5 rounded-full transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-4 gap-1 p-1 rounded-full ${
          isDark ? 'bg-[#2c2c2e]' : 'bg-[#f2f3f5]'
        }`}
      >
        {tabs.map((t) => {
          const Icon = t.icon
          const active = normalizedActiveTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`py-1.5 px-2 rounded-full text-xs flex items-center justify-center gap-1 transition-all ${
                active
                  ? isDark
                    ? 'bg-[#1c1c1e] text-[#1b88ee] font-semibold shadow-2xs'
                    : 'bg-white text-[#1b88ee] font-semibold shadow-2xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 font-medium'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
