import React from 'react'
import { BookOpen, Download, Globe, Loader2 } from 'lucide-react'
import { getSourceBadge, isBookDownloaded } from '../helpers'
import type { ExternalBookResult, DownloadItemState } from '../types'

interface BookSearchResultCardProps {
  item: ExternalBookResult
  dlState?: DownloadItemState
  onDownload: (item: ExternalBookResult) => void
  onReadNow: (bookId: string) => void
}

export const BookSearchResultCard: React.FC<BookSearchResultCardProps> = ({
  item,
  dlState,
  onDownload,
  onReadNow,
}) => {
  const downloaded = isBookDownloaded(item.already_in_shelf, dlState?.progress)
  const targetBookId = dlState?.localBookId || item.local_book_id

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/75 hover:border-[#1b88ee]/40 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-4 min-w-0 max-w-full">
      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        <div
          className="w-14 h-20 sm:w-18 sm:h-25 rounded-lg shrink-0 flex flex-col justify-between p-1.5 sm:p-2 text-white shadow-sm select-none relative overflow-hidden"
          style={{ backgroundColor: item.cover_color || '#1e3a8a' }}
        >
          {item.cover_url && !/^javascript:/i.test(item.cover_url.trim()) && (
            <img
              src={item.cover_url}
              alt={item.title}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className="absolute inset-0 w-full h-full object-cover z-10"
            />
          )}
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none" />
          <span className="text-[9px] font-mono uppercase opacity-75">
            {item.format}
          </span>
          <span className="text-[11px] font-bold leading-tight line-clamp-3">
            {item.title}
          </span>
          <span className="text-[8px] opacity-75 truncate">{item.author}</span>
        </div>

        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-bold text-slate-900 line-clamp-1">
              {item.title}
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-[#1b88ee] uppercase font-mono">
              {item.format} · {item.file_size}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {item.author}
            {item.publisher ? ` · ${item.publisher}` : ''}
            {item.year ? ` (${item.year})` : ''}
          </p>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-medium inline-flex items-center gap-1">
              <Globe className="w-2.5 h-2.5 text-slate-400" />
              {getSourceBadge(item.source_type)}
            </span>
            {(item.tags || []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 min-w-0">
        <span className="text-[11px] text-slate-400 font-mono truncate min-w-0 flex-1">
          {item.isbn
            ? `ISBN ${item.isbn}`
            : item.md5
            ? `MD5 ${item.md5.slice(0, 10)}`
            : '支持精排目录与全文检索'}
        </span>

        <div className="shrink-0">
          {downloaded && targetBookId ? (
            <button
              onClick={() => onReadNow(targetBookId)}
              className="px-3.5 sm:px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>立即阅读</span>
            </button>
          ) : dlState && dlState.progress > 0 && dlState.progress < 100 ? (
            <div className="px-3 sm:px-3.5 py-1.5 rounded-full bg-blue-50 text-[#1b88ee] text-xs font-medium flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {dlState.status} {dlState.progress}%
              </span>
            </div>
          ) : (
            <button
              onClick={() => onDownload(item)}
              className="px-3.5 sm:px-4 py-1.5 rounded-full bg-[#1b88ee]/10 hover:bg-[#1b88ee] active:bg-[#1677d2] text-[#1b88ee] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>加入书架</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
