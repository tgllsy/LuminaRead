import React from 'react'
import { ZoomIn } from 'lucide-react'
import type { BookSummary, ReaderTypography, HighlightItem, PdfSpreadMode } from '../types'

export interface PdfPageCardProps {
  pNum: number
  book: BookSummary
  effectiveTotalPages: number
  pageParas: { pIdx: number; text: string }[]
  highPerformanceMode: boolean
  fitMode: 'page' | 'width'
  pdfCanvasPage: number
  pdfSpreadMode: PdfSpreadMode
  pdfZoom: number
  pdfFilterStyle: React.CSSProperties
  chapterHighlights: HighlightItem[]
  typography?: ReaderTypography
  fontClass?: string
  onJumpToPdfPage: (page: number) => void
  onOpenLightbox: (url: string, title: string, pageNum: number) => void
  onTextMouseUp: (pIdx: number) => void
}

export const PdfPageCard: React.FC<PdfPageCardProps> = ({
  pNum,
  book,
  effectiveTotalPages,
  pageParas,
  highPerformanceMode,
  fitMode,
  pdfCanvasPage,
  pdfSpreadMode,
  pdfZoom,
  pdfFilterStyle,
  chapterHighlights,
  typography,
  fontClass,
  onJumpToPdfPage,
  onOpenLightbox,
  onTextMouseUp,
}) => {
  const imgUrl = `/api/books/${encodeURIComponent(book.id)}/pdf-page/${pNum}`

  return (
    <div
      className={`group rounded-2xl border border-current/15 bg-current/[0.025] shadow-lg overflow-hidden relative transition-all ${
        fitMode === 'page' ? 'w-fit max-w-full mx-auto' : 'w-full'
      }`}
    >
      <div className="px-3.5 py-2 border-b border-current/10 flex items-center justify-between text-xs bg-current/[0.04] gap-2">
        <span className="font-mono font-semibold shrink-0">
          📄 第 {pNum} / {effectiveTotalPages} 页
        </span>
        <div className="flex items-center gap-2">
          {!highPerformanceMode && pageParas.length > 0 && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">
              ✨ 下方文本层支持划词高亮/批注
            </span>
          )}
          <button
            type="button"
            onClick={() => onOpenLightbox(imgUrl, `《${book.title}》 · 第 ${pNum} 页`, pNum)}
            className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white font-semibold transition-colors flex items-center gap-1 shrink-0"
          >
            <ZoomIn className="w-3 h-3" />
            <span>全屏高清细看</span>
          </button>
        </div>
      </div>

      <div className="relative bg-current/[0.02] flex items-center justify-center min-h-[180px]">
        <img
          src={imgUrl}
          alt={`《${book.title}》第 ${pNum} 页`}
          loading="eager"
          decoding="async"
          style={{
            ...pdfFilterStyle,
            transform: 'translateZ(0)',
            ...(fitMode === 'page'
              ? {
                  maxHeight: `calc((100vh - 14rem) * ${Math.max(0.5, pdfZoom / 100)})`,
                }
              : {}),
          }}
          className={`${
            fitMode === 'page'
              ? 'max-w-full w-auto h-auto object-contain select-none transition-all mx-auto'
              : 'w-full h-auto object-contain select-none transition-all'
          }`}
        />
        <div
          onClick={() => onJumpToPdfPage(pdfCanvasPage - (pdfSpreadMode === 'double' ? 2 : 1))}
          title="点击左侧翻上一页"
          className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize"
        />
        <div
          onClick={() => onJumpToPdfPage(pdfCanvasPage + (pdfSpreadMode === 'double' ? 2 : 1))}
          title="点击右侧翻下一页"
          className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize"
        />
      </div>

      {!highPerformanceMode && pageParas.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-current/10 bg-current/[0.02] space-y-2.5">
          <div className="flex items-center justify-between text-[11px] opacity-70 font-medium">
            <span>📝 第 {pNum} 页同步可划词文本层</span>
            <span className="font-mono">{pageParas.length} 段</span>
          </div>
          <div
            style={{
              fontSize: typography ? `${Math.max(13, typography.fontSize - 2)}px` : undefined,
              lineHeight: typography?.lineHeight || 1.7,
            }}
            className={`space-y-2 text-current leading-relaxed select-text ${fontClass || ''}`}
          >
            {pageParas.map(({ pIdx, text }) => {
              const paraHighlights = chapterHighlights.filter((h) => h.paragraph_index === pIdx)
              return (
                <p
                  key={pIdx}
                  data-para-index={pIdx}
                  onMouseUp={() => onTextMouseUp(pIdx)}
                  className={`rounded-lg px-2 py-1 transition-colors ${
                    paraHighlights.length > 0
                      ? 'bg-amber-500/20 border-l-2 border-amber-500 pl-2'
                      : 'hover:bg-current/[0.06]'
                  }`}
                >
                  {text}
                </p>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
