import React, { useCallback } from 'react'
import { Sparkles, Server } from 'lucide-react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import { useBookSearch } from '../hooks/useBookSearch'
import { useBookDownload } from '../hooks/useBookDownload'
import { BookSearchHeader } from './BookSearchHeader'
import { BookSearchResults } from './BookSearchResults'
import type { BookDiscoveryModalProps } from '../types'

const BookDiscoveryFooter: React.FC<{
  asPage: boolean
  onOpenSourceSettings: () => void
}> = ({ asPage, onOpenSourceSettings }) => (
  <div
    className={
      asPage
        ? 'bg-white/90 backdrop-blur-xl rounded-2xl border-[0.5px] border-slate-200/70 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-500 min-w-0'
        : 'px-4 py-2.5 sm:px-6 sm:py-3 bg-white/90 border-t-[0.5px] border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 min-w-0 shrink-0'
    }
  >
    <span className="flex items-center gap-1.5 min-w-0 flex-1">
      <Sparkles className="w-3.5 h-3.5 text-[#1b88ee] shrink-0" />
      <span className="line-clamp-1 sm:line-clamp-none">
        下载后自动解析入库并建立索引，支持离线阅读与听书
      </span>
    </span>
    <button
      type="button"
      onClick={onOpenSourceSettings}
      className="flex items-center gap-1 text-[#1b88ee] hover:underline font-medium active:scale-[0.97] transition-transform cursor-pointer shrink-0 ml-auto"
    >
      <Server className="w-3.5 h-3.5" />
      <span>配置镜像与代理 ›</span>
    </button>
  </div>
)

export const BookDiscoveryModal: React.FC<BookDiscoveryModalProps> = ({
  isOpen,
  onClose,
  onBookDownloaded,
  onOpenSourceSettings,
  asPage = false,
}) => {
  const isEnabled = isOpen || asPage
  const search = useBookSearch(isEnabled)

  const handleMarkInShelf = useCallback(
    (remoteId: string, localBookId: string) => {
      search.setResults((prev) =>
        prev.map((r) =>
          r.remote_id === remoteId ? { ...r, already_in_shelf: true, local_book_id: localBookId } : r
        )
      )
    },
    [search.setResults]
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

  if (!isEnabled) return null

  const innerContent = (
    <div
      className={
        asPage
          ? 'max-w-6xl mx-auto px-3.5 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 min-w-0 max-w-full overflow-x-hidden'
          : 'w-full flex-1 min-h-0 flex flex-col overflow-hidden min-w-0'
      }
    >
      <BookSearchHeader
        asPage={asPage}
        query={search.query}
        sourceFilter={search.sourceFilter}
        formatFilter={search.formatFilter}
        langFilter={search.langFilter}
        searching={search.searching}
        resultsCount={search.results.length}
        onQueryChange={search.setQuery}
        onSourceChange={search.setSourceFilter}
        onFormatChange={search.setFormatFilter}
        onLangChange={search.setLangFilter}
        onSubmitSearch={() =>
          search.handleSearch(search.query, search.sourceFilter, search.formatFilter, search.langFilter)
        }
        onOpenSourceSettings={onOpenSourceSettings}
        onClose={onClose}
      />

      <BookSearchResults
        asPage={asPage}
        searching={search.searching}
        results={search.results}
        downloadingMap={downloadingMap}
        onDownload={handleOneClickDownload}
        onReadNow={handleReadNow}
      />

      <BookDiscoveryFooter asPage={asPage} onOpenSourceSettings={onOpenSourceSettings} />
    </div>
  )

  if (asPage) return innerContent

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxWidthClass="md:max-w-5xl">
      {innerContent}
    </BottomSheet>
  )
}
