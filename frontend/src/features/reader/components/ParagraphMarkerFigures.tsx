import React from 'react'
import { ZoomIn } from 'lucide-react'
import type { BookSummary, BookChapter } from '../types'

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
  const pageImgUrl = `/api/books/${encodeURIComponent(book.id)}/pdf-page/${pdfPageNum}`

  if (pdfMode === 'text_only') {
    return (
      <div
        key={itemKey}
        data-para-index={pIdx}
        data-no-hud-toggle="true"
        className="break-inside-avoid my-6 flex items-center justify-center gap-3 select-none text-[11px] font-mono opacity-40 hover:opacity-90 transition-opacity group"
      >
        <span className="h-px bg-current/20 flex-1 max-w-[80px]" />
        <span className="px-2.5 py-0.5 rounded-full bg-current/5 border border-current/10 flex items-center gap-1.5">
          <span>原书 P.{pdfPageNum}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectPdfCanvasPage(pdfPageNum)
              onSwitchPdfMode('page_canvas')
            }}
            className="hover:text-blue-500 underline ml-1 cursor-pointer font-sans"
            title="查看原书扫描版面"
          >
            看原版
          </button>
        </span>
        <span className="h-px bg-current/20 flex-1 max-w-[80px]" />
      </div>
    )
  }

  return (
    <figure
      key={itemKey}
      data-para-index={pIdx}
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      className="reader-block-contain break-inside-avoid my-5 rounded-2xl border border-current/15 bg-current/[0.025] shadow-md overflow-hidden"
    >
      <figcaption className="px-4 py-2.5 border-b border-current/10 flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
        <span className="px-2 py-0.5 rounded-md bg-blue-600/15 text-blue-600 dark:text-blue-400 font-mono font-bold">
          原版第 {pdfPageNum} / {totalPdfPages} 页
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onSelectPdfCanvasPage(pdfPageNum)
              onSwitchPdfMode('page_canvas')
            }}
            className="px-2.5 py-1 rounded-lg border border-current/15 hover:bg-current/10 font-semibold"
          >
            📖 画布连读
          </button>
          <button
            type="button"
            onClick={() =>
              onOpenLightbox(pageImgUrl, `《${book.title}》 · 原书第 ${pdfPageNum} 页`, pdfPageNum)
            }
            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-semibold flex items-center gap-1"
          >
            <ZoomIn className="w-3 h-3" />
            <span>放大</span>
          </button>
        </div>
      </figcaption>
      <div
        onClick={() =>
          onOpenLightbox(pageImgUrl, `《${book.title}》 · 原书第 ${pdfPageNum} 页`, pdfPageNum)
        }
        className="bg-current/[0.02] p-2 sm:p-3 flex items-center justify-center cursor-zoom-in"
      >
        <img
          src={pageImgUrl}
          alt={`《${book.title}》第 ${pdfPageNum} 页`}
          loading="lazy"
          className="w-full h-auto max-h-[1350px] object-contain rounded-lg select-none"
        />
      </div>
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
