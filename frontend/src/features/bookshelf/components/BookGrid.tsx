import React from 'react'
import { AlertTriangle, Trash2, X, UploadCloud } from 'lucide-react'
import type { BookSummary, JumpTarget, BookshelfViewMode, UploadAlertItem } from '../types'
import { BookCard } from './BookCard'
import { BookListItem } from './BookListItem'
import { BookshelfEmpty } from './BookshelfEmpty'

interface BookGridProps {
  books: BookSummary[]
  viewMode: BookshelfViewMode
  openTabBookIds: string[]
  uploadAlerts: UploadAlertItem[]
  onOpenBook: (target: JumpTarget) => void
  onOpenOrganize: (e: React.MouseEvent, book: BookSummary) => void
  onDeleteBook: (e: React.MouseEvent, bookId: string, title: string, skipConfirm?: boolean) => void
  onDismissAlert: (id: string) => void
  onClearAllFailed: () => void
  onTriggerUpload: () => void
  onOpenDiscovery: () => void
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  viewMode,
  openTabBookIds,
  uploadAlerts,
  onOpenBook,
  onOpenOrganize,
  onDeleteBook,
  onDismissAlert,
  onClearAllFailed,
  onTriggerUpload,
  onOpenDiscovery,
}) => {
  if (books.length === 0 && uploadAlerts.length === 0) {
    return <BookshelfEmpty onTriggerUpload={onTriggerUpload} onOpenDiscovery={onOpenDiscovery} />
  }

  const hasFailedBooks = books.some((b) => b.status === 'error' || (b.status as string) === 'failed')

  return (
    <div className="space-y-4">
      <UploadAlertsBanner
        uploadAlerts={uploadAlerts}
        hasFailedBooks={hasFailedBooks}
        onDismissAlert={onDismissAlert}
        onClearAllFailed={onClearAllFailed}
      />

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-5 sm:gap-x-7 gap-y-8 pt-2">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              isOpenTab={openTabBookIds.includes(book.id)}
              onOpenBook={onOpenBook}
              onOpenOrganize={onOpenOrganize}
              onDeleteBook={onDeleteBook}
            />
          ))}

          {/* Upload Placeholder Tile */}
          <div
            onClick={onTriggerUpload}
            className="aspect-[3/4.2] w-full border-2 border-dashed border-slate-300 hover:border-[#1b88ee] rounded-2xl flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all hover:bg-blue-50/30 group select-none"
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-[#1b88ee] flex items-center justify-center mb-1.5 transition-colors">
              <UploadCloud className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-[#1b88ee]">导入电子书</span>
            <span className="text-[10px] text-slate-400 mt-0.5">EPUB / PDF / TXT</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 pt-2">
          {books.map((book) => (
            <BookListItem
              key={book.id}
              book={book}
              isOpenTab={openTabBookIds.includes(book.id)}
              onOpenBook={onOpenBook}
              onOpenOrganize={onOpenOrganize}
              onDeleteBook={onDeleteBook}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const UploadAlertsBanner: React.FC<{
  uploadAlerts: UploadAlertItem[]
  hasFailedBooks: boolean
  onDismissAlert: (id: string) => void
  onClearAllFailed: () => void
}> = ({ uploadAlerts, hasFailedBooks, onDismissAlert, onClearAllFailed }) => (
  <>
    {uploadAlerts.length > 0 && (
      <div className="space-y-2">
        {uploadAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                《{alert.filename}》: {alert.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDismissAlert(alert.id)}
              className="p-1 hover:bg-rose-100 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    )}

    {hasFailedBooks && (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs">
        <span>书架存在导入失败书籍，可一键清理</span>
        <button
          type="button"
          onClick={onClearAllFailed}
          className="flex items-center gap-1 font-semibold text-amber-900 hover:underline cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>一键清理失败项</span>
        </button>
      </div>
    )}
  </>
)
