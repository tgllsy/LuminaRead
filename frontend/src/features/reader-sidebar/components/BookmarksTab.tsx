import React from 'react'
import { Trash2 } from 'lucide-react'
import type { BookmarkItem } from '../types'

interface BookmarksTabProps {
  bookmarks: BookmarkItem[]
  onSelectChapter: (
    chapterIndex: number,
    scrollOffset?: number
  ) => void
  onDeleteBookmark: (id: string) => void
  onCloseIfOverlay: () => void
  isDark: boolean
}

export const BookmarksTab: React.FC<BookmarksTabProps> = ({
  bookmarks,
  onSelectChapter,
  onDeleteBookmark,
  onCloseIfOverlay,
  isDark,
}) => {
  const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : []

  return (
    <div
      className={`flex-1 overflow-y-auto p-4 space-y-2.5 ${
        isDark ? 'bg-[#141416]' : 'bg-[#f7f8fa]'
      }`}
    >
      {safeBookmarks.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          暂无书签，点击阅读器顶栏「书签」按钮即可记录当前位置
        </div>
      ) : (
        safeBookmarks.map((bm) => (
          <div
            key={bm.id}
            onClick={() => {
              onSelectChapter(
                bm.chapter_index,
                bm.scroll_offset && bm.scroll_offset > 0
                  ? bm.scroll_offset
                  : undefined
              )
              onCloseIfOverlay()
            }}
            className={`p-3.5 rounded-2xl border hover:border-[#1b88ee]/60 cursor-pointer flex items-start justify-between gap-3 transition-colors ${
              isDark
                ? 'bg-[#1c1c1e] border-white/8'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold truncate">
                {bm.chapter_title}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 font-serif">
                {bm.snippet}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteBookmark(bm.id)
              }}
              className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
