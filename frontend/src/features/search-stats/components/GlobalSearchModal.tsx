import React from 'react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import { useGlobalSearch } from '../hooks'
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

  if (!isOpen && !asPage) return null

  const isNoResults =
    result && result.chapter_hits.length === 0 && result.highlight_hits.length === 0

  const innerContent = (
    <div
      className={
        asPage
          ? 'max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 space-y-5'
          : 'w-full flex-1 min-h-0 flex flex-col overflow-hidden'
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

      <div
        className={
          asPage
            ? 'space-y-4'
            : 'flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/60'
        }
      >
        {loading && !result && (
          <div className="py-12 text-center text-sm text-slate-500">正在检索索引...</div>
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

  if (asPage) return innerContent

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxWidthClass="md:max-w-3xl">
      {innerContent}
    </BottomSheet>
  )
}
