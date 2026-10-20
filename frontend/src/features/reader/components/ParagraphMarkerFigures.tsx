import React from 'react'
import { ZoomIn } from 'lucide-react'
import type { BookSummary, BookChapter } from '../types'
import { PdfCanvasPage } from './PdfCanvasPage'

interface PdfPageFigureProps {
  book: BookSummary
  pdfPageNum: number
  totalPdfPages: number
  pdfMode: string
  itemKey: string
  pIdx: number
  onSwitchPdfMode: (mode: 'hybrid' | 'page_canvas' | 'text_only') => void
  onSelectPdfCanvasPage: (pageNum: number) => void
  onOpenLightbox: (url: string, title: string, pageNum?: number) => void
}

export const PdfPageFigure: React.FC<PdfPageFigureProps> = ({
  book,
  pdfPageNum,
  totalPdfPages,
  pdfMode,
  itemKey,
  pIdx,
  onSwitchPdfMode,
  onSelectPdfCanvasPage,
  onOpenLightbox,
}) => {
  const [collapsed, setCollapsed] = React.useState(false)
  const pageImgUrl = `/api/books/${encodeURIComponent(book.id)}/pdf-page/${pdfPageNum}`

  return (
    <figure
      key={itemKey}
      data-para-index={pIdx}
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      className="reader-block-contain break-inside-avoid my-4 sm:my-6 rounded-2xl border border-current/15 bg-current/[0.02] shadow-sm overflow-hidden"
    >
      <figcaption className="px-3.5 py-2 border-b border-current/10 flex flex-wrap items-center justify-between gap-2 text-xs font-sans bg-current/[0.03]">
        <span className="px-2 py-0.5 rounded-md bg-blue-600/15 text-blue-600 dark:text-blue-400 font-mono font-bold">
          原书第 {pdfPageNum} / {totalPdfPages} 页插图
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="px-2 py-1 rounded-lg border border-current/15 hover:bg-current/10 text-[11px] opacity-80 transition-colors"
          >
            {collapsed ? '展开插图' : '收起插图'}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectPdfCanvasPage(pdfPageNum)
              onSwitchPdfMode('page_canvas')
            }}
            className="px-2 py-1 rounded-lg border border-current/15 hover:bg-current/10 text-[11px] font-semibold transition-colors"
          >
            📖 原版排版
          </button>
          <button
            type="button"
            onClick={() =>
              onOpenLightbox(pageImgUrl, `《${book.title}》 · 原书第 ${pdfPageNum} 页`, pdfPageNum)
            }
            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
          >
            <ZoomIn className="w-3 h-3" />
            <span>全屏查看</span>
          </button>
        </div>
      </figcaption>

      {!collapsed && (
        <div
          onClick={() =>
            onOpenLightbox(pageImgUrl, `《${book.title}》 · 原书第 ${pdfPageNum} 页`, pdfPageNum)
          }
          className="bg-current/[0.01] p-1 sm:p-3 flex items-center justify-center cursor-zoom-in"
          title="点击放大查看原图"
        >
          <PdfCanvasPage
            bookId={book.id}
            pageNum={pdfPageNum}
            pdfZoom={100}
            fitMode="width"
            isDouble={false}
          />
        </div>
      )}
    </figure>
  )
}

interface BookImageFigureProps {
  book: BookSummary
  targetChapterObj: BookChapter
  bookImageUrl: string
  nextCap: string
  itemKey: string
  pIdx: number
  onOpenLightbox: (url: string, title: string, pageNum?: number) => void
}

export const BookImageFigure: React.FC<BookImageFigureProps> = ({
  book,
  targetChapterObj,
  bookImageUrl,
  nextCap,
  itemKey,
  pIdx,
  onOpenLightbox,
}) => {
  const hasCap = /^(?:图\s*\d+|表\s*\d+|附图|Figure\s*\d+|Fig\.)/i.test(nextCap)
  return (
    <figure
      key={itemKey}
      data-para-index={pIdx}
      data-no-hud-toggle="true"
      onClick={(e) => {
        e.stopPropagation()
        onOpenLightbox(
          bookImageUrl,
          hasCap ? nextCap : `《${book.title}》 · 书中插图 (${targetChapterObj.title})`
        )
      }}
      className="reader-block-contain break-inside-avoid my-4 p-3 sm:p-4 rounded-2xl border border-current/12 bg-current/[0.025] hover:border-blue-500/40 transition-all flex flex-col items-center gap-2 cursor-zoom-in shadow-2xs"
    >
      <img
        src={bookImageUrl}
        alt={hasCap ? nextCap : `${targetChapterObj.title} 插图`}
        loading="lazy"
        className="max-h-[340px] w-auto object-contain rounded-xl"
      />
      {hasCap && (
        <p className="text-xs opacity-75 font-serif text-center max-w-lg mt-1 italic">
          {nextCap}
        </p>
      )}
      <div className="text-[11px] font-sans opacity-60 flex items-center gap-1">
        <ZoomIn className="w-3 h-3" />
        <span>点击插图可全屏高清缩放查看</span>
      </div>
    </figure>
  )
}
