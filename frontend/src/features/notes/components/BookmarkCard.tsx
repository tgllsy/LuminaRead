import React from 'react'
import { Bookmark, ArrowUpRight, Trash2 } from 'lucide-react'
import type { BookmarkItem, JumpTarget } from '../types'

interface BookmarkCardProps {
  item: BookmarkItem
  onOpenBook: (target: JumpTarget) => void
  onDelete: (bmId: string, bookId: string) => Promise<void>
  onSelectBook: (bookId: string) => void
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  item,
  onOpenBook,
  onDelete,
  onSelectBook,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-600" />
          <button
            type="button"
            onClick={() => onSelectBook(item.book_id)}
            className="font-bold text-slate-800 hover:text-[#1b88ee] transition-colors cursor-pointer"
          >
            《{item.book_title || '馆藏图书'}》
          </button>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{item.chapter_title}</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {(item.created_at || '').slice(0, 16).replace('T', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-500 font-mono">
          进度: 第 {item.chapter_index + 1} 章
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('确定删除此书签吗？')) {
                onDelete(item.id, item.book_id)
              }
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="删除书签"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenBook({
                bookId: item.book_id,
                chapterIndex: item.chapter_index,
              })
            }
            className="inline-flex items-center gap-1 text-xs text-[#1b88ee] font-medium hover:underline cursor-pointer"
          >
            <span>直达阅读</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
