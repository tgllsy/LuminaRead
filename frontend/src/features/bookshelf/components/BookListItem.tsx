import React from 'react'
import { MoreHorizontal, Trash2, Clock, Loader2, AlertTriangle } from 'lucide-react'
import type { BookSummary, JumpTarget } from '../types'
import { formatReadingTime } from '../helpers'
import { prefetchBook } from '../../../utils/bookCache'

interface BookListItemProps {
  book: BookSummary
  isOpenTab?: boolean
  onOpenBook: (target: JumpTarget) => void
  onOpenOrganize: (e: React.MouseEvent, book: BookSummary) => void
  onDeleteBook: (e: React.MouseEvent, bookId: string, title: string, skipConfirm?: boolean) => void
}

export const BookListItem: React.FC<BookListItemProps> = ({
  book,
  isOpenTab,
  onOpenBook,
  onOpenOrganize,
  onDeleteBook,
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
      className={`group flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl bg-white border transition-all active:scale-[0.99] ${
        isError
          ? 'border-rose-300 bg-rose-50/30 cursor-default'
          : isImporting
          ? 'border-blue-300 bg-blue-50/20 cursor-wait'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs cursor-pointer'
      }`}
    >
      <BookListLeftInfo
        book={book}
        isOpenTab={isOpenTab}
        isImporting={isImporting}
        isError={isError}
        importPct={importPct}
      />

      <BookListRightActions
        book={book}
        pct={pct}
        importPct={importPct}
        isImporting={isImporting}
        isError={isError}
        onOpenOrganize={onOpenOrganize}
        onDeleteBook={onDeleteBook}
      />
    </div>
  )
}

const BookListLeftInfo: React.FC<{
  book: BookSummary
  isOpenTab?: boolean
  isImporting: boolean
  isError: boolean
  importPct: number
}> = ({ book, isOpenTab, isImporting, isError, importPct }) => (
  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
    <div
      className="w-10 h-13.5 sm:w-11 sm:h-14 rounded-md shrink-0 relative overflow-hidden flex items-center justify-center text-white text-[10px] font-bold shadow-2xs"
      style={{ backgroundColor: book.cover_color || '#1e3a8a' }}
    >
      {book.cover_url ? (
        <img src={book.cover_url} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span>{book.format.toUpperCase()}</span>
      )}
    </div>

    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <h4
          className={`text-[13px] sm:text-sm font-semibold truncate flex-1 min-w-0 transition-colors ${
            isError ? 'text-rose-600' : 'text-slate-800 group-hover:text-[#1b88ee]'
          }`}
          title={book.title}
        >
          {book.title}
        </h4>
        {isOpenTab && (
          <span className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-[#1b88ee]/10 text-[#1b88ee]">
            当前标签
          </span>
        )}
      </div>
      {isImporting ? (
        <div className="flex items-center gap-1.5 text-xs text-[#1b88ee] whitespace-nowrap overflow-hidden">
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span className="truncate">{book.import_step || `正在导入 (${importPct}%)...`}</span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 whitespace-nowrap overflow-hidden">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{book.import_error || '导入失败，文件损坏或解析异常'}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs text-slate-400 whitespace-nowrap overflow-hidden">
          <span className="truncate max-w-[68px] sm:max-w-[120px]">{book.author || '未知作者'}</span>
          <span className="shrink-0 text-slate-300">•</span>
          <span className="truncate max-w-[68px] sm:max-w-[100px] shrink-0 text-slate-500 font-medium">{book.category || '未分类'}</span>
          <span className="shrink-0 text-slate-300">•</span>
          <span className="shrink-0 flex items-center gap-0.5 text-slate-400">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{formatReadingTime(book.total_reading_seconds)}</span>
          </span>
        </div>
      )}
    </div>
  </div>
)

const BookListRightActions: React.FC<{
  book: BookSummary
  pct: number
  importPct: number
  isImporting: boolean
  isError: boolean
  onOpenOrganize: (e: React.MouseEvent, book: BookSummary) => void
  onDeleteBook: (e: React.MouseEvent, bookId: string, title: string, skipConfirm?: boolean) => void
}> = ({ book, pct, importPct, isImporting, isError, onOpenOrganize, onDeleteBook }) => (
  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 pl-2 sm:pl-4">
    {isImporting ? (
      <div className="text-right shrink-0">
        <div className="text-[11px] sm:text-xs font-mono font-semibold text-[#1b88ee]">{importPct}%</div>
        <div className="w-10 sm:w-16 h-1 rounded-full bg-slate-100 overflow-hidden mt-0.5 sm:mt-1">
          <div className="h-full bg-[#1b88ee] rounded-full transition-all" style={{ width: `${importPct}%` }} />
        </div>
      </div>
    ) : isError ? (
      <span className="text-[11px] sm:text-xs font-semibold text-rose-600 shrink-0 whitespace-nowrap">失败</span>
    ) : (
      <div className="text-right shrink-0">
        <div className="text-[11px] sm:text-xs font-semibold text-slate-700 whitespace-nowrap">
          {book.status === 'finished' ? '已读完' : pct > 0 ? `${pct}%` : '未读'}
        </div>
        <div className="w-10 sm:w-16 h-1 rounded-full bg-slate-100 overflow-hidden mt-0.5 sm:mt-1">
          <div className="h-full bg-[#1b88ee] rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )}

    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
      {!isImporting && !isError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenOrganize(e, book)
          }}
          title="分类与管理"
          className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDeleteBook(e, book.id, book.title, isImporting || isError)
        }}
        title="删除此书"
        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
)
