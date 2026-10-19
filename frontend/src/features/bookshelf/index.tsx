import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { BookshelfViewProps, BookSummary, ReadingLibrary, UploadAlertItem } from './types'
import { filterAndSearchBooks, extractUniqueCategories } from './helpers'
import { useBookshelfFilter, useLibraries, useBookOperations } from './hooks'
import {
  BookshelfHeader,
  BookshelfHeroCard,
  BookGrid,
  OrganizeBookModal,
  CreateLibraryModal,
} from './components'
import { DailyReviewCard } from './components/DailyReviewCard'
import { prewarmBooks } from '../../utils/bookCache'
import { useTypographyStore } from '../../stores/typographyStore'
import { convertBooksList } from '../../utils/chineseConversion'

const SUPPORTED_BOOK_EXTS = ['.epub', '.pdf', '.txt', '.md', '.markdown', '.mobi', '.azw', '.azw3', '.prc']

function useMergedBooksAndPolling(
  books: BookSummary[],
  optimisticBooksMap: Record<string, BookSummary>,
  setOptimisticBooksMap: React.Dispatch<React.SetStateAction<Record<string, BookSummary>>>,
  onBooksChanged: () => void
) {
  useEffect(() => {
    setOptimisticBooksMap((prev) => {
      let changed = false
      const next = { ...prev }
      for (const b of books) {
        if (next[b.id] && b.status !== 'importing') {
          delete next[b.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [books, setOptimisticBooksMap])

  const mergedBooks = useMemo(() => {
    const serverIds = new Set(books.map((b) => b.id))
    const pendingOnly = Object.values(optimisticBooksMap).filter((ob) => !serverIds.has(ob.id))
    const updatedServer = books.map((b) => {
      const opt = optimisticBooksMap[b.id]
      if (!opt) return b
      if (b.status !== 'importing' && opt.status === 'importing') return b
      return {
        ...b,
        ...opt,
        import_progress: Math.max(b.import_progress ?? 0, opt.import_progress ?? 0),
        cover_url: b.cover_url || opt.cover_url,
      }
    })
    return [...pendingOnly, ...updatedServer]
  }, [books, optimisticBooksMap])

  const hasImporting = useMemo(() => mergedBooks.some((b) => b.status === 'importing'), [mergedBooks])
  useEffect(() => {
    if (!hasImporting) return
    const timer = window.setInterval(() => onBooksChanged(), 2500)
    return () => window.clearInterval(timer)
  }, [hasImporting, onBooksChanged])

  useEffect(() => {
    if (!mergedBooks || mergedBooks.length === 0) return
    const timer = setTimeout(() => prewarmBooks(mergedBooks), 200)
    return () => clearTimeout(timer)
  }, [mergedBooks])

  return mergedBooks
}

function dispatchValidatedUpload(
  files: File[],
  categoryFilter: string,
  libraryFilter: string,
  uploadFiles: (files: File[], category: string, libraryId: string) => void,
  setUploadAlerts: React.Dispatch<React.SetStateAction<UploadAlertItem[]>>
) {
  const validFiles: File[] = []
  const invalidFiles: string[] = []
  for (const file of files) {
    const lower = file.name.toLowerCase()
    if (SUPPORTED_BOOK_EXTS.some((ext) => lower.endsWith(ext))) {
      validFiles.push(file)
    } else {
      invalidFiles.push(file.name)
    }
  }
  if (invalidFiles.length > 0) {
    setUploadAlerts((prev) => [
      ...prev,
      {
        id: `unsupported-${Date.now()}`,
        filename: invalidFiles.join(', '),
        message: '不支持的文件格式，仅支持 epub、pdf、txt、mobi、azw3、md 等',
      },
    ])
  }
  if (validFiles.length > 0) {
    const defaultCategory = categoryFilter !== 'all' ? categoryFilter : '本地导入'
    const defaultLib = libraryFilter !== 'all' ? libraryFilter : 'lib-default'
    uploadFiles(validFiles, defaultCategory, defaultLib)
  }
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  books, openTabBookIds, onOpenBook, onOpenDiscovery,
  onOpenGlobalSearch, onOpenNotesHub, onBooksChanged, onCloseBookTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const dragCounterRef = useRef(0)
  const [organizingBook, setOrganizingBook] = useState<BookSummary | null>(null)
  const [libraryModalState, setLibraryModalState] = useState<{ isOpen: boolean; targetLib: ReadingLibrary | null }>({ isOpen: false, targetLib: null })

  const filter = useBookshelfFilter()
  const { libraries, fetchLibraries, saveLibrary, removeLibrary } = useLibraries(books.length, onBooksChanged)
  const ops = useBookOperations(onBooksChanged, fetchLibraries, onCloseBookTab)
  const rawMergedBooks = useMergedBooksAndPolling(books, ops.optimisticBooksMap, ops.setOptimisticBooksMap, onBooksChanged)
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant ?? 'original')
  const mergedBooks = useMemo(() => convertBooksList(rawMergedBooks, chineseVariant), [rawMergedBooks, chineseVariant])
  const filteredBooks = useMemo(() => filterAndSearchBooks(mergedBooks, filter.filterState), [mergedBooks, filter.filterState])
  const categories = useMemo(() => {
    const scope = filter.libraryFilter === 'all' ? mergedBooks : mergedBooks.filter((b) => (b.library_id || 'lib-default') === filter.libraryFilter)
    return extractUniqueCategories(scope)
  }, [mergedBooks, filter.libraryFilter])

  useEffect(() => {
    if (filter.categoryFilter !== 'all' && !categories.includes(filter.categoryFilter)) filter.setCategoryFilter('all')
  }, [categories, filter.categoryFilter, filter.setCategoryFilter])

  const triggerUploadWithFiles = (files: File[]) =>
    dispatchValidatedUpload(files, filter.categoryFilter, filter.libraryFilter, ops.uploadFiles, ops.setUploadAlerts)

  const handleDeleteLibrary = async (lib: ReadingLibrary) => {
    await removeLibrary(lib)
    if (filter.libraryFilter === lib.id) filter.setLibraryFilter('all')
    setLibraryModalState({ isOpen: false, targetLib: null })
  }

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); dragCounterRef.current += 1; if (dragCounterRef.current === 1) setDragOver(true) }}
      onDragOver={(e) => { e.preventDefault() }}
      onDragLeave={(e) => { e.preventDefault(); dragCounterRef.current -= 1; if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setDragOver(false) } }}
      onDrop={(e) => { e.preventDefault(); dragCounterRef.current = 0; setDragOver(false); if (e.dataTransfer.files?.length) triggerUploadWithFiles(Array.from(e.dataTransfer.files)) }}
      className={`flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:pb-8 select-none transition-colors ${dragOver ? 'bg-blue-50/40 ring-2 ring-dashed ring-[#1b88ee] rounded-2xl' : ''}`}
    >
      <input
        ref={fileInputRef} type="file" multiple data-lumina-book-upload="true" accept=".epub,.pdf,.txt,.md,.markdown,.mobi,.azw,.azw3,.prc"
        onChange={(e) => { if (e.target.files?.length) { const files = Array.from(e.target.files); e.target.value = ''; triggerUploadWithFiles(files) } }}
        className="hidden"
      />
      <BookshelfHeroCard books={mergedBooks} onOpenBook={onOpenBook} onOpenNotesHub={onOpenNotesHub} />
      <div className="mb-3 sm:mb-4"><DailyReviewCard onJumpToHighlight={onOpenBook} onOpenNotesHub={onOpenNotesHub} /></div>
      <div className="sticky top-[calc(3rem+env(safe-area-inset-top,0px))] md:top-16 z-20 liquid-glass pt-1.5 sm:pt-2 pb-2 sm:pb-2.5 mb-3.5 sm:mb-5 border-b border-slate-200/60 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 transition-all">
        <BookshelfHeader
          libraries={libraries} activeLibraryId={filter.libraryFilter} totalBooksCount={mergedBooks.length}
          filteredCount={filteredBooks.length}
          onSelectLibrary={filter.setLibraryFilter} onOpenCreateModal={() => setLibraryModalState({ isOpen: true, targetLib: null })}
          onOpenEditModal={(_e, lib) => setLibraryModalState({ isOpen: true, targetLib: lib })} onDeleteLibrary={(_e, lib) => handleDeleteLibrary(lib)}
          statusFilter={filter.statusFilter} onStatusFilterChange={filter.setStatusFilter}
          categories={categories} activeCategory={filter.categoryFilter} onSelectCategory={filter.setCategoryFilter}
          viewMode={filter.viewMode} localFilterText={filter.localFilterText} onViewModeChange={filter.setViewMode}
          onFilterTextChange={filter.setLocalFilterText} onOpenGlobalSearch={onOpenGlobalSearch}
          onTriggerUpload={() => fileInputRef.current?.click()} onOpenDiscovery={onOpenDiscovery}
        />
      </div>
      <BookGrid
        books={filteredBooks} viewMode={filter.viewMode} openTabBookIds={openTabBookIds} uploadAlerts={ops.uploadAlerts}
        onOpenBook={onOpenBook} onOpenOrganize={(_e, book) => setOrganizingBook(book)} onDeleteBook={(_e, id, title, skip) => ops.deleteBook(id, title, skip)}
        onDismissAlert={(id) => ops.setUploadAlerts((prev) => prev.filter((a) => a.id !== id))}
        onClearAllFailed={() => ops.clearFailedBooks(mergedBooks.filter((b) => b.status === 'error' || (b.status as string) === 'failed'))}
        onTriggerUpload={() => fileInputRef.current?.click()} onOpenDiscovery={onOpenDiscovery}
      />
      {organizingBook && <OrganizeBookModal book={organizingBook} libraries={libraries} onClose={() => setOrganizingBook(null)} onSave={ops.saveBookOrganization} onDelete={(_e, id, title) => ops.deleteBook(id, title)} />}
      {libraryModalState.isOpen && (
        <CreateLibraryModal
          library={libraryModalState.targetLib} onClose={() => setLibraryModalState({ isOpen: false, targetLib: null })}
          onSave={async (data) => { const saved = await saveLibrary(data); if (saved?.id) filter.setLibraryFilter(saved.id) }}
          onDelete={(_e, lib) => handleDeleteLibrary(lib)}
        />
      )}
    </div>
  )
}
