import React, { useEffect, useCallback } from 'react'
import { Sparkles, Server } from 'lucide-react'
import { useBookSearch } from '../hooks/useBookSearch'
import { useBookDownload } from '../hooks/useBookDownload'
import { BookSearchHeader } from './BookSearchHeader'
import { BookSearchResults } from './BookSearchResults'
import type { BookDiscoveryModalProps } from '../types'

export const BookDiscoveryModal: React.FC<BookDiscoveryModalProps> = ({
  isOpen,
  onClose,
  onBookDownloaded,
  onOpenSourceSettings,
  asPage = false,
}) => {
  const isEnabled = isOpen || asPage

  const {
    query,
    setQuery,
    sourceFilter,
    setSourceFilter,
    formatFilter,
    setFormatFilter,
    langFilter,
    setLangFilter,
    results,
    setResults,
    searching,
    handleSearch,
  } = useBookSearch(isEnabled)

  const handleMarkInShelf = useCallback(
    (remoteId: string, localBookId: string) => {
      setResults((prev) =>
        prev.map((r) =>
          r.remote_id === remoteId
            ? { ...r, already_in_shelf: true, local_book_id: localBookId }
            : r
        )
      )
    },
    [setResults]
  )

  const { downloadingMap, handleOneClickDownload } = useBookDownload({
    onBookDownloaded,
    onMarkInShelf: handleMarkInShelf,
  })

  const handleReadNow = useCallback(
    (bookId: string) => {
      onBookDownloaded(bookId, true)
      if (!asPage) onClose()
    },
    [onBookDownloaded, asPage, onClose]
  )

  useEffect(() => {
    if (!isEnabled) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEnabled, onClose])

  if (!isEnabled) return null

  const innerContent = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        asPage
          ? 'max-w-6xl mx-auto px-3.5 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-24 min-w-0 max-w-full overflow-x-hidden'
          : 'bg-white sm:rounded-3xl sm:shadow-2xl sm:border border-slate-200 w-full max-w-5xl h-dvh sm:h-auto sm:max-h-[90dvh] flex flex-col overflow-hidden min-w-0'
      }
    >
      <BookSearchHeader
        asPage={asPage}
        query={query}
        sourceFilter={sourceFilter}
        formatFilter={formatFilter}
        langFilter={langFilter}
        searching={searching}
        resultsCount={results.length}
        onQueryChange={setQuery}
        onSourceChange={setSourceFilter}
        onFormatChange={setFormatFilter}
        onLangChange={setLangFilter}
        onSubmitSearch={() => handleSearch(query, sourceFilter, formatFilter, langFilter)}
        onOpenSourceSettings={onOpenSourceSettings}
        onClose={onClose}
      />

      <BookSearchResults
        asPage={asPage}
        searching={searching}
        results={results}
        downloadingMap={downloadingMap}
        onDownload={handleOneClickDownload}
        onReadNow={handleReadNow}
      />

      <div
        className={
          asPage
            ? 'bg-white rounded-2xl border border-slate-200/70 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-500 min-w-0'
            : 'px-4 py-2.5 sm:px-6 sm:py-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 min-w-0'
        }
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          <Sparkles className="w-3.5 h-3.5 text-[#1b88ee] shrink-0" />
          <span className="line-clamp-1 sm:line-clamp-none">下载后自动解析入库并建立索引，支持离线阅读与听书</span>
        </span>
        <button
          onClick={onOpenSourceSettings}
          className="flex items-center gap-1 text-[#1b88ee] hover:underline font-medium cursor-pointer shrink-0 ml-auto"
        >
          <Server className="w-3.5 h-3.5" />
          <span>配置镜像与代理 ›</span>
        </button>
      </div>
    </div>
  )

  if (asPage) return innerContent

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white sm:bg-slate-950/60 sm:backdrop-blur-xs p-0 sm:p-6"
    >
      {innerContent}
    </div>
  )
}
