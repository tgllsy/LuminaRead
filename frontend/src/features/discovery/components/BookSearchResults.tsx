import React from 'react'
import { Loader2 } from 'lucide-react'
import { BookSearchResultCard } from './BookSearchResultCard'
import type { ExternalBookResult, DownloadItemState } from '../types'

interface BookSearchResultsProps {
  asPage?: boolean
  searching: boolean
  results: ExternalBookResult[]
  downloadingMap: Record<string, DownloadItemState>
  onDownload: (item: ExternalBookResult) => void
  onReadNow: (bookId: string) => void
}

export const BookSearchResults: React.FC<BookSearchResultsProps> = ({
  asPage,
  searching,
  results,
  downloadingMap,
  onDownload,
  onReadNow,
}) => {
  return (
    <div
      className={
        asPage
          ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
          : 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#f7f8fa]'
      }
    >
      {searching ? (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-2.5 bg-white rounded-3xl border border-slate-200/60">
          <Loader2 className="w-7 h-7 animate-spin text-[#1b88ee]" />
          <span className="text-sm text-slate-500">
            正在并发检索 Z-Library、安娜档案与公版书源...
          </span>
        </div>
      ) : results.length === 0 ? (
        <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200/60">
          未找到匹配书籍，请尝试其他关键词或切换至「全网聚合」
        </div>
      ) : (
        results.map((item) => (
          <BookSearchResultCard
            key={item.remote_id}
            item={item}
            dlState={downloadingMap[item.remote_id]}
            onDownload={onDownload}
            onReadNow={onReadNow}
          />
        ))
      )}
    </div>
  )
}
