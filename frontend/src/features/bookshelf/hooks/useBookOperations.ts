import { useState, useCallback } from 'react'
import type { BookSummary, UploadAlertItem } from '../types'
import { bookshelfApi } from '../api'
import { uploadFilesWithWorkers } from '../helpers/bookUploadPipeline'
import { invalidateBookCache } from '../../../utils/bookCache'
import { clearPdfDocumentCache } from '../../reader/helpers/pdfDocumentLoader'

export function useBookOperations(
  onBooksChanged: () => void,
  refreshLibraries: () => void,
  onCloseBookTab?: (bookId: string) => void
) {
  const [optimisticBooksMap, setOptimisticBooksMap] = useState<Record<string, BookSummary>>({})
  const [uploadAlerts, setUploadAlerts] = useState<UploadAlertItem[]>([])
  const [uploading, setUploading] = useState(false)

  const deleteBook = useCallback(
    async (bookId: string, title: string, skipConfirm = false) => {
      if (!skipConfirm && !window.confirm(`确定从书架移除《${title}》吗？`)) return
      setOptimisticBooksMap((prev) => { const next = { ...prev }; delete next[bookId]; return next })
      setUploadAlerts((prev) => prev.filter((a) => a.bookId !== bookId))
      onCloseBookTab?.(bookId)
      invalidateBookCache(bookId)
      clearPdfDocumentCache(bookId)
      await bookshelfApi.deleteBook(bookId)
      await refreshLibraries(); onBooksChanged()
    },
    [onBooksChanged, refreshLibraries, onCloseBookTab]
  )

  const clearFailedBooks = useCallback(
    async (failedBooks: BookSummary[]) => {
      setUploadAlerts([])
      setOptimisticBooksMap((prev) => {
        const next = { ...prev }
        failedBooks.forEach((fb) => delete next[fb.id])
        return next
      })
      failedBooks.forEach((fb) => {
        onCloseBookTab?.(fb.id)
        invalidateBookCache(fb.id)
      })
      await Promise.all(failedBooks.map((fb) => bookshelfApi.deleteBook(fb.id)))
      await refreshLibraries(); onBooksChanged()
    },
    [onBooksChanged, refreshLibraries, onCloseBookTab]
  )

  const saveBookOrganization = useCallback(
    async (bookId: string, payload: { library_id: string; category: string; tags: string[] }) => {
      await bookshelfApi.updateBookOrganization(bookId, payload)
      await refreshLibraries(); onBooksChanged()
    },
    [onBooksChanged, refreshLibraries]
  )

  const uploadFiles = useCallback(
    async (files: File[], defaultCategory: string, defaultLibId: string) => {
      setUploading(true)
      await uploadFilesWithWorkers({
        files,
        defaultCategory,
        defaultLibId,
        onBookCreated: (book) => { setOptimisticBooksMap((p) => ({ ...p, [book.id]: book })); onBooksChanged() },
        onChunkProgress: (book) => setOptimisticBooksMap((p) => ({ ...p, [book.id]: book })),
        onError: (name, msg) => setUploadAlerts((p) => [...p, { id: `${name}-${Date.now()}`, filename: name, message: msg }]),
      })
      setUploading(false); onBooksChanged()
    },
    [onBooksChanged]
  )

  return {
    optimisticBooksMap,
    setOptimisticBooksMap,
    uploadAlerts,
    setUploadAlerts,
    uploading,
    deleteBook,
    clearFailedBooks,
    saveBookOrganization,
    uploadFiles,
  }
}
