import React from 'react'
import { useGlobalSearch, useEscapeKey } from '../hooks'
import { SearchHeader } from './SearchHeader'
import { HighlightHitsList } from './HighlightHitsList'
import { ChapterHitsList } from './ChapterHitsList'
import type { GlobalSearchModalProps } from '../types'

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onJumpToResult,
  asPage = false,
}) => {
  const { query, setQuery, result, loading, inputRef, executeSearch } = useGlobalSearch({
    isOpen,
    asPage,
    initialQuery,
  })

  useEscapeKey(isOpen && !asPage, onClose)

  if (!isOpen && !asPage) return null

  const isNoResults =
    result &&
    result.chapter_hits.length === 0 &&
    result.highlight_hits.length === 0

  const innerContent = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        asPage
          ? 'max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-24 sm:pb-12 space-y-5'
          : 'bg-white sm:rounded-3xl sm:shadow-2xl sm:border border-slate-200/80 w-full max-w-3xl h-dvh sm:h-auto sm:max-h-[86dvh] flex flex-col overflow-hidden'
      }
    >
      <SearchHeader
        asPage={asPage}
        query={query}
        onQueryChange={setQuery}
        onExecuteSearch={executeSearch}
        onClose={onClose}
        inputRef={inputRef}
        result={result}
      />

      {/* Search Results Body */}
      <div
        className={
          asPage
            ? 'space-y-4'
            : 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/60'
        }
      >
        {loading && !result && (
          <div className="py-12 text-center text-sm text-slate-500">
            正在检索索引...
          </div>
        )}

        {isNoResults && (
          <div className="py-12 text-center text-sm text-slate-500">
            未在全库正文或笔记中找到「{result.query}」
          </div>
        )}

        {result && (
          <>
            <HighlightHitsList
              hits={result.highlight_hits}
              query={query}
              asPage={asPage}
              onClose={onClose}
              onJumpToResult={onJumpToResult}
            />
            <ChapterHitsList
              hits={result.chapter_hits}
              query={query}
              asPage={asPage}
              onClose={onClose}
              onJumpToResult={onJumpToResult}
            />
          </>
        )}
      </div>
    </div>
  )

  if (asPage) {
    return innerContent
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-white sm:bg-slate-950/65 sm:backdrop-blur-sm p-0 sm:pt-12 sm:p-4"
    >
      {innerContent}
    </div>
  )
}
