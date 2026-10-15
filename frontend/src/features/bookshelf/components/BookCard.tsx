import React from 'react'
import {
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  Trash2,
  X,
} from 'lucide-react'
import type { BookSummary, JumpTarget } from '../types'
import { prefetchBook } from '../../../utils/bookCache'

interface BookCardProps {
  book: BookSummary
  isOpenTab?: boolean
  onOpenBook: (target: JumpTarget) => void
  onOpenOrganize: (e: React.MouseEvent, book: BookSummary) => void
  onDeleteBook: (e: React.MouseEvent, bookId: string, title: string, skipConfirm?: boolean) => void
}

export const BookCard: React.FC<BookCardProps> = ({
  book, onOpenBook, onOpenOrganize, onDeleteBook,
}) => {
  const pct = Math.round(book.progress?.percentage || 0)
  const isImporting = book.status === 'importing'
  const isError = book.status === 'error' || (book.status as string) === 'failed'
  const importPct = Math.min(99, Math.max(2, Math.round(book.import_progress ?? 5)))
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePointerEnter = () => {
    if (isImporting || isError) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      prefetchBook(book.id, book.progress?.chapter_index).catch(() => {})
    }, 200)
  }

  const handlePointerLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  const handleClick = () => {
    handlePointerLeave()
    if (isImporting || isError) return
    onOpenBook({
      bookId: book.id,
      chapterIndex: book.progress?.chapter_index,
      paragraphIndex: typeof book.progress?.scroll_offset === 'number' ? Math.floor(book.progress.scroll_offset) : undefined,
    })
  }

  return (
    <div
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`group flex flex-col active:scale-[0.98] transition-transform ${isImporting ? 'cursor-wait' : isError ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div
        className={`aspect-[3/4] w-full rounded-lg sm:rounded-xl p-3 text-white flex flex-col justify-between shadow-[0_6px_18px_rgba(15,23,42,0.10)] transition-all duration-200 select-none relative overflow-hidden ${
          isError
            ? 'ring-2 ring-rose-500/90 shadow-rose-500/15'
            : isImporting
            ? 'ring-2 ring-[#1b88ee]/80 shadow-blue-500/15'
            : 'group-hover:shadow-[0_12px_26px_rgba(15,23,42,0.16)] group-hover:-translate-y-1'
        }`}
        style={{ backgroundColor: book.cover_color || '#1e3a8a' }}
      >
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt={book.title}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
          />
        )}
        <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/25 via-white/10 to-transparent z-20 pointer-events-none" />

        <BookCardOverlays
          book={book} isImporting={isImporting} isError={isError} importPct={importPct}
          onOpenOrganize={onOpenOrganize} onDeleteBook={onDeleteBook}
        />

        <div className="flex items-center justify-between text-[9px] font-mono opacity-75">
          <span className="uppercase">{book.format}</span>
        </div>
        <div className="font-serif font-bold text-xs sm:text-sm leading-snug line-clamp-3 my-auto">{book.title}</div>
        <div className="text-[10px] opacity-80 truncate">{book.author}</div>
      </div>

      <div className="mt-2.5 space-y-0.5 px-0.5">
        <h3 className={`text-[13px] sm:text-[14px] font-semibold line-clamp-2 leading-snug transition-colors ${isError ? 'text-rose-600' : 'text-slate-800 group-hover:text-[#1b88ee]'}`}>
          {book.title}
        </h3>
        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 whitespace-nowrap overflow-hidden">
          {isImporting ? (
            <span className="text-[#1b88ee] font-medium truncate">{book.import_step || `导入中 ${importPct}%`}</span>
          ) : isError ? (
            <span className="text-rose-600 font-semibold truncate">导入失败</span>
          ) : (
            <>
              <span className="shrink-0">{book.status === 'finished' ? '已读完' : pct > 0 ? `已读 ${pct}%` : '未读'}</span>
              <span className="truncate max-w-[70px] sm:max-w-[80px] shrink-0 text-slate-400/80">{book.category || '未分类'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const BookCardOverlays: React.FC<{
  book: BookSummary
  isImporting: boolean
  isError: boolean
  importPct: number
  onOpenOrganize: (e: React.MouseEvent, book: BookSummary) => void
  onDeleteBook: (e: React.MouseEvent, bookId: string, title: string, skipConfirm?: boolean) => void
}> = ({ book, isImporting, isError, importPct, onOpenOrganize, onDeleteBook }) => {
  if (isImporting) {
    return (
      <div className="absolute inset-0 z-30 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/20 flex flex-col justify-between p-2.5">
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-[#1b88ee] text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /><span>导入中</span>
          </span>
          <button
            type="button" onClick={(e) => { e.stopPropagation(); onDeleteBook(e, book.id, book.title, true) }} title="取消并移除"
            className="w-6 h-6 rounded-full bg-black/50 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1 bg-black/55 backdrop-blur-xs rounded-lg p-2 border border-white/15">
          <div className="flex items-center justify-between text-[11px] font-bold text-white">
            <span className="truncate pr-1">{book.cover_url ? '封面已就绪' : '正在提取'}</span>
            <span className="font-mono text-[#60a5fa]">{importPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-[#1b88ee] rounded-full transition-all duration-300" style={{ width: `${importPct}%` }} />
          </div>
          <p className="text-[10px] text-white/85 leading-tight line-clamp-1">{book.import_step || '正在解析...'}</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="absolute inset-0 z-30 bg-rose-950/88 backdrop-blur-[2px] flex flex-col justify-between p-3 text-white">
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /><span>导入失败</span>
          </span>
          <button
            type="button" onClick={(e) => { e.stopPropagation(); onDeleteBook(e, book.id, book.title, true) }} title="删除失败书籍"
            className="w-6 h-6 rounded-full bg-white/15 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="my-auto space-y-1 text-center px-1">
          <p className="text-xs font-bold line-clamp-2">{book.title}</p>
          <p className="text-[10px] text-rose-200 leading-snug line-clamp-3">{book.import_error || '文件损坏或体积超出限制'}</p>
        </div>
        <button
          type="button" onClick={(e) => { e.stopPropagation(); onDeleteBook(e, book.id, book.title, true) }}
          className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /><span>删除此书</span>
        </button>
      </div>
    )
  }

  return (
    <button
      type="button" onClick={(e) => { e.stopPropagation(); onOpenOrganize(e, book) }} title="分组与图书管理"
      className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-xs text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
    >
      <MoreHorizontal className="w-4 h-4" />
    </button>
  )
}
