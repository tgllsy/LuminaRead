import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { BookshelfViewProps, BookSummary, ReadingLibrary } from './types'
import { filterAndSearchBooks, extractUniqueCategories } from './helpers'
import { useBookshelfFilter, useLibraries, useBookOperations } from './hooks'
import {
  BookshelfHeader,
  LibraryTabBar,
  CategoryPills,
  BookGrid,
  OrganizeBookModal,
  CreateLibraryModal,
} from './components'
import { DailyReviewCard } from './components/DailyReviewCard'
import { prewarmBooks } from '../../utils/bookCache'
import { useTypographyStore } from '../../stores/typographyStore'
import { convertBooksList } from '../../utils/chineseConversion'

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

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  books, openTabBookIds, onOpenBook, onOpenDiscovery,
  onOpenSourceSettings, onOpenStats, onOpenGlobalSearch, onOpenNotesHub, onBooksChanged, onCloseBookTab,
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
  const categories = useMemo(() => extractUniqueCategories(mergedBooks), [mergedBooks])

  const triggerUploadWithFiles = (files: File[]) => {
    const supportedExts = ['.epub', '.pdf', '.txt', '.md', '.markdown', '.mobi', '.azw', '.azw3', '.prc']
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    for (const file of files) {
      const lower = file.name.toLowerCase()
      if (supportedExts.some((ext) => lower.endsWith(ext))) {
        validFiles.push(file)
      } else {
        invalidFiles.push(file.name)
      }
    }

    if (invalidFiles.length > 0) {
      ops.setUploadAlerts((prev) => [
        ...prev,
        {
          id: `unsupported-${Date.now()}`,
          filename: invalidFiles.join(', '),
          message: '不支持的文件格式，仅支持 epub、pdf、txt、mobi、azw3、md 等',
        },
      ])
    }

    if (validFiles.length > 0) {
      const defaultCategory = filter.categoryFilter !== 'all' ? filter.categoryFilter : '本地导入'
      const defaultLib = filter.libraryFilter !== 'all' ? filter.libraryFilter : 'lib-default'
      ops.uploadFiles(validFiles, defaultCategory, defaultLib)
    }
  }

  const handleDeleteLibrary = async (lib: ReadingLibrary) => {
    await removeLibrary(lib)
    if (filter.libraryFilter === lib.id) filter.setLibraryFilter('all')
    setLibraryModalState({ isOpen: false, targetLib: null })
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        dragCounterRef.current += 1
        if (dragCounterRef.current === 1) setDragOver(true)
      }}
      onDragOver={(e) => { e.preventDefault() }}
      onDragLeave={(e) => {
        e.preventDefault()
        dragCounterRef.current -= 1
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0
          setDragOver(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragCounterRef.current = 0
        setDragOver(false)
        if (e.dataTransfer.files?.length) triggerUploadWithFiles(Array.from(e.dataTransfer.files))
      }}
      className={`flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:pb-8 select-none transition-colors ${dragOver ? 'bg-blue-50/40 ring-2 ring-dashed ring-[#1b88ee] rounded-2xl' : ''}`}
    >
      <input
        ref={fileInputRef} type="file" multiple accept=".epub,.pdf,.txt,.md,.markdown,.mobi,.azw,.azw3,.prc"
        onChange={(e) => { if (e.target.files?.length) { const files = Array.from(e.target.files); e.target.value = ''; triggerUploadWithFiles(files) } }}
        className="hidden"
      />
      <div className="mb-3.5 sm:mb-6"><DailyReviewCard onJumpToHighlight={onOpenBook} onOpenNotesHub={onOpenNotesHub} /></div>
      <BookshelfHeader
        totalBooksCount={mergedBooks.length} statusFilter={filter.statusFilter} viewMode={filter.viewMode} localFilterText={filter.localFilterText}
        onStatusFilterChange={filter.setStatusFilter} onViewModeChange={filter.setViewMode} onFilterTextChange={filter.setLocalFilterText}
        onTriggerUpload={() => fileInputRef.current?.click()} onOpenDiscovery={onOpenDiscovery} onOpenSourceSettings={onOpenSourceSettings} onOpenStats={onOpenStats}
        onOpenGlobalSearch={onOpenGlobalSearch}
      />
      <LibraryTabBar
        libraries={libraries} activeLibraryId={filter.libraryFilter} totalBooksCount={mergedBooks.length} onSelectLibrary={filter.setLibraryFilter}
        onOpenCreateModal={() => setLibraryModalState({ isOpen: true, targetLib: null })} onOpenEditModal={(_e, lib) => setLibraryModalState({ isOpen: true, targetLib: lib })}
        onDeleteLibrary={(_e, lib) => handleDeleteLibrary(lib)}
      />
      <CategoryPills categories={categories} activeCategory={filter.categoryFilter} onSelectCategory={filter.setCategoryFilter} />
      <BookGrid
        books={filteredBooks} viewMode={filter.viewMode} openTabBookIds={openTabBookIds} uploadAlerts={ops.uploadAlerts}
        onOpenBook={onOpenBook} onOpenOrganize={(_e, book) => setOrganizingBook(book)} onDeleteBook={(_e, id, title, skip) => ops.deleteBook(id, title, skip)}
        onDismissAlert={(id) => ops.setUploadAlerts((prev) => prev.filter((a) => a.id !== id))}
        onClearAllFailed={() => ops.clearFailedBooks(mergedBooks.filter((b) => b.status === 'error' || (b.status as string) === 'failed'))}
        onTriggerUpload={() => fileInputRef.current?.click()} onOpenDiscovery={onOpenDiscovery}
      />
      {organizingBook && (
        <OrganizeBookModal book={organizingBook} libraries={libraries} onClose={() => setOrganizingBook(null)} onSave={ops.saveBookOrganization} onDelete={(_e, id, title) => ops.deleteBook(id, title)} />
      )}
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
